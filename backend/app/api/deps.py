"""
CyberSentinel AI — Shared Dependencies
API-key (legacy Threat Explainer) + JWT / org-token (AI Workplace Guard).
"""

from __future__ import annotations

from typing import Union

from beanie import PydanticObjectId
from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import verify_api_key, check_rate_limit
from app.db.documents_org import Organization, User
from app.utils.auth_security import decode_access_token

security = HTTPBearer(auto_error=False)


async def require_auth(api_key: str = Depends(verify_api_key)):
    """Legacy: global X-API-Key + rate limiting (Threat Explainer transitional)."""
    check_rate_limit(api_key)
    return api_key


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(security),
) -> User:
    if not creds:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Missing token"}},
        )
    payload = decode_access_token(creds.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "TOKEN_EXPIRED", "message": "Invalid token"}},
        )
    try:
        user = await User.get(PydanticObjectId(payload["sub"]))
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "TOKEN_EXPIRED", "message": "Invalid token"}},
        ) from exc
    if not user or user.status == "suspended":
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Account suspended"}},
        )
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Admin only"}},
        )
    return user


async def require_manager_or_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("admin", "manager"):
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Insufficient permissions"}},
        )
    return user


async def get_org_from_header(
    x_org_token: str | None = Header(None, alias="X-Org-Token"),
) -> Organization:
    if not x_org_token:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Missing X-Org-Token"}},
        )
    org = await Organization.find_one(Organization.org_api_key == x_org_token)
    if not org:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Invalid org token"}},
        )
    return org


async def require_jwt_or_api_key(
    creds: HTTPAuthorizationCredentials | None = Depends(security),
    api_key: str | None = Header(None, alias="X-API-Key"),
    x_org_token: str | None = Header(None, alias="X-Org-Token"),
    x_user_token: str | None = Header(None, alias="X-User-Token"),
) -> Union[User, Organization, str]:
    """
    Prefer JWT (dashboard). Accept org/user tokens (extension). Fall back to
    legacy global API key for scripts.
    Returns User | Organization | str (api_key).
    """
    if creds and creds.credentials:
        payload = decode_access_token(creds.credentials)
        if payload and "sub" in payload:
            try:
                user = await User.get(PydanticObjectId(payload["sub"]))
            except Exception:
                user = None
            if user and user.status != "suspended":
                return user
    if x_org_token:
        org = await Organization.find_one(Organization.org_api_key == x_org_token)
        if not org:
            raise HTTPException(
                status_code=401,
                detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Invalid org token"}},
            )
        if x_user_token:
            user = await User.find_one(User.user_token == x_user_token, User.org_id == org.id)
            if user and user.status != "suspended":
                return user
        return org
    if api_key:
        from app.core.config import settings

        if api_key == settings.API_KEY:
            check_rate_limit(api_key)
            return api_key
        raise HTTPException(status_code=403, detail="Invalid API Key")
    raise HTTPException(
        status_code=401,
        detail={
            "error": {
                "code": "UNAUTHORIZED",
                "message": "JWT, X-Org-Token, or X-API-Key required",
            }
        },
    )


def principal_org_id(principal: Union[User, Organization, str]) -> str | None:
    if isinstance(principal, User):
        return str(principal.org_id)
    if isinstance(principal, Organization):
        return str(principal.id)
    return None


def require_org_id(principal: Union[User, Organization, str]) -> str:
    """Tenant-scoped routes: JWT or org token required (not bare API key)."""
    org_id = principal_org_id(principal)
    if not org_id:
        raise HTTPException(
            status_code=403,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "JWT or X-Org-Token required for organization-scoped data",
                }
            },
        )
    return org_id


def assert_threat_org_access(principal: Union[User, Organization, str], doc_org_id: str | None) -> None:
    """404 if JWT/org principal cannot access this threat document."""
    org_id = principal_org_id(principal)
    if org_id is None:
        raise HTTPException(
            status_code=403,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "JWT or X-Org-Token required for organization-scoped data",
                }
            },
        )
    if not doc_org_id or doc_org_id != org_id:
        raise HTTPException(status_code=404, detail="Threat event not found")
