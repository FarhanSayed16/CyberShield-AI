import redis.asyncio as redis

from app.core.config import settings

_pool: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    global _pool
    if _pool is None:
        _pool = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=1.5,
            socket_timeout=1.5,
        )
    return _pool


async def check_rate_limit(key: str, limit: int, window_sec: int = 60) -> bool:
    """Returns True if under limit, False if rate limited."""
    try:
        r = await get_redis()
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, window_sec)
        return count <= limit
    except Exception:
        return True
