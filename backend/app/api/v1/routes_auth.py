from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.db.documents_org import InviteToken, Organization, User
from app.schemas.ai_guard import AcceptInviteRequest, LoginRequest, SignupRequest
from app.api.v1.serializers_org import org_public, user_public
from app.utils.auth_security import (
    create_access_token,
    generate_invite_token,
    generate_org_api_key,
    generate_user_token,
    hash_password,
    slugify,
    verify_password,
)
from app.services.plans import trial_end_default

router = APIRouter()


def _login_response(user: User, org: Organization) -> dict:
    token = create_access_token({"sub": str(user.id), "org_id": str(org.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 86400,
        "user": {**user_public(user), "org_name": org.name},
    }


@router.post("/signup", status_code=201)
async def signup(body: SignupRequest):
    email = body.email.lower()
    existing_user = await User.find_one(User.email == email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "VALIDATION_ERROR", "message": "Email already registered"}},
        )

    slug = slugify(body.org_name)
    existing = await Organization.find_one(Organization.slug == slug)
    if existing:
        slug = f"{slug}{int(datetime.utcnow().timestamp()) % 10000}"

    org = Organization(
        name=body.org_name,
        slug=slug,
        org_api_key=generate_org_api_key(),
        plan="trial",
        trial_ends_at=trial_end_default(14),
        settings={
            "alert_email": email,
            "daily_digest": True,
            "retention_days": 90,
            "dlp_sensitivity": "medium",
            "notify_on_critical": True,
        },
    )
    await org.insert()

    user = User(
        org_id=org.id,
        email=email,
        name=body.name,
        hashed_password=hash_password(body.password),
        role="admin",
        user_token=generate_user_token(),
        status="active",
    )
    await user.insert()

    resp = _login_response(user, org)
    resp["user"] = user_public(user)
    resp["org"] = org_public(org)
    return resp


@router.post("/login")
async def login(body: LoginRequest):
    user = await User.find_one(User.email == body.email.lower())
    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Email or password is incorrect."}},
        )
    if user.status == "suspended":
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Account suspended"}},
        )
    org = await Organization.get(user.org_id)
    user.last_active_at = datetime.utcnow()
    await user.save()
    return _login_response(user, org)


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    org = await Organization.get(user.org_id)
    return {
        **user_public(user),
        "org_name": org.name if org else None,
    }


@router.post("/accept-invite")
async def accept_invite(body: AcceptInviteRequest):
    invite = await InviteToken.find_one(InviteToken.token == body.token)
    if not invite or invite.used_at:
        raise HTTPException(status_code=400, detail={"error": {"code": "NOT_FOUND", "message": "Invalid invite"}})
    if invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail={"error": {"code": "VALIDATION_ERROR", "message": "Invite expired"}})

    existing = await User.find_one(User.org_id == invite.org_id, User.email == invite.email.lower())
    if existing and existing.status == "active":
        raise HTTPException(status_code=400, detail={"error": {"code": "VALIDATION_ERROR", "message": "Already registered"}})

    if existing:
        user = existing
        user.name = body.name
        user.hashed_password = hash_password(body.password)
        user.status = "active"
        if not user.user_token or user.user_token.startswith("pending_"):
            user.user_token = generate_user_token()
        await user.save()
    else:
        user = User(
            org_id=invite.org_id,
            email=invite.email.lower(),
            name=body.name,
            hashed_password=hash_password(body.password),
            role=invite.role,
            user_token=generate_user_token(),
            status="active",
        )
        await user.insert()

    invite.used_at = datetime.utcnow()
    await invite.save()

    org = await Organization.get(invite.org_id)
    return _login_response(user, org)
