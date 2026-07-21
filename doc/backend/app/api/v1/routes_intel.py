import hashlib
from fastapi import APIRouter, Depends
from typing import List
from app.api.deps import require_auth
from app.schemas.intel import IntelIndicatorCreate, IntelIndicatorResponse, IntelIndicatorBase
from app.db import crud_intel

router = APIRouter()

@router.post("/share", response_model=IntelIndicatorResponse)
async def share_intel(
    intel_in: IntelIndicatorCreate,
    _api_key: str = Depends(require_auth),
):
    """
    Share a threat indicator with the federated network.
    If 'raw_indicator' is provided, it will be hashed using SHA-256 before storage.
    """
    # Anonymize raw indicator if present
    final_hash = intel_in.indicator_hash
    if intel_in.raw_indicator:
        final_hash = hashlib.sha256(intel_in.raw_indicator.encode('utf-8')).hexdigest()
        
    base_data = IntelIndicatorBase(
        indicator_hash=final_hash,
        threat_type=intel_in.threat_type,
        threat_level=intel_in.threat_level,
        source_identifier=intel_in.source_identifier
    )
    
    doc = await crud_intel.add_intel_indicator(base_data)
    
    return IntelIndicatorResponse(
        id=str(doc.id),
        indicator_hash=doc.indicator_hash,
        threat_type=doc.threat_type,
        threat_level=doc.threat_level,
        source_identifier=doc.source_identifier,
        reported_at=doc.reported_at
    )

@router.get("/feed", response_model=List[IntelIndicatorResponse])
async def get_intel_feed(
    limit: int = 50,
    _api_key: str = Depends(require_auth),
):
    """
    Retrieve the latest federated threat intelligence feed.
    """
    docs = await crud_intel.get_recent_intel(limit)
    return [
        IntelIndicatorResponse(
            id=str(doc.id),
            indicator_hash=doc.indicator_hash,
            threat_type=doc.threat_type,
            threat_level=doc.threat_level,
            source_identifier=doc.source_identifier,
            reported_at=doc.reported_at
        ) for doc in docs
    ]
