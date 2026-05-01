"""
Public API routes (no authentication required)
"""

from fastapi import APIRouter, Request, status, Query
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
import structlog
from datetime import datetime
from typing import Optional

from models import Subnet, SubnetNews, ResearchArticle, Lesson, PriceHistory
from schemas import (
    StatsResponse,
    SubnetsResponse,
    SubnetResponse,
    NewsListResponse,
    SubnetNewsResponse,
    ResearchListResponse,
    ResearchArticleResponse,
    LessonListResponse,
    LessonResponse,
)
from dependencies import get_database

logger = structlog.get_logger(__name__)

router = APIRouter(tags=["public"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/api/stats", response_model=dict)
@limiter.limit("100/minute")
async def get_stats(request: Request):
    """Get current ecosystem statistics (TAO price, market cap, active subnets)"""
    try:
        # Get subnets count
        subnets_count = await Subnet.count()
        
        # Get total market cap (sum of all subnet market caps)
        subnets = await Subnet.find().to_list(None)
        total_ecosystem_mc = sum(s.market_cap_millions for s in subnets) * 1_000_000
        
        # Fetch latest TAO price from PriceHistory (written by PriceService every 5 min)
        latest_price = await PriceHistory.find(
            PriceHistory.symbol == "TAO"
        ).sort([("timestamp", -1)]).first_or_none()

        tao_price = latest_price.close if latest_price else 0.0
        market_cap = latest_price.market_cap if latest_price else 0.0
        volume_24h = latest_price.volume_24h if latest_price else 0.0

        return {
            "status": "success",
            "data": {
                "tao_price": tao_price,
                "market_cap": market_cap,
                "volume_24h": volume_24h,
                "tao_price_change_24h": 0.0,
                "active_subnets": subnets_count,
                "total_ecosystem_mc": total_ecosystem_mc,
                "timestamp": datetime.utcnow().isoformat(),
            },
        }
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        return {
            "status": "error",
            "message": "Failed to fetch statistics",
            "code": "STATS_ERROR",
        }


@router.get("/api/subnets", response_model=dict)
@limiter.limit("100/minute")
async def get_subnets(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    sort_by: str = Query("market_cap_millions", regex="^(market_cap_millions|apy|validators_count|updated_at)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
):
    """Get all active subnets with optional filtering and sorting"""
    try:
        query = Subnet.find()
        
        if category:
            query = query.where(Subnet.category == category)
        
        # Sort
        sort_direction = 1 if sort_order == "asc" else -1
        query = query.sort([(sort_by, sort_direction)])
        
        # Count total
        total = await Subnet.count()
        
        # Paginate
        subnets = await query.skip(skip).limit(limit).to_list(None)
        
        # Convert to response format
        data = [
            SubnetResponse(
                id=s.id,
                name=s.name,
                category=s.category,
                icon=s.icon,
                market_cap_millions=s.market_cap_millions,
                daily_emission=s.daily_emission,
                apy=s.apy,
                validators_count=s.validators_count,
                trend=s.trend,
                updated_at=s.updated_at,
            )
            for s in subnets
        ]
        
        return {
            "status": "success",
            "data": [d.model_dump() for d in data],
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + limit) < total,
            },
        }
    except Exception as e:
        logger.error(f"Error fetching subnets: {e}")
        return {
            "status": "error",
            "message": "Failed to fetch subnets",
            "code": "SUBNETS_ERROR",
        }


@router.get("/api/subnets/{subnet_id}", response_model=dict)
@limiter.limit("100/minute")
async def get_subnet_detail(request: Request, subnet_id: int):
    """Get detailed information about a specific subnet"""
    try:
        subnet = await Subnet.find_one(Subnet.id == subnet_id)
        
        if not subnet:
            return {
                "status": "error",
                "message": f"Subnet {subnet_id} not found",
                "code": "NOT_FOUND",
            }
        
        # Get recent news for this subnet
        news = await SubnetNews.find(SubnetNews.subnet_id == subnet_id).limit(5).to_list(None)
        
        return {
            "status": "success",
            "data": {
                "subnet": {
                    "id": subnet.id,
                    "name": subnet.name,
                    "category": subnet.category,
                    "market_cap_millions": subnet.market_cap_millions,
                    "apy": subnet.apy,
                    "validators_count": subnet.validators_count,
                    "github_url": subnet.github_url,
                    "github_commits_30d": subnet.github_commits_30d,
                    "test_coverage": subnet.test_coverage,
                    "momentum_score": subnet.momentum_score,
                    "quality_score": subnet.quality_score,
                },
                "recent_news": [
                    {
                        "title": n.title,
                        "url": n.url,
                        "source": n.source,
                        "published_at": n.published_at.isoformat(),
                    }
                    for n in news
                ],
            },
        }
    except Exception as e:
        logger.error(f"Error fetching subnet {subnet_id}: {e}")
        return {
            "status": "error",
            "message": "Failed to fetch subnet details",
            "code": "SUBNET_ERROR",
        }


@router.get("/api/news", response_model=dict)
@limiter.limit("100/minute")
async def get_news(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    category: Optional[str] = None,
):
    """Get curated news feed"""
    try:
        query = SubnetNews.find().sort([("published_at", -1)])
        
        if category:
            query = query.where(SubnetNews.category == category)
        
        total = await SubnetNews.count()
        news_items = await query.skip(skip).limit(limit).to_list(None)
        
        return {
            "status": "success",
            "data": [
                {
                    "title": n.title,
                    "url": n.url,
                    "source": n.source,
                    "category": n.category,
                    "content_excerpt": n.content_excerpt,
                    "image_url": n.image_url,
                    "published_at": n.published_at.isoformat(),
                    "relevance_score": n.relevance_score,
                }
                for n in news_items
            ],
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + limit) < total,
            },
        }
    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        return {
            "status": "error",
            "message": "Failed to fetch news",
            "code": "NEWS_ERROR",
        }


@router.get("/api/research", response_model=dict)
@limiter.limit("100/minute")
async def get_research(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    category: Optional[str] = None,
):
    """Get research articles and analysis"""
    try:
        query = ResearchArticle.find().sort([("published_date", -1)])
        
        if category:
            query = query.where(ResearchArticle.category == category)
        
        total = await ResearchArticle.count()
        articles = await query.skip(skip).limit(limit).to_list(None)
        
        return {
            "status": "success",
            "data": [
                {
                    "title": a.title,
                    "category": a.category,
                    "icon": a.icon,
                    "excerpt": a.excerpt,
                    "content": a.content[:500],  # Truncate for list view
                    "author": a.author,
                    "tags": a.tags,
                    "published_date": a.published_date.isoformat(),
                }
                for a in articles
            ],
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + limit) < total,
            },
        }
    except Exception as e:
        logger.error(f"Error fetching research: {e}")
        return {
            "status": "error",
            "message": "Failed to fetch research",
            "code": "RESEARCH_ERROR",
        }


@router.get("/api/lessons", response_model=dict)
@limiter.limit("100/minute")
async def get_lessons(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    level: Optional[str] = None,
):
    """Get educational lessons"""
    try:
        query = Lesson.find().sort([("created_at", -1)])
        
        if level:
            query = query.where(Lesson.level == level)
        
        total = await Lesson.count()
        lessons = await query.skip(skip).limit(limit).to_list(None)
        
        return {
            "status": "success",
            "data": [
                {
                    "title": l.title,
                    "category": l.category,
                    "level": l.level,
                    "duration_minutes": l.duration_minutes,
                    "content": l.content[:500],  # Truncate for list view
                    "key_takeaways": l.key_takeaways,
                }
                for l in lessons
            ],
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + limit) < total,
            },
        }
    except Exception as e:
        logger.error(f"Error fetching lessons: {e}")
        return {
            "status": "error",
            "message": "Failed to fetch lessons",
            "code": "LESSONS_ERROR",
        }

@router.post("/api/request-access")
@limiter.limit("10/minute")
async def request_access(request: Request, body: dict):
    """Request temporary access"""
    email = body.get("email", "").lower().strip()
    logger.info("Access request received", email=email, ip=request.client.host)
    return {
        "success": True,
        "message": f"Access request submitted for {email}",
        "email": email,
    }
