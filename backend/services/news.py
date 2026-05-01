"""News aggregation service - fetches ecosystem news from various sources."""

import asyncio
from datetime import datetime, timedelta
from typing import List, Optional
import hashlib

import aiohttp
import structlog
from models.news import SubnetNews

from .base import BaseService, SyncStatus

logger = structlog.get_logger(__name__)


class NewsService(BaseService):
    """Service for aggregating Bittensor ecosystem news."""

    service_name = "research_news"
    interval_minutes = 30

    def __init__(self):
        """Initialize news service."""
        super().__init__()
        self.timeout = aiohttp.ClientTimeout(total=30)

    async def run(self) -> None:
        """Fetch and aggregate news from multiple sources."""
        start_time = datetime.utcnow()
        records_created = 0

        try:
            await self.update_sync_state(SyncStatus.RUNNING)
            await self.log_sync("news_sync_started")

            # Fetch from multiple sources
            all_news = await self._fetch_from_all_sources()
            await self.log_sync(
                "news_fetched",
                count=len(all_news),
            )

            # Store news articles
            created = await self._store_news_articles(all_news)
            records_created = created

            duration = (datetime.utcnow() - start_time).total_seconds()

            await self.update_sync_state(
                status=SyncStatus.SUCCESS,
                records_processed=len(all_news),
                records_created=records_created,
                duration_seconds=duration,
            )
            await self.log_sync(
                "news_sync_complete",
                articles_created=records_created,
                duration_seconds=duration,
            )

        except Exception as e:
            duration = (datetime.utcnow() - start_time).total_seconds()
            await self.update_sync_state(
                status=SyncStatus.FAILED,
                error=str(e),
                duration_seconds=duration,
            )
            await self.log_sync(
                "news_sync_failed",
                level="error",
                error=str(e),
            )

    async def _fetch_from_all_sources(self) -> List[dict]:
        """Fetch news from multiple sources.
        
        Returns:
            List of news articles with title, url, source, content, published_at
        """
        all_news = []

        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                # Note: In production, these would come from real news APIs
                # For now, we're generating sample news
                sample_news = await self._generate_sample_news()
                all_news.extend(sample_news)

        except Exception as e:
            await self.log_sync(
                "news_fetch_error",
                level="warning",
                error=str(e),
            )

        return all_news

    async def _generate_sample_news(self) -> List[dict]:
        """Generate sample news for development/fallback.
        
        Returns:
            List of sample news articles
        """
        now = datetime.utcnow()

        return [
            {
                "title": "Bittensor Reaches New Milestone: 58 Active Subnets",
                "url": "https://example.com/bittensor-58-subnets",
                "source": "Bittensor Foundation",
                "category": "ecosystem",
                "content_excerpt": (
                    "The Bittensor network continues to grow with new subnets "
                    "launching regularly. The ecosystem now supports 58 active subnets..."
                ),
                "published_at": now - timedelta(hours=6),
                "relevance_score": 0.95,
            },
            {
                "title": "Validator Rewards: Understanding APY Calculations",
                "url": "https://example.com/validator-rewards",
                "source": "Subnet Operations",
                "category": "technical",
                "content_excerpt": (
                    "A deep dive into how validator rewards are calculated and "
                    "maximized in the Bittensor network..."
                ),
                "published_at": now - timedelta(hours=12),
                "relevance_score": 0.88,
            },
            {
                "title": "TAO Token Price Analysis: Market Trends",
                "url": "https://example.com/tao-price-analysis",
                "source": "Market Analysis",
                "category": "market",
                "content_excerpt": (
                    "Recent price movements in the TAO token reflect growing "
                    "institutional interest in the Bittensor ecosystem..."
                ),
                "published_at": now - timedelta(hours=24),
                "relevance_score": 0.82,
            },
        ]

    async def _store_news_articles(self, articles: List[dict]) -> int:
        """Store news articles, avoiding duplicates.
        
        Args:
            articles: List of news articles to store
            
        Returns:
            Number of new articles created
        """
        created_count = 0

        for article in articles:
            try:
                # Generate hash for deduplication
                article_hash = self._hash_article(article)

                # Check if article already exists
                existing = await SubnetNews.find_one(
                    SubnetNews.url == article.get("url")
                )

                if existing:
                    # Update existing article with new data if needed
                    existing.title = article.get("title", existing.title)
                    existing.relevance_score = article.get(
                        "relevance_score", existing.relevance_score
                    )
                    await existing.save()
                else:
                    # Create new article
                    news = SubnetNews(
                        title=article.get("title"),
                        url=article.get("url"),
                        source=article.get("source"),
                        category=article.get("category", "general"),
                        content_excerpt=article.get("content_excerpt"),
                        published_at=article.get("published_at", datetime.utcnow()),
                        relevance_score=article.get("relevance_score", 0.5),
                    )
                    await news.insert()
                    created_count += 1

                    await self.log_sync(
                        "article_created",
                        title=article.get("title"),
                        source=article.get("source"),
                    )

            except Exception as e:
                await self.log_sync(
                    "article_storage_error",
                    level="warning",
                    title=article.get("title"),
                    error=str(e),
                )

        return created_count

    @staticmethod
    def _hash_article(article: dict) -> str:
        """Generate hash for article deduplication.
        
        Args:
            article: Article data
            
        Returns:
            Hash of article content
        """
        content = f"{article.get('title')}{article.get('url')}"
        return hashlib.sha256(content.encode()).hexdigest()
