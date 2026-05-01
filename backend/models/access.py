"""TemporaryAccess Beanie model for MongoDB."""

from datetime import datetime, timedelta
from typing import Optional
from beanie import Document, Indexed
from pydantic import Field, EmailStr


class TemporaryAccess(Document):
    """Temporary 24-hour access token for unauthenticated users."""
    
    # User identification
    email: Indexed(EmailStr)
    token: Indexed(str, unique=True)  # Random 32-char token
    
    # Lifetime management
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(
        default_factory=lambda: datetime.utcnow() + timedelta(hours=24)
    )
    
    # Usage tracking
    accessed_at: Optional[datetime] = None
    request_count: int = 0  # How many requests made with this token
    
    # Approval (set by admin via /api/admin/approve-access)
    approved: bool = False
    approved_at: Optional[datetime] = None

    # Revocation
    revoked: bool = False
    revoked_at: Optional[datetime] = None
    revocation_reason: Optional[str] = None
    
    class Settings:
        collection = "temporary_access"
        indexes = [
            # Beanie creates these standard indexes at startup.
            # NOTE: The TTL index on `created_at` (expireAfterSeconds=86400) is
            # created imperatively in dependencies/db.py because Beanie's
            # Settings.indexes list does not support TTL options.
            [("token", 1)],   # unique index on token
            [("email", 1)],
            [("expires_at", 1)],
            [("created_at", -1)],
        ]
