"""
CyberSentinel AI — WebSocket Routes
Real-time push notifications for threat events (org-scoped rooms).
"""

from __future__ import annotations

import json
from typing import Dict, List, Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
from loguru import logger

from app.core.config import settings
from app.db.documents_org import Organization, User
from app.utils.auth_security import decode_access_token
from beanie import PydanticObjectId

router = APIRouter()


class ConnectionManager:
    """Org-scoped WebSocket fan-out — never broadcast across tenants."""

    def __init__(self):
        self._by_org: Dict[str, List[WebSocket]] = {}
        self._conn_org: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, org_id: str):
        await websocket.accept()
        self._conn_org[websocket] = org_id
        self._by_org.setdefault(org_id, []).append(websocket)
        logger.info(f"WS client connected org={org_id}. Total: {len(self._conn_org)}")

    def disconnect(self, websocket: WebSocket):
        org_id = self._conn_org.pop(websocket, None)
        if org_id and org_id in self._by_org:
            self._by_org[org_id] = [c for c in self._by_org[org_id] if c is not websocket]
            if not self._by_org[org_id]:
                del self._by_org[org_id]
        logger.info(f"WS client disconnected. Total: {len(self._conn_org)}")

    async def broadcast(self, message: dict, org_id: Optional[str] = None):
        """Send to one org only. Unscoped messages are dropped (no cross-tenant leak)."""
        if not org_id:
            logger.warning("WS broadcast skipped: missing org_id")
            return
        dead: List[WebSocket] = []
        payload = json.dumps(message, default=str)
        for connection in list(self._by_org.get(org_id, [])):
            try:
                await connection.send_text(payload)
            except Exception:
                dead.append(connection)
        for conn in dead:
            self.disconnect(conn)


ws_manager = ConnectionManager()


async def _ws_org_id(*, api_key: str, token: str, org_token: str) -> Optional[str]:
    """Resolve org_id for a WS connection. Bare API key alone is rejected."""
    if token:
        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            if payload.get("org_id"):
                return str(payload["org_id"])
            try:
                user = await User.get(PydanticObjectId(payload["sub"]))
            except Exception:
                user = None
            if user and user.status != "suspended":
                return str(user.org_id)
    if org_token:
        org = await Organization.find_one(Organization.org_api_key == org_token)
        if org:
            return str(org.id)
    # Legacy API key alone has no org — do not allow unscoped WS
    if api_key and api_key == settings.API_KEY:
        return None
    return None


@router.websocket("/ws/threats")
async def websocket_endpoint(
    websocket: WebSocket,
    api_key: str = Query(default=""),
    token: str = Query(default=""),
    org_token: str = Query(default=""),
):
    """Auth via JWT `token` or `org_token`. Org-scoped rooms only."""
    org_id = await _ws_org_id(api_key=api_key, token=token, org_token=org_token)
    if not org_id:
        logger.warning("WS connection rejected: missing org scope or invalid credentials")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect(websocket, org_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WS error: {e}")
        ws_manager.disconnect(websocket)
