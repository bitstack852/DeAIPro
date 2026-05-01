"""Health check and sync status endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

import structlog
from dependencies.scheduler import scheduler
from schemas.common import SuccessResponse

logger = structlog.get_logger(__name__)
limiter = Limiter(key_func=get_remote_address)
router = APIRouter()


@router.get(
    "/api/health",
    response_model=dict,
    tags=["Health"],
    summary="System health check",
)
@limiter.limit("100/minute")
async def health_check(request: Request):
    """
    Check system health and sync status.
    
    Returns detailed status for all background services.
    """
    try:
        health_service = scheduler.get_health_service()
        if not health_service:
            return {
                "status": "unknown",
                "message": "Health service not initialized",
            }

        health_status = await health_service.get_system_health()
        return health_status

    except Exception as e:
        logger.error("health_check_failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Health check failed",
        )


@router.get(
    "/api/health/services/{service_name}",
    response_model=dict,
    tags=["Health"],
    summary="Get specific service status",
)
@limiter.limit("100/minute")
async def get_service_status(request: Request, service_name: str):
    """
    Get status for a specific background service.
    
    Args:
        service_name: Name of service (metagraph, github_commits, price, research_news)
    
    Returns:
        Service status with metrics and error details
    """
    try:
        valid_services = ["metagraph", "github_commits", "price", "research_news"]
        if service_name not in valid_services:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid service name. Valid options: {', '.join(valid_services)}",
            )

        health_service = scheduler.get_health_service()
        if not health_service:
            return {
                "status": "unknown",
                "message": "Health service not initialized",
            }

        service_status = await health_service.get_service_status(service_name)
        return service_status

    except HTTPException:
        raise
    except Exception as e:
        logger.error("service_status_failed", service=service_name, error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Service status check failed",
        )


@router.get(
    "/api/health/jobs",
    response_model=dict,
    tags=["Health"],
    summary="Get scheduled background jobs",
)
@limiter.limit("100/minute")
async def get_scheduled_jobs(request: Request):
    """
    Get list of all scheduled background jobs.
    
    Returns:
        List of jobs with next run times and triggers
    """
    try:
        jobs = scheduler.get_jobs()
        return {
            "status": "success",
            "jobs_count": len(jobs),
            "jobs": jobs,
        }

    except Exception as e:
        logger.error("get_jobs_failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve scheduled jobs",
        )
