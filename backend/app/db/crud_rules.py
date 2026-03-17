from loguru import logger
from typing import List, Optional
from beanie import PydanticObjectId
from app.schemas.rules import RuleDocument, CustomRuleCreate

async def create_rule(rule_in: CustomRuleCreate) -> RuleDocument:
    doc = RuleDocument(**rule_in.model_dump())
    await doc.insert()
    return doc

async def list_rules() -> List[RuleDocument]:
    return await RuleDocument.find_all().to_list()

async def get_active_rules() -> List[RuleDocument]:
    return await RuleDocument.find(RuleDocument.is_active == True).to_list()

async def toggle_rule_status(rule_id: str, is_active: bool) -> Optional[RuleDocument]:
    try:
        doc = await RuleDocument.get(PydanticObjectId(rule_id))
        if doc:
            doc.is_active = is_active
            await doc.save()
            return doc
    except Exception as e:
        logger.error(f"Error toggling rule: {e}")
    return None

async def delete_rule(rule_id: str) -> bool:
    try:
        doc = await RuleDocument.get(PydanticObjectId(rule_id))
        if doc:
            await doc.delete()
            return True
    except Exception as e:
        logger.error(f"Error deleting rule: {e}")
    return False
