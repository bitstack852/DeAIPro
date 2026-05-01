"""Dependencies for FastAPI endpoints."""

from .db import get_database, db
from .auth import (
    CurrentUser,
    get_current_user,
    require_admin,
    require_staff,
    get_or_create_temp_access,
    verify_token,
)
from .scheduler import scheduler

__all__ = [
    "get_database",
    "db",
    "CurrentUser",
    "get_current_user",
    "require_admin",
    "require_staff",
    "get_or_create_temp_access",
    "verify_token",
    "scheduler",
]
