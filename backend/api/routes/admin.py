"""
Admin-only routes — requires @deaistrategies.io Firebase account
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from slowapi import Limiter
from slowapi.util import get_remote_address
import structlog

from dependencies import require_staff, CurrentUser
from models import TemporaryAccess

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])
limiter = Limiter(key_func=get_remote_address)


class ApproveAccessRequest(BaseModel):
    email: EmailStr
    extend_hours: Optional[int] = None  # Optional TTL extension on approval


@router.get("/status")
@limiter.limit("60/minute")
async def admin_status(
    request: Request,
    current_user: CurrentUser = Depends(require_staff),
):
    """Return pending access requests and summary counts."""
    try:
        now = datetime.utcnow()

        all_tokens = await TemporaryAccess.find().to_list(None)

        pending = [
            t for t in all_tokens
            if not t.approved and not t.revoked and t.expires_at > now
        ]
        approved = [t for t in all_tokens if t.approved and not t.revoked]
        revoked = [t for t in all_tokens if t.revoked]
        expired = [
            t for t in all_tokens
            if not t.revoked and t.expires_at <= now
        ]

        return {
            "status": "success",
            "data": {
                "counts": {
                    "pending": len(pending),
                    "approved": len(approved),
                    "revoked": len(revoked),
                    "expired": len(expired),
                    "total": len(all_tokens),
                },
                "pending_requests": [
                    {
                        "email": t.email,
                        "created_at": t.created_at.isoformat(),
                        "expires_at": t.expires_at.isoformat(),
                        "request_count": t.request_count,
                    }
                    for t in sorted(pending, key=lambda x: x.created_at, reverse=True)
                ],
            },
        }

    except Exception as e:
        logger.error("admin_status_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch admin status",
        )


@router.post("/approve-access")
@limiter.limit("30/minute")
async def admin_approve_access(
    request: Request,
    body: ApproveAccessRequest,
    current_user: CurrentUser = Depends(require_staff),
):
    """Approve the most recent pending access request for an email."""
    try:
        email = body.email.lower()
        now = datetime.utcnow()

        # Find most recent non-revoked token for this email
        token = await TemporaryAccess.find(
            TemporaryAccess.email == email,
            TemporaryAccess.revoked == False,
        ).sort([("created_at", -1)]).first_or_none()

        if not token:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No active access request found for {email}",
            )

        if token.approved:
            return {
                "status": "success",
                "message": f"{email} is already approved",
                "data": {
                    "email": email,
                    "approved_at": token.approved_at.isoformat(),
                    "expires_at": token.expires_at.isoformat(),
                },
            }

        token.approved = True
        token.approved_at = now

        # Optionally extend the TTL from now
        if body.extend_hours:
            from datetime import timedelta
            token.expires_at = now + timedelta(hours=body.extend_hours)

        await token.save()

        logger.info(
            "access_approved",
            email=email,
            approved_by=current_user.email,
        )

        return {
            "status": "success",
            "message": f"Access approved for {email}",
            "data": {
                "email": email,
                "approved_at": token.approved_at.isoformat(),
                "expires_at": token.expires_at.isoformat(),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("admin_approve_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to approve access",
        )
