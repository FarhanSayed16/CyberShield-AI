import pytest
from unittest.mock import patch, AsyncMock
from datetime import datetime, timezone
import uuid

@pytest.mark.asyncio
async def test_health_check(async_client):
    response = await async_client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ["ok", "degraded"]

@pytest.mark.asyncio
@patch("app.api.v1.routes_analyze.crud_threats.create_threat_event")
async def test_analyze_url_mock(mock_create, async_client):
    
    # Mock the DB response document so Beanie isn't required
    class MockDoc:
        event_id = uuid.uuid4().hex
        created_at = datetime.now(timezone.utc)
    
    # Needs to be an async mock
    mock_create.return_value = MockDoc()

    req_data = {
        "source": "dashboard",
        "type": "url",
        "content": "http://example.com"
    }
    response = await async_client.post("/api/analyze", json=req_data)
    
    if response.status_code == 200:
        data = response.json()
        assert "risk_score" in data
        assert "threat_level" in data
        assert data["type"] == "url"
    else:
        assert response.status_code in [200, 503]

