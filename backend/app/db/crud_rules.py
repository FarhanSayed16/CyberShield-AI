from loguru import logger
from typing import List, Optional
from beanie import PydanticObjectId
from app.schemas.rules import RuleDocument, CustomRuleCreate


async def create_rule(rule_in: CustomRuleCreate, org_id: str) -> RuleDocument:
    doc = RuleDocument(**rule_in.model_dump(), org_id=org_id)
    await doc.insert()
    return doc


async def list_rules(org_id: str) -> List[RuleDocument]:
    return await RuleDocument.find(RuleDocument.org_id == org_id).to_list()


async def get_active_rules(org_id: Optional[str] = None) -> List[RuleDocument]:
    if not org_id:
        return []
    return await RuleDocument.find(
        RuleDocument.org_id == org_id,
        RuleDocument.is_active == True,  # noqa: E712
    ).to_list()


async def toggle_rule_status(rule_id: str, is_active: bool, org_id: str) -> Optional[RuleDocument]:
    try:
        doc = await RuleDocument.get(PydanticObjectId(rule_id))
        if doc and doc.org_id == org_id:
            doc.is_active = is_active
            await doc.save()
            return doc
    except Exception as e:
        logger.error(f"Error toggling rule: {e}")
    return None


async def delete_rule(rule_id: str, org_id: str) -> bool:
    try:
        doc = await RuleDocument.get(PydanticObjectId(rule_id))
        if doc and doc.org_id == org_id:
            await doc.delete()
            return True
    except Exception as e:
        logger.error(f"Error deleting rule: {e}")
    return False
