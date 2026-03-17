from pydantic import BaseModel, Field
from datetime import datetime

class ThreatReportRequest(BaseModel):
    url: str = Field(..., description="The context URL where the threat was detected")
    screenshot_base64: str = Field(..., description="Base64 encoded PNG of the threat")

class ThreatReportResponse(BaseModel):
    id: str
    url: str
    status: str
    message: str
    created_at: str
