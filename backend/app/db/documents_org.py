"""Organization / AI Workplace Guard Beanie documents (from AISentinel)."""

from datetime import datetime, timezone
from typing import Any, Optional

from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Organization(Document):
    name: str
    slug: Indexed(str, unique=True)  # type: ignore[valid-type]
    org_api_key: Indexed(str, unique=True)  # type: ignore[valid-type]
    plan: str = "trial"
    trial_ends_at: Optional[datetime] = None
    seat_limit: Optional[int] = None  # override; None = use plan default
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    settings: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)

    class Settings:
        name = "organizations"


class User(Document):
    org_id: PydanticObjectId
    email: str
    name: str
    hashed_password: Optional[str] = None
    role: str = "employee"
    user_token: Indexed(str, unique=True)  # type: ignore[valid-type]
    status: str = "pending"
    last_active_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)

    class Settings:
        name = "users"
        indexes = [
            [("org_id", 1), ("email", 1)],
            [("org_id", 1), ("status", 1)],
            [("email", 1)],  # login lookup; signup enforces unique email
        ]


class Event(Document):
    org_id: PydanticObjectId
    user_id: Optional[PydanticObjectId] = None
    source: str
    platform: str
    page_url: Optional[str] = None
    prompt_text: str
    prompt_length: int
    prompt_tokens: Optional[int] = None
    session_id: Optional[str] = None
    page_title: Optional[str] = None
    event_type: str = "prompt_submit"
    activity_log: list[dict[str, Any]] = Field(default_factory=list)
    risk_level: str = "none"
    risk_reasons: list[str] = Field(default_factory=list)
    response_text: Optional[str] = None
    response_tokens: Optional[int] = None
    response_risk_level: Optional[str] = None
    response_risk_reasons: list[str] = Field(default_factory=list)
    response_scanned_at: Optional[datetime] = None
    model_used: Optional[str] = None
    risk_score: int = 0
    dlp_categories: list[str] = Field(default_factory=list)
    has_critical: bool = False
    scan_version: str = "2.0"
    status: str = "clean"
    was_anonymized: bool = False
    token_map_id: Optional[str] = None
    client_risk_score: Optional[int] = None
    client_risk_level: Optional[str] = None
    client_model_version: Optional[str] = None
    client_timing_ms: Optional[int] = None
    platform_detected: Optional[str] = None
    shadow_ai_confidence: Optional[int] = None
    clipboard_lineage: Optional[dict[str, Any]] = None
    jit_decision: Optional[dict[str, Any]] = None
    client_submit_id: Optional[str] = None
    captured_at: datetime
    processed_at: datetime = Field(default_factory=_utc_now)
    created_at: datetime = Field(default_factory=_utc_now)

    class Settings:
        name = "events"
        indexes = [
            [("org_id", 1), ("created_at", -1)],
            [("org_id", 1), ("user_id", 1), ("client_submit_id", 1)],
            [("org_id", 1), ("has_critical", 1), ("created_at", -1)],
        ]


class DLPFinding(Document):
    event_id: PydanticObjectId
    org_id: PydanticObjectId
    finding_type: str
    severity: str
    offset_start: Optional[int] = None
    matched_length: Optional[int] = None
    redacted_value: Optional[str] = None
    created_at: datetime = Field(default_factory=_utc_now)

    class Settings:
        name = "dlp_findings"


class EnforcementAction(Document):
    org_id: PydanticObjectId
    user_id: PydanticObjectId
    alert_id: Optional[PydanticObjectId] = None
    action: str
    status: str = "pending"
    created_by: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=_utc_now)
    completed_at: Optional[datetime] = None

    class Settings:
        name = "enforcement_actions"


class Alert(Document):
    org_id: PydanticObjectId
    event_id: Optional[PydanticObjectId] = None
    user_id: Optional[PydanticObjectId] = None
    alert_type: str
    severity: str
    title: str
    description: Optional[str] = None
    status: str = "open"
    acknowledged_by: Optional[PydanticObjectId] = None
    acknowledged_at: Optional[datetime] = None
    notified_email: bool = False
    created_at: datetime = Field(default_factory=_utc_now)

    class Settings:
        name = "alerts"
        indexes = [
            [("org_id", 1), ("created_at", -1)],
            [("org_id", 1), ("status", 1), ("severity", 1)],
        ]


class InviteToken(Document):
    org_id: PydanticObjectId
    email: str
    token: Indexed(str, unique=True)  # type: ignore[valid-type]
    invited_by: Optional[PydanticObjectId] = None
    role: str = "employee"
    expires_at: datetime
    used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_utc_now)

    class Settings:
        name = "invite_tokens"


class DLPCustomPattern(Document):
    org_id: PydanticObjectId
    name: str
    pattern: str
    severity: str = "MEDIUM"
    description: Optional[str] = None
    is_active: bool = True
    created_by: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=_utc_now)

    class Settings:
        name = "dlp_custom_patterns"


ORG_DOCUMENT_MODELS = [
    Organization,
    User,
    Event,
    DLPFinding,
    Alert,
    InviteToken,
    DLPCustomPattern,
    EnforcementAction,
]
