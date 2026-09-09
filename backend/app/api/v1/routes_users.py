from datetime import datetime, timedelta

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user, require_admin
from app.db.documents_org import InviteToken, Organization, User
from app.schemas.ai_guard import InviteUserRequest
from app.api.v1.serializers_org import user_public
from app.utils.auth_security import generate_invite_token
from app.core.config import settings
from app.services.plans import assert_seat_available

router = APIRouter()


@router.get("")
async def list_users(_: User = Depends(require_admin)):
    users = await User.find(User.org_id == _.org_id).to_list()
    return {"users": [user_public(u) for u in users]}


@router.post("/invite", status_code=201)
async def invite_user(body: InviteUserRequest, admin: User = Depends(require_admin)):
    org = await Organization.get(admin.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    await assert_seat_available(org)

    existing = await User.find_one(User.org_id == admin.org_id, User.email == body.email.lower())
    if existing and existing.status == "active":
        raise HTTPException(status_code=400, detail={"error": {"code": "VALIDATION_ERROR", "message": "User exists"}})

    token = generate_invite_token()
    invite = InviteToken(
        org_id=admin.org_id,
        email=body.email.lower(),
        token=token,
        invited_by=admin.id,
        role=body.role,
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    await invite.insert()

    if not existing:
        pending = User(
            org_id=admin.org_id,
            email=body.email.lower(),
            name=body.email.split("@")[0],
            role=body.role,
            user_token=f"pending_{token[:12]}",
            status="pending",
        )
        await pending.insert()

    frontend = (settings.FRONTEND_URL or "http://localhost:5173").rstrip("/")
    return {
        "invite_token": token,
        "email": body.email,
        "expires_at": invite.expires_at.isoformat(),
        "accept_url": f"{frontend}/accept-invite?token={token}",
        "email_delivery": "manual",
        "note": "v1 does not send email — copy the accept URL or token to the employee.",
    }


@router.delete("/{user_id}", status_code=204)
async def remove_user(user_id: str, admin: User = Depends(require_admin)):
    try:
        u = await User.get(PydanticObjectId(user_id))
    except Exception:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "User not found"}})
    if not u or u.org_id != admin.org_id:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "User not found"}})
    if u.id == admin.id:
        raise HTTPException(status_code=400, detail={"error": {"code": "VALIDATION_ERROR", "message": "Cannot remove self"}})
    await u.delete()
