from datetime import datetime

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_org_from_header
from app.db.documents_org import EnforcementAction, Organization, User
from app.schemas.ai_guard import EnforcementCompleteRequest, EnforcementPullRequest

router = APIRouter()

VALID_ACTIONS = frozenset({"close_ai_tabs", "blackout_screen"})


@router.post("/pull")
async def pull_enforcement(
    body: EnforcementPullRequest,
    org: Organization = Depends(get_org_from_header),
):
    user = await User.find_one(User.user_token == body.user_token, User.org_id == org.id)
    if not user:
        raise HTTPException(status_code=401, detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Invalid user token"}})

    pending = await EnforcementAction.find(
        EnforcementAction.org_id == org.id,
        EnforcementAction.user_id == user.id,
        EnforcementAction.status == "pending",
    ).to_list()

    items = []
    for action in pending:
        action.status = "dispatched"
        await action.save()
        items.append({"id": str(action.id), "action": action.action})

    return {"actions": items}


@router.post("/complete")
async def complete_enforcement(
    body: EnforcementCompleteRequest,
    org: Organization = Depends(get_org_from_header),
):
    user = await User.find_one(User.user_token == body.user_token, User.org_id == org.id)
    if not user:
        raise HTTPException(status_code=401, detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Invalid user token"}})

    try:
        action = await EnforcementAction.get(PydanticObjectId(body.action_id))
    except Exception:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Action not found"}})

    if not action or action.org_id != org.id or action.user_id != user.id:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Action not found"}})

    action.status = "done" if body.success else "failed"
    action.completed_at = datetime.utcnow()
    await action.save()
    return {"ok": True, "status": action.status}
