"""
CyberSentinel AI — MongoDB Connection
Async connection via Motor + Beanie ODM initialization.
Supports STORAGE_BACKEND=memory (mongomock) for local AI Guard smoke tests.
"""

from __future__ import annotations

import certifi
from beanie import init_beanie
from loguru import logger
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.db.documents_org import ORG_DOCUMENT_MODELS
from app.db.models import ThreatEventDocument
from app.schemas.intel import IntelDocument
from app.schemas.rules import RuleDocument

_client = None


def get_motor_client():
    """Motor / mongomock client for health checks."""
    return _client


async def init_db():
    """Initialize MongoDB connection and Beanie ODM."""
    global _client
    try:
        document_models = [
            ThreatEventDocument,
            RuleDocument,
            IntelDocument,
            *ORG_DOCUMENT_MODELS,
        ]

        if (settings.STORAGE_BACKEND or "mongodb").strip().lower() == "memory":
            from mongomock_motor import AsyncMongoMockClient

            logger.info("STORAGE_BACKEND=memory — using mongomock")
            _client = AsyncMongoMockClient()
            db = _client[settings.DB_NAME]
            await init_beanie(database=db, document_models=document_models)
            logger.info("In-memory MongoDB (mongomock) ready ✓")
            return

        logger.info(f"Connecting to MongoDB: {settings.DB_NAME}")
        client_kwargs: dict = {"serverSelectionTimeoutMS": 5000}
        uri = settings.MONGODB_URI or ""
        if "mongodb+srv://" in uri or "atlas" in uri.lower() or "tls=true" in uri.lower() or "ssl=true" in uri.lower():
            client_kwargs["tlsCAFile"] = certifi.where()
            client_kwargs["tls"] = True
        _client = AsyncIOMotorClient(uri, **client_kwargs)
        await _client.admin.command("ping")
        await init_beanie(
            database=_client[settings.DB_NAME],
            document_models=document_models,
        )
        logger.info("MongoDB connection established ✓")
    except Exception as e:
        logger.warning(f"⚠️  MongoDB connection failed: {e}")
        logger.warning("⚠️  Server will run but DB operations will fail. Set a valid MONGODB_URI in .env")
        _client = None


async def close_db():
    """Close MongoDB connection."""
    global _client
    if _client and (settings.STORAGE_BACKEND or "").strip().lower() != "memory":
        _client.close()
        logger.info("MongoDB connection closed")
    _client = None


async def check_db_connection() -> bool:
    """Check if MongoDB is reachable."""
    try:
        if _client is None:
            return False
        if (settings.STORAGE_BACKEND or "").strip().lower() == "memory":
            return True
        await _client.admin.command("ping")
        return True
    except Exception:
        return False
