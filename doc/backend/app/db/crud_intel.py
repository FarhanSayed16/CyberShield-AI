from datetime import datetime
from typing import List
from app.schemas.intel import IntelDocument, IntelIndicatorBase

async def add_intel_indicator(data: IntelIndicatorBase) -> IntelDocument:
    doc = IntelDocument(**data.model_dump())
    await doc.insert()
    return doc

async def get_recent_intel(limit: int = 50) -> List[IntelDocument]:
    return await IntelDocument.find_all().sort("-reported_at").limit(limit).to_list()
