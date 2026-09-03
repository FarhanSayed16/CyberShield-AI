"""
CyberSentinel AI — MongoDB Connection
Async connection via Motor + Beanie ODM initialization.
"""

import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from loguru import logger

from app.core.config import settings
from app.db.models import ThreatEventDocument
from app.schemas.rules import RuleDocument
from app.schemas.intel import IntelDocument

_client: AsyncIOMotorClient | None = None


async def init_db():
    """Initialize MongoDB connection and Beanie ODM."""
    global _client
    try:
        logger.info(f"Connecting to MongoDB: {settings.DB_NAME}")
        client_kwargs: dict = {"serverSelectionTimeoutMS": 5000}
        # Atlas / SRV URIs need CA bundle; local mongodb:// usually does not
        uri = settings.MONGODB_URI or ""
        if "mongodb+srv://" in uri or "atlas" in uri.lower() or "tls=true" in uri.lower():
            client_kwargs["tlsCAFile"] = certifi.where()
        _client = AsyncIOMotorClient(uri, **client_kwargs)
        # Test the connection
        await _client.admin.command("ping")
        await init_beanie(
            database=_client[settings.DB_NAME],
            document_models=[ThreatEventDocument, RuleDocument, IntelDocument],
        )
        logger.info("MongoDB connection established ✓")
    except Exception as e:
        logger.warning(f"⚠️  MongoDB connection failed: {e}")
        logger.warning("⚠️  Server will run but DB operations will fail. Set a valid MONGODB_URI in .env")
        _client = None


async def close_db():
    """Close MongoDB connection."""
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed")


async def check_db_connection() -> bool:
    """Check if MongoDB is reachable."""
    try:
        if _client:
            await _client.admin.command("ping")
            return True
    except Exception:
        return False
    return False
