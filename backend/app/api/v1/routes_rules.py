from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.api.deps import require_auth
from app.schemas.rules import CustomRuleCreate, CustomRuleResponse
from app.db import crud_rules

router = APIRouter()

@router.post("/", response_model=CustomRuleResponse)
async def create_rule(
    rule_in: CustomRuleCreate,
    _api_key: str = Depends(require_auth),
):
    """Create a new custom detection rule."""
    doc = await crud_rules.create_rule(rule_in)
    return CustomRuleResponse(id=str(doc.id), **doc.model_dump())

@router.get("/", response_model=List[CustomRuleResponse])
async def list_all_rules(
    _api_key: str = Depends(require_auth),
):
    """List all custom rules."""
    docs = await crud_rules.list_rules()
    return [CustomRuleResponse(id=str(doc.id), **doc.model_dump()) for doc in docs]

@router.patch("/{rule_id}/toggle", response_model=CustomRuleResponse)
async def toggle_rule(
    rule_id: str,
    is_active: bool,
    _api_key: str = Depends(require_auth),
):
    """Enable or disable a custom rule."""
    doc = await crud_rules.toggle_rule_status(rule_id, is_active)
    if not doc:
        raise HTTPException(status_code=404, detail="Rule not found")
    return CustomRuleResponse(id=str(doc.id), **doc.model_dump())

@router.delete("/{rule_id}")
async def delete_rule(
    rule_id: str,
    _api_key: str = Depends(require_auth),
):
    """Delete a custom rule."""
    success = await crud_rules.delete_rule(rule_id)
    if not success:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"message": "Rule deleted"}
