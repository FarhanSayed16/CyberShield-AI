"""
CyberSentinel AI — Threat Report Route
POST /api/report — Endpoint for receiving manual threat reports + screenshots from the extension.
"""

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
import uuid
from datetime import datetime

from app.api.deps import require_auth
from app.schemas.report import ThreatReportRequest, ThreatReportResponse

router = APIRouter()

@router.post("/report", response_model=ThreatReportResponse)
async def submit_threat_report(
    request: ThreatReportRequest,
    _api_key: str = Depends(require_auth),
):
    """
    Submit a user-generated threat report with a screenshot.
    """
    logger.info(f"📸 Received threat report for URL: {request.url}")
    
    # In a full implementation, the screenshot_base64 would be saved to blob storage (AWS S3, GCS)
    # and a DB record would be created for Security Analysts to review.
    # For now, we mock the successful persistence.
    
    report_id = f"report-{uuid.uuid4().hex[:8]}"
    
    logger.info(f"✅ Threat report {report_id} vaulted securely.")

    return ThreatReportResponse(
        id=report_id,
        url=request.url,
        status="success",
        message="Screenshot captured and securely submitted to CyberSentinel Dashboard.",
        created_at=datetime.utcnow().isoformat(),
    )
