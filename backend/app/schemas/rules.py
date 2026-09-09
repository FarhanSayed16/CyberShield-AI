from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from beanie import Document


class RuleCondition(BaseModel):
    field: str  # e.g., "url", "domain", "port", "threat_type"
    operator: str  # e.g., "contains", "equals", "ends_with"
    value: str


class RuleAction(BaseModel):
    override_score: Optional[int] = None
    override_level: Optional[str] = None  # "Safe", "Suspicious", "High Risk"
    add_indicator: Optional[str] = None


class CustomRuleCreate(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    is_active: bool = True
    condition: RuleCondition
    action: RuleAction


class CustomRuleResponse(CustomRuleCreate):
    id: str
    org_id: Optional[str] = None


class RuleDocument(Document):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    is_active: bool = True
    condition: RuleCondition
    action: RuleAction
    org_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "custom_rules"
        indexes = [
            [("org_id", 1), ("is_active", 1)],
        ]
