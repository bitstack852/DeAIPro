"""
DeAIPro Backend - FastAPI Entry Point

Main application factory and startup/shutdown logic.
Routes are organized modularly in api.routes.*
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import structlog
import firebase_admin
from firebase_admin import credentials
import os
from pathlib import Path
import uuid

from config.settings import settings
from middleware.logging import setup_logging
from dependencies.db import db
from dependencies.scheduler import scheduler
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

# Configure logging
setup_logging()
logger = structlog.get_logger(__name__)

# IMPROVED: Initialize Sentry for backend monitoring if DSN is configured.
if settings.sentry_dsn_backend:
    sentry_logging = LoggingIntegration(level=os.environ.get("SENTRY_LOG_LEVEL", "INFO"), event_level=None)
    sentry_sdk.init(
        dsn=settings.sentry_dsn_backend,
        integrations=[FastApiIntegration(), sentry_logging],
        traces_sample_rate=0.1,
        environment=settings.environment,
    )

# Initialize Firebase Admin
def init_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        if settings.google_application_credentials and os.path.exists(
            settings.google_application_credentials
        ):
            cred = credentials.Certificate(settings.google_application_credentials)
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
            logger.info("✓ Firebase Admin initialized")
        else:
            logger.warning("⚠️ Firebase credentials not found, proceeding without auth")
    except Exception as e:
        logger.error(f"Firebase initialization failed: {e}")
        if settings.environment == "production":
            raise

# Create FastAPI app
app = FastAPI(
    title="DeAIPro API",
    description="Real-time Bittensor analytics and intelligence platform",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# Rate Limiting
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.rate_limit_default] if settings.rate_limit_enabled else []
)
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    logger.warning("Rate limit exceeded", remote_addr=get_remote_address(request))
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Too many requests. Please try again later."
    )

# CORS Middleware
cors_origins = [origin.strip() for origin in settings.backend_cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routes (after app creation)
from api.routes import public, auth, admin, health

app.include_router(public.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(health.router)

# Startup/Shutdown Events
@app.on_event("startup")
async def startup_event():
    """Startup: Initialize Firebase, MongoDB, and background workers"""
    logger.info("🚀 DeAIPro starting up...")
    
    init_firebase()
    
    # Initialize MongoDB connection
    try:
        await db.connect()
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

    # Seed runtime config from env vars (no-op if already seeded)
    try:
        from services.config_service import config_service
        await config_service.seed_defaults()
    except Exception as e:
        logger.warning(f"Config seeding failed (non-fatal): {e}")

    # Start background scheduler
    try:
        await scheduler.start()
    except Exception as e:
        logger.error(f"Failed to start background scheduler: {e}")
        raise
    
    logger.info("✓ All services initialized")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown: Close connections and cleanup"""
    logger.info("🛑 DeAIPro shutting down...")
    
    # Stop background scheduler
    await scheduler.stop()
    
    # Disconnect from database
    await db.disconnect()


# Health Check Endpoint
@app.get("/api/health")
@limiter.limit("100/minute")
async def health_check(request: Request):
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "DeAIPro",
        "version": "1.0.0",
        "environment": settings.environment,
    }

# Main entry point
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment == "development",
        log_level="info",
    )
