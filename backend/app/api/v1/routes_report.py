"""
CyberSentinel AI — Threat Report Route
POST /api/report — Endpoint for receiving manual threat reports + screenshots from the extension.
"""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends
from loguru import logger

from app.api.deps import principal_org_id, require_jwt_or_api_key
from app.schemas.report import ThreatReportRequest, ThreatReportResponse

router = APIRouter()


@router.post("/report", response_model=ThreatReportResponse)
async def submit_threat_report(
    request: ThreatReportRequest,
    principal=Depends(require_jwt_or_api_key),
):
    """
    Accept a user-generated threat report with a screenshot.

    v1 does not persist screenshot blobs (no S3/GCS). Returns an accepted id for UX.
    """
    org_id = principal_org_id(principal)
    report_id = f"report-{uuid4().hex[:8]}"
    logger.info(
        f"Threat report accepted id={report_id} org={org_id} url_len={len(request.url or '')} "
        f"persisted=false"
    )

    return ThreatReportResponse(
        id=report_id,
        url=request.url,
        status="accepted_unpersisted",
        message=(
            "Report accepted. Screenshot is not stored long-term in v1 "
            "(no object storage configured)."
        ),
        created_at=datetime.now(timezone.utc).isoformat(),
    )
