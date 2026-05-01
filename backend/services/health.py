"""Health monitoring service - provides sync status and health check information."""

from datetime import datetime

import structlog
from models.sync_state import SyncState

from .base import BaseService, SyncStatus

logger = structlog.get_logger(__name__)


class HealthService(BaseService):
    """Service for monitoring system health and sync status."""

    service_name = "health_monitor"
    interval_minutes = 1  # Check health every minute

    async def run(self) -> None:
        """Check system health and report sync status."""
        try:
            # This is a passive monitoring service
            # It doesn't make any network calls or updates
            # It just provides a method to get health status
            await self.log_sync("health_check_completed")
        except Exception as e:
            await self.log_sync(
                "health_check_failed",
                level="error",
                error=str(e),
            )

    async def get_system_health(self) -> dict:
        """Get overall system health status.
        
        Returns:
            Health status dict with each service status
        """
        try:
            services = ["metagraph", "github_commits", "price", "research_news"]
            health_status = {"status": "healthy", "services": {}}

            for service_name in services:
                sync_state = await SyncState.find_one(
                    SyncState.service == service_name
                )

                if sync_state:
                    # Check if service has synced recently
                    time_since_last_run = (
                        datetime.utcnow() - sync_state.last_run
                    ).total_seconds()

                    # Determine status based on last run
                    if sync_state.status == "success":
                        if time_since_last_run < 600:  # Less than 10 minutes
                            service_status = "healthy"
                        elif time_since_last_run < 1800:  # Less than 30 minutes
                            service_status = "warning"
                        else:
                            service_status = "stale"
                    else:
                        service_status = "error"

                    health_status["services"][service_name] = {
                        "status": service_status,
                        "last_run": sync_state.last_run.isoformat(),
                        "last_completed": (
                            sync_state.last_completed.isoformat()
                            if sync_state.last_completed
                            else None
                        ),
                        "error_message": sync_state.error_message,
                        "records_processed": sync_state.records_processed,
                        "duration_seconds": sync_state.duration_seconds,
                    }
                else:
                    health_status["services"][service_name] = {
                        "status": "not_started",
                        "last_run": None,
                    }

            # Determine overall status
            service_statuses = [s["status"] for s in health_status["services"].values()]
            if any(s in ["error"] for s in service_statuses):
                health_status["status"] = "degraded"
            elif any(s in ["warning", "stale"] for s in service_statuses):
                health_status["status"] = "warning"

            return health_status

        except Exception as e:
            logger.error("health_check_error", error=str(e))
            return {
                "status": "error",
                "error": str(e),
                "services": {},
            }

    async def get_service_status(self, service_name: str) -> dict:
        """Get status for a specific service.
        
        Args:
            service_name: Name of the service to check
            
        Returns:
            Service status dict
        """
        try:
            sync_state = await SyncState.find_one(
                SyncState.service == service_name
            )

            if sync_state:
                return {
                    "service": service_name,
                    "status": sync_state.status,
                    "last_run": sync_state.last_run.isoformat(),
                    "last_completed": (
                        sync_state.last_completed.isoformat()
                        if sync_state.last_completed
                        else None
                    ),
                    "error_message": sync_state.error_message,
                    "records_processed": sync_state.records_processed,
                    "records_created": sync_state.records_created,
                    "records_updated": sync_state.records_updated,
                    "duration_seconds": sync_state.duration_seconds,
                }
            else:
                return {
                    "service": service_name,
                    "status": "not_started",
                    "error": f"No sync state found for {service_name}",
                }

        except Exception as e:
            logger.error(
                "service_status_error",
                service=service_name,
                error=str(e),
            )
            return {
                "service": service_name,
                "status": "error",
                "error": str(e),
            }
