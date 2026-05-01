"""Database connection and initialization for MongoDB with Motor and Beanie."""

import logging
from typing import Optional

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from config.settings import settings
from models import (
    Lesson,
    PriceHistory,
    ResearchArticle,
    Subnet,
    SubnetNews,
    SyncState,
    TemporaryAccess,
)

logger = logging.getLogger(__name__)


class Database:
    """MongoDB connection manager."""
    
    client: Optional[AsyncIOMotorClient] = None
    
    async def connect(self) -> None:
        """Initialize MongoDB connection and Beanie models."""
        try:
            logger.info(f"Connecting to MongoDB: {settings.database_url}")
            
            self.client = AsyncIOMotorClient(settings.database_url)
            
            # Test connection
            await self.client.admin.command("ismaster")
            logger.info("✓ MongoDB connection successful")
            
            # Initialize Beanie with all models
            await init_beanie(
                database=self.client.deaipro,
                document_models=[
                    Subnet,
                    SubnetNews,
                    TemporaryAccess,
                    SyncState,
                    PriceHistory,
                    ResearchArticle,
                    Lesson,
                ],
            )
            logger.info("✓ Beanie models initialized")
            
            # Create indexes
            await self._create_indexes()
            
        except Exception as e:
            logger.error(f"✗ MongoDB connection failed: {e}")
            raise
    
    async def disconnect(self) -> None:
        """Close MongoDB connection."""
        if self.client:
            self.client.close()
            logger.info("✗ MongoDB connection closed")
    
    async def _create_indexes(self) -> None:
        """Ensure all indexes are created."""
        try:
            db = self.client.deaipro

            # TTL index on temporary_access.created_at — documents are
            # automatically deleted 24 hours after creation.  Using an explicit
            # name makes this call idempotent: MongoDB no-ops when an index
            # with the same name and identical options already exists.
            await db.temporary_access.create_index(
                "created_at",
                expireAfterSeconds=86400,  # 24 hours
                name="temporary_access_ttl_24h",
            )
            logger.info("✓ TTL index ensured for TemporaryAccess (24h)")
        except Exception as e:
            logger.warning(f"Index creation warning: {e}")


# Global database instance
db = Database()


async def get_database():
    """Dependency for getting database in endpoints."""
    if not db.client:
        raise RuntimeError("Database not initialized")
    return db.client.deaipro
