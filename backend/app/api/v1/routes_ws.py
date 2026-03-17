"""
CyberSentinel AI — WebSocket Routes
Real-time push notifications for threat events.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from loguru import logger
import json
from typing import List
import asyncio

router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections and broadcasts messages."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WS client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WS client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Send a JSON message to all connected clients."""
        dead_connections = []
        payload = json.dumps(message, default=str)
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                dead_connections.append(connection)
        # Clean up dead connections
        for conn in dead_connections:
            self.disconnect(conn)


# Singleton instance — imported by crud_threats.py to broadcast
ws_manager = ConnectionManager()


@router.websocket("/ws/threats")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive; client can send pings
            data = await websocket.receive_text()
            # Echo back as heartbeat acknowledgment
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except asyncio.CancelledError:
        ws_manager.disconnect(websocket)
        logger.warning("WebSocket client abruptly disconnected (CancelledError)")
    except Exception as e:
        ws_manager.disconnect(websocket)
        logger.error(f"WebSocket Error: {e}")
