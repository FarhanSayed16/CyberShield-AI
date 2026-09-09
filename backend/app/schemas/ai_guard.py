"""Pydantic schemas for AI Workplace Guard (auth, events, org)."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8)
    org_name: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AcceptInviteRequest(BaseModel):
    token: str
    name: str = Field(min_length=1)
    password: str = Field(min_length=8)


class InviteUserRequest(BaseModel):
    email: EmailStr
    role: str = Field(default="employee", pattern="^(employee|manager|admin)$")


class ClipboardLineagePayload(BaseModel):
    status: str
    origin_host: Optional[str] = None
    sensitivity_label: Optional[str] = None
    copied_at: Optional[datetime] = None


class JitDecisionPayload(BaseModel):
    triggered: bool = False
    trigger_reason: Optional[str] = None
    policy_version: Optional[str] = None
    user_acknowledged_at: Optional[datetime] = None
    justification_text: Optional[str] = None
    user_cancelled: bool = False


class ClientFindingPayload(BaseModel):
    type: str
    severity: str
    description: Optional[str] = None


class EventIngestRequest(BaseModel):
    user_token: str
    platform: str
    source: str = "extension"
    prompt_text: str
    prompt_length: int
    page_url: Optional[str] = None
    page_title: Optional[str] = None
    session_id: Optional[str] = None
    event_type: str = "prompt_submit"
    activity_log: Optional[list[dict[str, Any]]] = None
    captured_at: datetime
    was_anonymized: bool = False
    token_map_id: Optional[str] = None
    client_risk_score: Optional[int] = None
    client_risk_level: Optional[str] = None
    client_findings: Optional[list[ClientFindingPayload]] = None
    client_model_version: Optional[str] = None
    client_timing_ms: Optional[int] = None
    platform_detected: Optional[str] = None
    shadow_ai_confidence: Optional[int] = None
    clipboard_lineage: Optional[ClipboardLineagePayload] = None
    jit_decision: Optional[JitDecisionPayload] = None
    client_submit_id: Optional[str] = None


class EventResponseUpdate(BaseModel):
    user_token: str
    response_text: str


class EventStatusUpdate(BaseModel):
    status: str


class AlertStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None
    enforcement_action: Optional[str] = None


class EnforcementPullRequest(BaseModel):
    user_token: str


class EnforcementCompleteRequest(BaseModel):
    user_token: str
    action_id: str
    success: bool = True


class OrgSettingsUpdate(BaseModel):
    name: Optional[str] = None
    settings: Optional[dict[str, Any]] = None


class DLPPatternCreate(BaseModel):
    name: str
    pattern: str
    severity: str = "MEDIUM"
    description: Optional[str] = None


class OrgPoliciesUpdate(BaseModel):
    dlp_sensitivity: Optional[str] = None
    jit_mode: Optional[str] = None
    anonymize_mode: Optional[str] = None
    features: Optional[dict[str, bool]] = None
    sensitive_domains: Optional[list[dict[str, Any]]] = None
    ai_allowlist: Optional[list[str]] = None
