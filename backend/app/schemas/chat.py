"""
CyberSentinel AI — Chat Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional

class ChatRequest(BaseModel):
    prompt: str = Field(..., description="The user's question or command.")
    url_context: Optional[str] = Field(None, description="The URL of the page the user is currently viewing.")

class ChatResponse(BaseModel):
    response: str = Field(..., description="The markdown-formatted response from CyberSentinel AI.")
