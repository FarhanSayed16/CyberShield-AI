from fastapi import APIRouter, Depends

from app.api.deps import get_org_from_header
from app.db.documents_org import Organization
from app.api.v1.routes_org import _policy_bundle

router = APIRouter()


@router.get("/cache")
async def policy_cache(org: Organization = Depends(get_org_from_header)):
    return _policy_bundle(org)
