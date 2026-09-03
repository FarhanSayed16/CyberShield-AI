import pytest
import pytest_asyncio

# Lazy imports so schema-only unit tests can load even if the ASGI app
# is unavailable in a broken local env; fixtures still need a working stack.


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture(loop_scope="session")
async def async_client():
    from httpx import AsyncClient, ASGITransport
    from app.main import app
    from app.core.config import settings

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        client.headers.update({"x-api-key": settings.API_KEY})
        yield client

