"""Firebase authentication dependency for FastAPI.

Design:
- get_current_user: any valid Firebase user (authenticated but not necessarily staff)
- require_staff:    @deaistrategies.io domain check — raises 403 for outsiders
- require_admin:    staff domain + admin custom claim check

All token verification is offloaded to a thread-pool executor so the
synchronous Firebase SDK (which uses `requests` internally) never blocks
the uvicorn event loop.
"""

import asyncio
import logging
from functools import partial
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from firebase_admin import auth as firebase_auth
from pydantic import BaseModel

logger = logging.getLogger(__name__)

STAFF_DOMAIN = "@deaistrategies.io"


class CurrentUser(BaseModel):
    """Authenticated user information."""

    uid: str
    email: str
    email_verified: bool
    is_admin: bool = False

    @property
    def is_staff(self) -> bool:
        """True if the user belongs to the institutional domain."""
        return self.email.lower().endswith(STAFF_DOMAIN)


async def verify_token(token: str) -> Optional[dict]:
    """Verify a Firebase ID token asynchronously.

    The Firebase Admin SDK calls `requests.get` to fetch Google's public keys
    on cache-misses, which is a synchronous blocking I/O operation.  We run it
    in the default thread-pool executor so the event loop is never stalled.
    """
    loop = asyncio.get_event_loop()
    try:
        decoded_token = await loop.run_in_executor(
            None, partial(firebase_auth.verify_id_token, token)
        )
        return decoded_token
    except firebase_auth.InvalidIdTokenError:
        logger.warning("Token verification failed: invalid ID token")
        return None
    except firebase_auth.ExpiredIdTokenError:
        logger.warning("Token verification failed: expired ID token")
        return None
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        return None


async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> CurrentUser:
    """Dependency: any valid Firebase user.

    Usage:
        @router.get("/api/protected")
        async def endpoint(user: CurrentUser = Depends(get_current_user)):
            ...
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        scheme, credentials = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid scheme")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )

    decoded_token = await verify_token(credentials)
    if not decoded_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = decoded_token.get("email", "")

    # Admin status requires both the custom Firebase claim AND staff domain.
    is_admin = bool(decoded_token.get("admin", False)) and email.lower().endswith(
        STAFF_DOMAIN
    )

    return CurrentUser(
        uid=decoded_token.get("uid"),
        email=email,
        email_verified=decoded_token.get("email_verified", False),
        is_admin=is_admin,
    )


async def require_staff(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Dependency: authenticated user must belong to @deaistrategies.io.

    Use this (rather than require_admin) on routes that should be
    staff-only but do not require the 'admin' custom claim.
    """
    if not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required",
        )
    return current_user


async def require_admin(
    current_user: CurrentUser = Depends(require_staff),
) -> CurrentUser:
    """Dependency: authenticated user must be staff AND have the admin claim.

    Chains require_staff → adds admin-claim check.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def get_or_create_temp_access(
    token: Optional[str] = None,
) -> Optional[CurrentUser]:
    """Allow either Firebase auth or a temporary 24-hour access token.

    Phase 3 will replace the Firebase fallback with proper DB-backed
    temporary token validation.
    """
    if not token:
        return None
    try:
        decoded_token = await verify_token(token)
        if not decoded_token:
            return None
        email = decoded_token.get("email", "")
        return CurrentUser(
            uid=decoded_token.get("uid"),
            email=email,
            email_verified=decoded_token.get("email_verified", False),
            is_admin=False,
        )
    except Exception as e:
        logger.error(f"Error verifying temporary access: {e}")
        return None
