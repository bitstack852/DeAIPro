"""
Admin-only routes — requires @deaistrategies.io Firebase account
"""

import asyncio
import time
from datetime import datetime
from typing import Optional

import aiohttp
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from slowapi import Limiter
from slowapi.util import get_remote_address
import structlog

from dependencies import require_staff, CurrentUser
from models import TemporaryAccess
from services.config_service import config_service

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/auth-debug")
async def auth_debug(request: Request):
    """
    Diagnostic endpoint — returns raw token verification result.
    No auth guard. Remove once 401 issue is resolved.
    """
    import firebase_admin
    from firebase_admin import auth as fa
    from functools import partial
    import asyncio

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return {"error": "No Bearer token in Authorization header"}

    token = auth_header[7:]
    token_preview = token[:20] + "..."

    apps_initialized = bool(firebase_admin._apps)
    project_id = None
    if apps_initialized:
        app = firebase_admin.get_app()
        project_id = app.project_id

    try:
        loop = asyncio.get_event_loop()
        decoded = await loop.run_in_executor(
            None, partial(fa.verify_id_token, token)
        )
        return {
            "ok": True,
            "token_preview": token_preview,
            "firebase_apps_initialized": apps_initialized,
            "project_id": project_id,
            "uid": decoded.get("uid"),
            "email": decoded.get("email"),
        }
    except Exception as e:
        return {
            "ok": False,
            "token_preview": token_preview,
            "firebase_apps_initialized": apps_initialized,
            "project_id": project_id,
            "error_type": type(e).__name__,
            "error": str(e),
        }


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


# ── Config Endpoints ──────────────────────────────────────────────────────────

class ConfigUpdateRequest(BaseModel):
    key: str
    value: str


@router.get("/config")
@limiter.limit("60/minute")
async def get_config(
    request: Request,
    current_user: CurrentUser = Depends(require_staff),
):
    """Return all runtime config grouped by category. Secrets are masked."""
    try:
        grouped = await config_service.get_all_grouped(mask_secrets=True)
        return {"status": "success", "data": grouped}
    except Exception as e:
        logger.error("get_config_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch config")


@router.put("/config")
@limiter.limit("60/minute")
async def update_config(
    request: Request,
    body: ConfigUpdateRequest,
    current_user: CurrentUser = Depends(require_staff),
):
    """Update a single config key. Invalidates the in-memory cache."""
    try:
        await config_service.set(body.key, body.value, updated_by=current_user.email)
        return {"status": "success", "message": f"{body.key} updated"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("update_config_error", key=body.key, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to update config")


# ── Test Connection Endpoints ─────────────────────────────────────────────────

async def _test_http(
    url: str,
    headers: dict,
    timeout: int = 10,
) -> dict:
    """Make a lightweight GET request and return ok/latency/detail."""
    start = time.monotonic()
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout)) as session:
            async with session.get(url, headers=headers) as resp:
                latency_ms = round((time.monotonic() - start) * 1000)
                if resp.status < 400:
                    return {"ok": True, "latency_ms": latency_ms, "detail": f"HTTP {resp.status}"}
                text = await resp.text()
                return {"ok": False, "latency_ms": latency_ms, "detail": f"HTTP {resp.status}: {text[:120]}"}
    except aiohttp.ClientConnectorError as e:
        return {"ok": False, "latency_ms": None, "detail": f"Connection error: {str(e)[:120]}"}
    except Exception as e:
        return {"ok": False, "latency_ms": None, "detail": str(e)[:120]}


@router.post("/config/test/taostats")
@limiter.limit("20/minute")
async def test_taostats(
    request: Request,
    current_user: CurrentUser = Depends(require_staff),
):
    """Test the TaoStats API key by fetching the latest TAO price."""
    key = await config_service.get("TAOSTATS_API_KEY")
    if not key:
        return {"ok": False, "latency_ms": None, "detail": "No API key configured"}
    result = await _test_http(
        "https://api.taostats.io/api/v1/price/latest?asset=tao",
        headers={"Authorization": key},
    )
    return result


@router.post("/config/test/coingecko")
@limiter.limit("20/minute")
async def test_coingecko(
    request: Request,
    current_user: CurrentUser = Depends(require_staff),
):
    """Test the CoinGecko connection (API key optional for free tier)."""
    key = await config_service.get("COINGECKO_API_KEY")
    headers = {}
    if key:
        headers["x-cg-api-key"] = key
    result = await _test_http(
        "https://api.coingecko.com/api/v3/ping",
        headers=headers,
    )
    return result


@router.post("/config/test/github")
@limiter.limit("20/minute")
async def test_github(
    request: Request,
    current_user: CurrentUser = Depends(require_staff),
):
    """Test the GitHub token by checking rate limit quota."""
    token = await config_service.get("GITHUB_API_TOKEN")
    if not token:
        return {"ok": False, "latency_ms": None, "detail": "No token configured"}
    start = time.monotonic()
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
            async with session.get(
                "https://api.github.com/rate_limit",
                headers={"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"},
            ) as resp:
                latency_ms = round((time.monotonic() - start) * 1000)
                if resp.status == 200:
                    data = await resp.json()
                    remaining = data.get("rate", {}).get("remaining", "?")
                    limit = data.get("rate", {}).get("limit", "?")
                    return {"ok": True, "latency_ms": latency_ms, "detail": f"Quota: {remaining}/{limit} remaining"}
                return {"ok": False, "latency_ms": latency_ms, "detail": f"HTTP {resp.status}"}
    except Exception as e:
        return {"ok": False, "latency_ms": None, "detail": str(e)[:120]}


@router.post("/config/test/sendgrid")
@limiter.limit("20/minute")
async def test_sendgrid(
    request: Request,
    current_user: CurrentUser = Depends(require_staff),
):
    """Test the SendGrid API key by fetching account info."""
    key = await config_service.get("SENDGRID_API_KEY")
    if not key:
        return {"ok": False, "latency_ms": None, "detail": "No API key configured"}
    result = await _test_http(
        "https://api.sendgrid.com/v3/user/account",
        headers={"Authorization": f"Bearer {key}"},
    )
    return result


@router.post("/config/test/smtp")
@limiter.limit("10/minute")
async def test_smtp(
    request: Request,
    current_user: CurrentUser = Depends(require_staff),
):
    """Test custom SMTP credentials by opening a connection and authenticating."""
    host = await config_service.get("SMTP_HOST")
    port_str = await config_service.get("SMTP_PORT")
    username = await config_service.get("SMTP_USERNAME")
    password = await config_service.get("SMTP_PASSWORD")

    if not host:
        return {"ok": False, "latency_ms": None, "detail": "No SMTP host configured"}

    port = int(port_str) if port_str.isdigit() else 587
    start = time.monotonic()
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port), timeout=10
        )
        # Read server greeting
        await asyncio.wait_for(reader.readline(), timeout=5)
        latency_ms = round((time.monotonic() - start) * 1000)

        if username and password:
            import base64
            writer.write(b"EHLO deaipro\r\n")
            await asyncio.wait_for(reader.read(1024), timeout=5)
            writer.write(b"AUTH LOGIN\r\n")
            await asyncio.wait_for(reader.read(1024), timeout=5)
            writer.write(base64.b64encode(username.encode()) + b"\r\n")
            await asyncio.wait_for(reader.read(1024), timeout=5)
            writer.write(base64.b64encode(password.encode()) + b"\r\n")
            resp = await asyncio.wait_for(reader.read(1024), timeout=5)
            writer.close()
            resp_text = resp.decode(errors="replace").strip()
            if resp_text.startswith("235"):
                return {"ok": True, "latency_ms": latency_ms, "detail": "Authenticated successfully"}
            return {"ok": False, "latency_ms": latency_ms, "detail": f"Auth failed: {resp_text[:80]}"}

        writer.close()
        return {"ok": True, "latency_ms": latency_ms, "detail": f"Connected to {host}:{port}"}
    except asyncio.TimeoutError:
        return {"ok": False, "latency_ms": None, "detail": f"Connection to {host}:{port} timed out"}
    except Exception as e:
        return {"ok": False, "latency_ms": None, "detail": str(e)[:120]}
