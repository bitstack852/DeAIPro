"""GitHub synchronization service - tracks subnet repository commits and metrics."""

import asyncio
from datetime import datetime, timedelta
from typing import Optional

import aiohttp
import structlog
from models.subnet import Subnet

from .base import BaseService, SyncStatus

logger = structlog.get_logger(__name__)


class GitHubService(BaseService):
    """Service for tracking GitHub commits and metrics on subnet repositories."""

    service_name = "github_commits"
    interval_minutes = 60

    def __init__(self, github_api_token: str = None, github_api_url: str = None):
        """Initialize GitHub service.
        
        Args:
            github_api_token: GitHub API personal access token
            github_api_url: GitHub API base URL
        """
        super().__init__()
        self.github_api_token = github_api_token or "demo"
        self.github_api_url = github_api_url or "https://api.github.com"
        self.timeout = aiohttp.ClientTimeout(total=30)

    async def run(self) -> None:
        """Fetch GitHub metrics for all subnets."""
        start_time = datetime.utcnow()
        records_updated = 0

        try:
            await self.update_sync_state(SyncStatus.RUNNING)
            await self.log_sync("github_sync_started")

            # Get all subnets with GitHub URLs
            subnets = await Subnet.find(Subnet.github_url != "").to_list(None)
            await self.log_sync(
                "subnets_found",
                count=len(subnets),
            )

            # Update each subnet's GitHub metrics
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                for subnet in subnets:
                    try:
                        updated = await self._update_subnet_github_metrics(
                            session, subnet
                        )
                        if updated:
                            records_updated += 1
                    except Exception as e:
                        await self.log_sync(
                            "subnet_github_update_failed",
                            level="warning",
                            subnet_id=subnet.id,
                            error=str(e),
                        )

            duration = (datetime.utcnow() - start_time).total_seconds()

            await self.update_sync_state(
                status=SyncStatus.SUCCESS,
                records_processed=len(subnets),
                records_updated=records_updated,
                duration_seconds=duration,
            )
            await self.log_sync(
                "github_sync_complete",
                subnets_updated=records_updated,
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
                "github_sync_failed",
                level="error",
                error=str(e),
            )

    async def _update_subnet_github_metrics(
        self, session: aiohttp.ClientSession, subnet: Subnet
    ) -> bool:
        """Update GitHub metrics for a subnet.
        
        Args:
            session: aiohttp session
            subnet: Subnet document to update
            
        Returns:
            True if updated, False otherwise
        """
        try:
            if not subnet.github_url:
                return False

            # Parse GitHub URL to get owner/repo
            parts = subnet.github_url.rstrip("/").split("/")
            if len(parts) < 2:
                return False

            owner = parts[-2]
            repo = parts[-1]

            # Fetch repository data from GitHub API
            url = f"{self.github_api_url}/repos/{owner}/{repo}"
            headers = {
                "Authorization": f"token {self.github_api_token}",
                "Accept": "application/vnd.github.v3+json",
            }

            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    repo_data = await response.json()

                    # Extract metrics
                    stars_url = url.split("/repos/")[1]
                    
                    # Calculate commits in last 30 days
                    commits_30d = await self._get_commits_30d(
                        session, owner, repo, headers
                    )

                    # Update subnet
                    subnet.github_stars = repo_data.get("stargazers_count", 0)
                    subnet.github_commits_30d = commits_30d
                    subnet.github_updated_at = datetime.utcnow()
                    await subnet.save()

                    await self.log_sync(
                        "subnet_github_updated",
                        subnet_id=subnet.id,
                        stars=subnet.github_stars,
                        commits_30d=commits_30d,
                    )
                    return True

                else:
                    await self.log_sync(
                        "github_api_error",
                        level="warning",
                        status_code=response.status,
                        repo=f"{owner}/{repo}",
                    )
                    return False

        except asyncio.TimeoutError:
            await self.log_sync(
                "github_api_timeout",
                level="warning",
                subnet_id=subnet.id,
            )
        except Exception as e:
            await self.log_sync(
                "github_metrics_error",
                level="warning",
                subnet_id=subnet.id,
                error=str(e),
            )

        return False

    async def _get_commits_30d(
        self,
        session: aiohttp.ClientSession,
        owner: str,
        repo: str,
        headers: dict,
    ) -> int:
        """Get commit count for the last 30 days.
        
        Args:
            session: aiohttp session
            owner: Repository owner
            repo: Repository name
            headers: GitHub API headers
            
        Returns:
            Number of commits in last 30 days
        """
        try:
            since = (datetime.utcnow() - timedelta(days=30)).isoformat()
            url = (
                f"{self.github_api_url}/repos/{owner}/{repo}/commits"
                f"?since={since}&per_page=1"
            )

            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    # GitHub returns total count in Link header
                    link_header = response.headers.get("Link", "")
                    if "last" in link_header:
                        # Parse last page number from Link header
                        import re

                        match = re.search(r"page=(\d+)>;\s*rel=\"last\"", link_header)
                        if match:
                            return int(match.group(1))

                    # Fallback: return 0 if header parsing fails
                    return 0

        except Exception as e:
            await self.log_sync(
                "commits_30d_error",
                level="warning",
                error=str(e),
            )

        return 0
