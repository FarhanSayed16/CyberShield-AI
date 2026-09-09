"""JWT / password / org-user token helpers (AI Workplace Guard)."""

from __future__ import annotations

import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

_JWT_ALG = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=_JWT_ALG)


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[_JWT_ALG])
    except JWTError:
        return None


def generate_org_api_key() -> str:
    return f"aisnl_org_{secrets.token_urlsafe(24)}"


def generate_user_token() -> str:
    return f"aisnl_usr_{secrets.token_urlsafe(24)}"


def generate_invite_token() -> str:
    return secrets.token_urlsafe(32)


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "", name.lower())
    return slug[:50] or "org"


def oid_str(oid: Any) -> str:
    return str(oid)
