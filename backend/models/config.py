"""AppConfig Beanie model — stores runtime-configurable settings in MongoDB."""

from datetime import datetime
from typing import Optional
from beanie import Document, Indexed
from pydantic import Field


class AppConfig(Document):
    """Key/value configuration store with category grouping and secret masking."""

    key: Indexed(str, unique=True)
    value: str = ""
    category: str       # data_sources | sync_intervals | notifications | app_behaviour | feature_flags
    label: str          # Human-readable field name shown in UI
    is_secret: bool = False  # Secret values are masked in GET responses
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None

    class Settings:
        collection = "app_config"
        indexes = [
            [("key", 1)],
            [("category", 1)],
        ]
