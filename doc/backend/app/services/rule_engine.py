from loguru import logger
from typing import Dict, Any, Tuple
from app.db import crud_rules
from app.schemas.rules import RuleDocument

class CustomRuleEngine:
    def __init__(self):
        pass

    async def evaluate_rules(self, data: Dict[str, Any], current_score: int, current_level: str) -> Tuple[int, str, list]:
        """
        Evaluate all active custom rules against the data dict.
        Returns the modified (score, level, new_indicators).
        """
        try:
            active_rules = await crud_rules.get_active_rules()
        except Exception as e:
            logger.error(f"Rule engine failed to fetch rules: {e}")
            return current_score, current_level, []

        new_score = current_score
        new_level = current_level
        added_indicators = []

        for rule in active_rules:
            if self._evaluate_condition(rule, data):
                logger.info(f"Rule '{rule.name}' triggered!")
                
                # Apply Actions
                if rule.action.override_score is not None:
                    new_score = rule.action.override_score
                if rule.action.override_level:
                    new_level = rule.action.override_level
                if rule.action.add_indicator:
                    added_indicators.append(rule.action.add_indicator)

        return new_score, new_level, added_indicators

    def _evaluate_condition(self, rule: RuleDocument, data: Dict[str, Any]) -> bool:
        field_val = str(data.get(rule.condition.field, "")).lower()
        target_val = rule.condition.value.lower()
        
        op = rule.condition.operator
        if op == "equals":
            return field_val == target_val
        elif op == "contains":
            return target_val in field_val
        elif op == "starts_with":
            return field_val.startswith(target_val)
        elif op == "ends_with":
            return field_val.endswith(target_val)
            
        return False

rule_engine = CustomRuleEngine()
