"""Price history synchronization service - fetches TAO price data and creates OHLCV candles."""

import asyncio
from datetime import datetime, timedelta
from typing import Optional

import aiohttp
import structlog
from models.price import PriceHistory

from .base import BaseService, SyncStatus

logger = structlog.get_logger(__name__)


class PriceService(BaseService):
    """Service for synchronizing TAO/USD price history."""

    service_name = "price"
    interval_minutes = 5  # Sync every 5 minutes for granular data

    def __init__(self, coingecko_api_url: str = None):
        """Initialize price service.
        
        Args:
            coingecko_api_url: CoinGecko API base URL
        """
        super().__init__()
        self.coingecko_api_url = coingecko_api_url or "https://api.coingecko.com/api/v3"
        self.timeout = aiohttp.ClientTimeout(total=30)
        self.tao_id = "affyn"  # CoinGecko ID for Bittensor/TAO

    async def run(self) -> None:
        """Fetch and store TAO price data."""
        start_time = datetime.utcnow()
        records_created = 0

        try:
            await self.update_sync_state(SyncStatus.RUNNING)
            await self.log_sync("price_sync_started")

            # Fetch current price
            price_data = await self._fetch_current_price()

            if price_data:
                # Create OHLCV candle for current hour
                created = await self._create_hourly_candle(price_data)
                records_created = 1 if created else 0

            duration = (datetime.utcnow() - start_time).total_seconds()

            await self.update_sync_state(
                status=SyncStatus.SUCCESS,
                records_processed=1,
                records_created=records_created,
                duration_seconds=duration,
            )
            await self.log_sync(
                "price_sync_complete",
                price_usd=price_data.get("usd") if price_data else None,
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
                "price_sync_failed",
                level="error",
                error=str(e),
            )

    async def _fetch_current_price(self) -> Optional[dict]:
        """Fetch current TAO price from CoinGecko.
        
        Returns:
            Price data with usd, market_cap, volume_24h or None if fetch fails
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.coingecko_api_url}/simple/price"
                params = {
                    "ids": self.tao_id,
                    "vs_currencies": "usd",
                    "include_market_cap": "true",
                    "include_24hr_vol": "true",
                }

                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        tao_data = data.get(self.tao_id, {})

                        return {
                            "usd": tao_data.get("usd", 0),
                            "market_cap": tao_data.get("usd_market_cap", 0),
                            "volume_24h": tao_data.get("usd_24h_vol", 0),
                        }
                    else:
                        await self.log_sync(
                            "coingecko_api_error",
                            level="warning",
                            status_code=response.status,
                        )

        except asyncio.TimeoutError:
            await self.log_sync(
                "coingecko_api_timeout",
                level="warning",
            )
        except Exception as e:
            await self.log_sync(
                "price_fetch_error",
                level="warning",
                error=str(e),
            )

        return None

    async def _create_hourly_candle(self, price_data: dict) -> bool:
        """Create or update hourly OHLCV candle.
        
        Args:
            price_data: Price data with usd, market_cap, volume_24h
            
        Returns:
            True if candle was created/updated, False otherwise
        """
        try:
            current_price = price_data.get("usd", 0)

            # Round timestamp to hour
            now = datetime.utcnow()
            candle_time = now.replace(minute=0, second=0, microsecond=0)

            # Check if candle for this hour exists
            existing_candle = await PriceHistory.find_one(
                (PriceHistory.symbol == "TAO/USD")
                & (PriceHistory.timestamp == candle_time)
            )

            if existing_candle:
                # Update existing candle with new high/low/close
                existing_candle.high = max(existing_candle.high, current_price)
                existing_candle.low = min(existing_candle.low, current_price)
                existing_candle.close = current_price
                existing_candle.market_cap = price_data.get("market_cap", 0)
                await existing_candle.save()
            else:
                # Create new candle
                candle = PriceHistory(
                    symbol="TAO/USD",
                    timestamp=candle_time,
                    open=current_price,
                    high=current_price,
                    low=current_price,
                    close=current_price,
                    volume=price_data.get("volume_24h", 0),
                    market_cap=price_data.get("market_cap", 0),
                )
                await candle.insert()

            await self.log_sync(
                "hourly_candle_created",
                timestamp=candle_time.isoformat(),
                price_usd=current_price,
            )
            return True

        except Exception as e:
            await self.log_sync(
                "candle_creation_error",
                level="warning",
                error=str(e),
            )

        return False
