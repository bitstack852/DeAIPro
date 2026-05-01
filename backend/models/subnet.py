"""Subnet Beanie model for MongoDB."""

from datetime import datetime
from typing import Literal, Optional
from beanie import Document, Indexed
from pydantic import Field


class Subnet(Document):
    """Subnet (neural network) on Bittensor.
    
    Represents a subnet with financial metrics, on-chain data, and quality indicators.
    """
    
    # Basic identification
    id: int  # NetUID — maps to _id, always unique
    name: str
    category: str
    icon: Optional[str] = None  # emoji or icon URL
    
    # Financial metrics (USD)
    market_cap_millions: float
    daily_emission: float
    total_stake: float
    apy: float  # Annual Percentage Yield (calculated)
    
    # On-chain metrics
    validators_count: int
    miners_count: int
    registration_count: int
    
    # GitHub integration
    github_url: Optional[str] = None
    github_commits_30d: int = 0
    github_stars: int = 0
    test_coverage: Optional[float] = None
    
    # Quality indicators
    trend: Literal["up", "down", "stable"] = "stable"
    momentum_score: float = 0.0  # 0-100, higher = better
    quality_score: float = 0.0  # 0-100, based on tests + activity
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_synced_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        collection = "subnets"
        indexes = [
            [("category", 1)],
            [("market_cap_millions", -1)],
            [("apy", -1)],
            [("trend", 1)],
            [("updated_at", -1)],
        ]
