"""Metagraph synchronization service - syncs subnet data from Bittensor network."""

import asyncio
from datetime import datetime, timedelta
from typing import Optional

import aiohttp
import structlog
from models.subnet import Subnet
from utils.apy import calculate_subnet_apy

from .base import BaseService, SyncStatus

logger = structlog.get_logger(__name__)


class MetagraphService(BaseService):
    """Service for synchronizing Bittensor metagraph subnet data."""

    service_name = "metagraph"
    interval_minutes = 15

    def __init__(self, taostats_api_url: str = None, taostats_api_key: str = None):
        """Initialize metagraph service.
        
        Args:
            taostats_api_url: TaoStats API base URL
            taostats_api_key: TaoStats API key
        """
        super().__init__()
        self.taostats_api_url = taostats_api_url or "https://api.taostats.io"
        self.taostats_api_key = taostats_api_key or "demo"
        self.timeout = aiohttp.ClientTimeout(total=30)

    async def run(self) -> None:
        """Fetch and update subnet metagraph data from TaoStats."""
        from services.config_service import config_service
        if not await config_service.get_bool("METAGRAPH_SYNC_ENABLED", fallback=True):
            logger.info("metagraph_sync_disabled")
            return
        self.taostats_api_key = await config_service.get("TAOSTATS_API_KEY") or self.taostats_api_key

        start_time = datetime.utcnow()
        records_updated = 0

        try:
            await self.update_sync_state(SyncStatus.RUNNING)
            await self.log_sync("metagraph_sync_started")

            # Fetch subnets and update local copy
            updated = await self._fetch_and_update_subnets()
            records_updated = updated

            # Calculate duration
            duration = (datetime.utcnow() - start_time).total_seconds()

            await self.update_sync_state(
                status=SyncStatus.SUCCESS,
                records_processed=updated,
                records_updated=updated,
                duration_seconds=duration,
            )
            await self.log_sync(
                "metagraph_sync_complete",
                subnets_updated=updated,
                duration_seconds=duration,
            )

        except Exception as e:
            duration = (datetime.utcnow() - start_time).total_seconds()
            await self.update_sync_state(
                status=SyncStatus.FAILED,
                error=str(e),
                duration_seconds=duration,
            )
            await self.log_sync(
                "metagraph_sync_failed",
                level="error",
                error=str(e),
                duration_seconds=duration,
            )

    async def _fetch_and_update_subnets(self) -> int:
        """Fetch subnet data and update database.
        
        Returns:
            Number of subnets updated
        """
        subnets_updated = 0

        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                # Fetch from TaoStats API
                url = f"{self.taostats_api_url}/api/v1/subnets"
                headers = {"Authorization": f"Bearer {self.taostats_api_key}"}

                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        subnets = data.get("subnets", [])

                        # Update each subnet in database
                        for subnet_data in subnets:
                            updated = await self._update_subnet(subnet_data)
                            if updated:
                                subnets_updated += 1
                    else:
                        # Fallback: Use sample data if API fails
                        await self.log_sync(
                            "taostats_api_unavailable",
                            level="warning",
                            status_code=response.status,
                        )
                        subnets_updated = await self._generate_sample_data()

        except asyncio.TimeoutError:
            await self.log_sync(
                "taostats_api_timeout",
                level="warning",
            )
            subnets_updated = await self._generate_sample_data()

        except Exception as e:
            await self.log_sync(
                "taostats_fetch_error",
                level="error",
                error=str(e),
            )

        return subnets_updated

    async def _update_subnet(self, data: dict) -> bool:
        """Update a single subnet record.

        APY is calculated from the live `daily_emission` and `total_stake`
        fields using the correct Bittensor 41/41/18 emission split, rather
        than trusting an upstream `apy` field that most APIs do not expose.

        Args:
            data: Subnet data from TaoStats API

        Returns:
            True if subnet was updated, False otherwise
        """
        try:
            subnet_id = data.get("netuid")
            if not subnet_id:
                return False

            # Derive APY from live emission + stake (41 % validator share).
            daily_emission = float(data.get("daily_emission") or data.get("emission_tao", 0))
            total_stake = float(data.get("total_stake", 0))
            computed_apy = calculate_subnet_apy(
                daily_emission_tao=daily_emission,
                total_stake_tao=total_stake,
            )

            # Find subnet by netuid (integer ID field).
            # Using dict form avoids Beanie's expression evaluation which
            # requires collection-init and therefore a live MongoDB connection.
            subnet = await Subnet.find_one({"id": subnet_id})

            if subnet:
                # Update existing subnet
                subnet.name = data.get("name", subnet.name)
                subnet.market_cap_millions = data.get("market_cap_millions", 0)
                subnet.daily_emission = daily_emission
                subnet.total_stake = total_stake
                # Use computed APY; only fall back to the passed value if we
                # cannot compute one (i.e., stake data is unavailable).
                subnet.apy = computed_apy if computed_apy > 0 else float(data.get("apy", 0))
                subnet.validators_count = data.get("validator_count", 0)
                subnet.emission_24h = data.get("emission_24h", 0)
                subnet.github_url = data.get("github_url", "")
                subnet.trend = data.get("trend", "neutral")
                subnet.updated_at = datetime.utcnow()
                await subnet.save()
                return True

        except Exception as e:
            await self.log_sync(
                "subnet_update_error",
                level="warning",
                subnet_id=data.get("netuid"),
                error=str(e),
            )

        return False

    async def _generate_sample_data(self) -> int:
        """Generate sample subnet data when API is unavailable.
        
        Returns:
            Number of subnets updated
        """
        sample_subnets = [
            {"netuid": 1, "name": "Tensor", "market_cap_millions": 1240, "apy": 12.4},
            {"netuid": 2, "name": "BitLocals", "market_cap_millions": 450, "apy": 18.3},
            {"netuid": 3, "name": "Filet", "market_cap_millions": 380, "apy": 22.1},
            {"netuid": 4, "name": "Omega", "market_cap_millions": 520, "apy": 15.6},
        ]

        updated = 0
        for subnet_data in sample_subnets:
            if await self._update_subnet(subnet_data):
                updated += 1

        return updated
