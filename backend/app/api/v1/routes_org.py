from datetime import datetime

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user, require_admin
from app.db.documents_org import Alert, DLPCustomPattern, Event, Organization, User
from app.schemas.ai_guard import DLPPatternCreate, OrgPoliciesUpdate, OrgSettingsUpdate
from app.api.v1.serializers_org import org_public
from app.utils.auth_security import generate_org_api_key

router = APIRouter()

DEFAULT_FEATURES = {
    "jit_training": False,
    "local_audit": False,
    "anonymization": False,
    "clipboard_lineage": False,
    "shadow_ai_detection": False,
    "policy_cache": True,
}


def _policy_bundle(org: Organization) -> dict:
    s = org.settings or {}
    return {
        "policy_version": s.get("policy_version", "pol_v1"),
        "dlp_sensitivity": s.get("dlp_sensitivity", "medium"),
        "jit_mode": s.get("jit_mode", "off"),
        "anonymize_mode": s.get("anonymize_mode", "off"),
        "shadow_ai_threshold": s.get("shadow_ai_threshold", 65),
        "sensitive_domains": s.get("sensitive_domains", []),
        "ai_allowlist": s.get("ai_allowlist", []),
        "features": {**DEFAULT_FEATURES, **(s.get("features") or {})},
    }


@router.get("")
async def get_org(current: User = Depends(get_current_user)):
    org = await Organization.get(current.org_id)
    prompts_today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    prompts_today = await Event.find(
        Event.org_id == org.id,
        Event.captured_at >= prompts_today_start,
    ).count()
    total_users = await User.find(User.org_id == org.id).count()
    alerts_open = await Alert.find(Alert.org_id == org.id, Alert.status == "open").count()
    data = org_public(org)
    data["stats"] = {
        "total_users": total_users,
        "prompts_today": prompts_today,
        "alerts_open": alerts_open,
    }
    data["policies"] = _policy_bundle(org)
    return data


@router.patch("")
async def update_org(body: OrgSettingsUpdate, admin: User = Depends(require_admin)):
    org = await Organization.get(admin.org_id)
    if body.name:
        org.name = body.name
    if body.settings:
        org.settings = {**org.settings, **body.settings}
    org.updated_at = datetime.utcnow()
    await org.save()
    return org_public(org)


@router.get("/policies")
async def get_policies(current: User = Depends(get_current_user)):
    org = await Organization.get(current.org_id)
    return _policy_bundle(org)


@router.put("/policies")
async def update_policies(body: OrgPoliciesUpdate, admin: User = Depends(require_admin)):
    org = await Organization.get(admin.org_id)
    settings = dict(org.settings or {})
    if body.dlp_sensitivity is not None:
        settings["dlp_sensitivity"] = body.dlp_sensitivity
    if body.jit_mode is not None:
        settings["jit_mode"] = body.jit_mode
    if body.anonymize_mode is not None:
        settings["anonymize_mode"] = body.anonymize_mode
    if body.features is not None:
        settings["features"] = {**DEFAULT_FEATURES, **(settings.get("features") or {}), **body.features}
    if body.sensitive_domains is not None:
        settings["sensitive_domains"] = body.sensitive_domains
    if body.ai_allowlist is not None:
        settings["ai_allowlist"] = body.ai_allowlist
    settings["policy_version"] = f"pol_{int(datetime.utcnow().timestamp())}"
    org.settings = settings
    org.updated_at = datetime.utcnow()
    await org.save()
    return _policy_bundle(org)


@router.get("/dlp-patterns")
async def list_dlp_patterns(admin: User = Depends(require_admin)):
    patterns = await DLPCustomPattern.find(DLPCustomPattern.org_id == admin.org_id).to_list()
    return {
        "patterns": [
            {
                "id": str(p.id),
                "name": p.name,
                "pattern": p.pattern,
                "severity": p.severity,
                "description": p.description,
                "is_active": p.is_active,
            }
            for p in patterns
        ]
    }


@router.post("/dlp-patterns", status_code=201)
async def create_dlp_pattern(body: DLPPatternCreate, admin: User = Depends(require_admin)):
    import re

    try:
        re.compile(body.pattern)
    except re.error as e:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_PATTERN", "message": str(e)}},
        )
    p = DLPCustomPattern(
        org_id=admin.org_id,
        name=body.name,
        pattern=body.pattern,
        severity=body.severity,
        description=body.description,
        created_by=admin.id,
    )
    await p.insert()
    return {"id": str(p.id), "name": p.name, "pattern": p.pattern, "severity": p.severity}


@router.delete("/dlp-patterns/{pattern_id}")
async def delete_dlp_pattern(pattern_id: str, admin: User = Depends(require_admin)):
    try:
        p = await DLPCustomPattern.get(PydanticObjectId(pattern_id))
    except Exception:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Pattern not found"}})
    if not p or p.org_id != admin.org_id:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Pattern not found"}})
    await p.delete()
    return {"deleted": True}


@router.put("/sensitive-domains")
async def update_sensitive_domains(body: dict, admin: User = Depends(require_admin)):
    org = await Organization.get(admin.org_id)
    settings = dict(org.settings or {})
    settings["sensitive_domains"] = body.get("domains", [])
    org.settings = settings
    org.updated_at = datetime.utcnow()
    await org.save()
    return {"domains": settings["sensitive_domains"]}


@router.post("/regenerate-key")
async def regenerate_key(admin: User = Depends(require_admin)):
    org = await Organization.get(admin.org_id)
    org.org_api_key = generate_org_api_key()
    org.updated_at = datetime.utcnow()
    await org.save()
    return {"org_api_key": org.org_api_key}
