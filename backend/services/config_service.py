"""
Live configuration service — reads runtime settings from MongoDB AppConfig
collection, seeding from environment variables on first boot.

Usage in background services:
    from services.config_service import config_service
    api_key = await config_service.get("TAOSTATS_API_KEY")
"""

import os
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

import structlog

logger = structlog.get_logger(__name__)

# ── Config Definitions ────────────────────────────────────────────────────────
# Single source of truth for all manageable settings.
# env_var: which os.environ key to seed from (None = no env fallback)

CONFIG_DEFINITIONS: List[Dict[str, Any]] = [
    # Data Sources
    {
        "key": "TAOSTATS_API_KEY",
        "category": "data_sources",
        "label": "TaoStats API Key",
        "is_secret": True,
        "env_var": "TAOSTATS_API_KEY",
        "default": "",
    },
    {
        "key": "COINGECKO_API_KEY",
        "category": "data_sources",
        "label": "CoinGecko API Key",
        "is_secret": True,
        "env_var": "COINGECKO_API_KEY",
        "default": "",
    },
    {
        "key": "GITHUB_API_TOKEN",
        "category": "data_sources",
        "label": "GitHub Personal Access Token",
        "is_secret": True,
        "env_var": "GITHUB_API_TOKEN",
        "default": "",
    },
    # Sync Intervals
    {
        "key": "METAGRAPH_SYNC_INTERVAL",
        "category": "sync_intervals",
        "label": "Metagraph Sync Interval (minutes)",
        "is_secret": False,
        "env_var": "METAGRAPH_SYNC_INTERVAL",
        "default": "15",
    },
    {
        "key": "PRICE_SYNC_INTERVAL",
        "category": "sync_intervals",
        "label": "Price Sync Interval (minutes)",
        "is_secret": False,
        "env_var": "PRICE_SYNC_INTERVAL",
        "default": "5",
    },
    {
        "key": "NEWS_SYNC_INTERVAL",
        "category": "sync_intervals",
        "label": "News Sync Interval (minutes)",
        "is_secret": False,
        "env_var": "NEWS_SYNC_INTERVAL",
        "default": "30",
    },
    {
        "key": "GITHUB_SYNC_INTERVAL",
        "category": "sync_intervals",
        "label": "GitHub Sync Interval (minutes)",
        "is_secret": False,
        "env_var": "GITHUB_SYNC_INTERVAL",
        "default": "60",
    },
    # Notifications
    {
        "key": "SENDGRID_API_KEY",
        "category": "notifications",
        "label": "SendGrid API Key",
        "is_secret": True,
        "env_var": "SENDGRID_API_KEY",
        "default": "",
    },
    {
        "key": "NOTIFICATION_SENDER_EMAIL",
        "category": "notifications",
        "label": "SendGrid Sender Email",
        "is_secret": False,
        "env_var": "NOTIFICATION_SENDER_EMAIL",
        "default": "",
    },
    {
        "key": "NOTIFICATION_RECIPIENTS",
        "category": "notifications",
        "label": "Notification Recipients (comma-separated)",
        "is_secret": False,
        "env_var": "NOTIFICATION_RECIPIENTS",
        "default": "",
    },
    {
        "key": "SMTP_HOST",
        "category": "notifications",
        "label": "SMTP Host",
        "is_secret": False,
        "env_var": "SMTP_HOST",
        "default": "",
    },
    {
        "key": "SMTP_PORT",
        "category": "notifications",
        "label": "SMTP Port",
        "is_secret": False,
        "env_var": "SMTP_PORT",
        "default": "587",
    },
    {
        "key": "SMTP_USERNAME",
        "category": "notifications",
        "label": "SMTP Username",
        "is_secret": False,
        "env_var": "SMTP_USERNAME",
        "default": "",
    },
    {
        "key": "SMTP_PASSWORD",
        "category": "notifications",
        "label": "SMTP Password",
        "is_secret": True,
        "env_var": "SMTP_PASSWORD",
        "default": "",
    },
    {
        "key": "SMTP_FROM_EMAIL",
        "category": "notifications",
        "label": "SMTP From Email",
        "is_secret": False,
        "env_var": "SMTP_FROM_EMAIL",
        "default": "",
    },
    # App Behaviour
    {
        "key": "CORS_ORIGINS",
        "category": "app_behaviour",
        "label": "Allowed CORS Origins (comma-separated)",
        "is_secret": False,
        "env_var": "BACKEND_CORS_ORIGINS",
        "default": "http://localhost:3000",
    },
    {
        "key": "RATE_LIMIT",
        "category": "app_behaviour",
        "label": "Rate Limit (requests/minute per IP)",
        "is_secret": False,
        "env_var": "RATE_LIMIT_DEFAULT",
        "default": "100/minute",
    },
    # Feature Flags
    {
        "key": "METAGRAPH_SYNC_ENABLED",
        "category": "feature_flags",
        "label": "Metagraph Sync",
        "is_secret": False,
        "env_var": None,
        "default": "true",
    },
    {
        "key": "PRICE_SYNC_ENABLED",
        "category": "feature_flags",
        "label": "Price Sync",
        "is_secret": False,
        "env_var": None,
        "default": "true",
    },
    {
        "key": "NEWS_SYNC_ENABLED",
        "category": "feature_flags",
        "label": "News Sync",
        "is_secret": False,
        "env_var": None,
        "default": "true",
    },
    {
        "key": "GITHUB_SYNC_ENABLED",
        "category": "feature_flags",
        "label": "GitHub Sync",
        "is_secret": False,
        "env_var": None,
        "default": "true",
    },
]

# Build lookup by key for fast access
_DEFINITIONS_BY_KEY: Dict[str, Dict] = {d["key"]: d for d in CONFIG_DEFINITIONS}

MASKED = "••••••••"
_CACHE_TTL = 60  # seconds


class ConfigService:
    """
    Runtime config service backed by MongoDB AppConfig collection.
    Values are cached in memory for _CACHE_TTL seconds to avoid a DB
    round-trip on every background service tick.
    """

    def __init__(self):
        self._cache: Dict[str, str] = {}
        self._cache_ts: float = 0.0

    async def seed_defaults(self) -> None:
        """
        Called once at startup. For each defined config key that does not
        yet exist in the DB, insert a document seeded from the matching
        env var (or the hard-coded default).
        """
        from models.config import AppConfig

        seeded = 0
        for defn in CONFIG_DEFINITIONS:
            existing = await AppConfig.find_one(AppConfig.key == defn["key"])
            if existing:
                continue

            env_value = ""
            if defn["env_var"]:
                env_value = os.environ.get(defn["env_var"], defn["default"])
            else:
                env_value = defn["default"]

            doc = AppConfig(
                key=defn["key"],
                value=env_value,
                category=defn["category"],
                label=defn["label"],
                is_secret=defn["is_secret"],
                updated_at=datetime.utcnow(),
            )
            await doc.insert()
            seeded += 1

        if seeded:
            logger.info("config_seeded", keys_seeded=seeded)
        else:
            logger.info("config_seed_skipped", reason="all keys already present")

        self._invalidate_cache()

    async def get(self, key: str) -> str:
        """Return the live value for a key (DB → env var → default)."""
        await self._maybe_refresh_cache()
        if key in self._cache:
            return self._cache[key]

        # Not in cache — check env var / definition default as last resort
        defn = _DEFINITIONS_BY_KEY.get(key)
        if defn:
            if defn["env_var"]:
                return os.environ.get(defn["env_var"], defn["default"])
            return defn["default"]
        return ""

    async def get_int(self, key: str, fallback: int = 0) -> int:
        val = await self.get(key)
        try:
            return int(val)
        except (ValueError, TypeError):
            return fallback

    async def get_bool(self, key: str, fallback: bool = True) -> bool:
        val = await self.get(key)
        return val.lower() in ("true", "1", "yes")

    async def set(self, key: str, value: str, updated_by: Optional[str] = None) -> None:
        """Persist a new value and invalidate the in-memory cache."""
        from models.config import AppConfig

        defn = _DEFINITIONS_BY_KEY.get(key)
        if not defn:
            raise ValueError(f"Unknown config key: {key}")

        doc = await AppConfig.find_one(AppConfig.key == key)
        if doc:
            doc.value = value
            doc.updated_at = datetime.utcnow()
            doc.updated_by = updated_by
            await doc.save()
        else:
            doc = AppConfig(
                key=key,
                value=value,
                category=defn["category"],
                label=defn["label"],
                is_secret=defn["is_secret"],
                updated_at=datetime.utcnow(),
                updated_by=updated_by,
            )
            await doc.insert()

        self._invalidate_cache()
        logger.info("config_updated", key=key, updated_by=updated_by)

    async def get_all_grouped(self, mask_secrets: bool = True) -> Dict[str, List[Dict]]:
        """
        Return all config entries grouped by category.
        Secret values are replaced with MASKED when mask_secrets=True.
        """
        from models.config import AppConfig

        docs = {d.key: d for d in await AppConfig.find_all().to_list(None)}

        groups: Dict[str, List[Dict]] = {}
        for defn in CONFIG_DEFINITIONS:
            cat = defn["category"]
            if cat not in groups:
                groups[cat] = []

            doc = docs.get(defn["key"])
            value = doc.value if doc else defn["default"]
            updated_at = doc.updated_at.isoformat() if doc and doc.updated_at else None
            updated_by = doc.updated_by if doc else None

            groups[cat].append({
                "key": defn["key"],
                "label": defn["label"],
                "value": MASKED if (mask_secrets and defn["is_secret"] and value) else value,
                "is_secret": defn["is_secret"],
                "category": cat,
                "updated_at": updated_at,
                "updated_by": updated_by,
            })

        return groups

    def _invalidate_cache(self) -> None:
        self._cache = {}
        self._cache_ts = 0.0

    async def _maybe_refresh_cache(self) -> None:
        if time.time() - self._cache_ts < _CACHE_TTL:
            return
        try:
            from models.config import AppConfig
            docs = await AppConfig.find_all().to_list(None)
            self._cache = {d.key: d.value for d in docs}
            self._cache_ts = time.time()
        except Exception:
            pass  # If DB is unavailable, serve stale / env-var fallbacks


# Global singleton
config_service = ConfigService()
