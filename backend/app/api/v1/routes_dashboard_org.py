from datetime import datetime, timedelta

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, Query

from app.api.deps import require_manager_or_admin
from app.db.documents_org import Alert, Event, User
from app.api.v1.serializers_org import event_list_item

router = APIRouter()


def _period_start(period: str) -> datetime:
    now = datetime.utcnow()
    if period == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "30d":
        return now - timedelta(days=30)
    return now - timedelta(days=7)


@router.get("/summary")
async def summary(
    period: str = Query("7d"),
    current: User = Depends(require_manager_or_admin),
):
    start = _period_start(period)
    events = await Event.find(
        Event.org_id == current.org_id,
        Event.captured_at >= start,
    ).to_list()

    prompts = len(events)
    flagged = sum(1 for e in events if e.status == "flagged")
    active_users = len({str(e.user_id) for e in events if e.user_id})
    unique_platforms = len({e.platform for e in events})

    critical = await Alert.find(
        Alert.org_id == current.org_id,
        Alert.severity == "CRITICAL",
        Alert.status == "open",
    ).count()

    return {
        "period": period,
        "totals": {
            "prompts": prompts,
            "flagged": flagged,
            "critical_alerts": critical,
            "active_users": active_users,
            "unique_platforms": unique_platforms,
        },
        "change_vs_prev_period": {"prompts_pct": 0, "flagged_pct": 0},
    }


@router.get("/usage-over-time")
async def usage_over_time(
    period: str = Query("7d"),
    current: User = Depends(require_manager_or_admin),
):
    start = _period_start(period)
    events = await Event.find(
        Event.org_id == current.org_id,
        Event.captured_at >= start,
    ).to_list()

    buckets: dict[str, dict] = {}
    for e in events:
        key = e.captured_at.strftime("%Y-%m-%d")
        if key not in buckets:
            buckets[key] = {"date": key, "prompts": 0, "flagged": 0, "critical": 0}
        buckets[key]["prompts"] += 1
        if e.status == "flagged":
            buckets[key]["flagged"] += 1
        if e.has_critical:
            buckets[key]["critical"] += 1

    return {"series": sorted(buckets.values(), key=lambda x: x["date"])}


@router.get("/platform-breakdown")
async def platform_breakdown(
    period: str = Query("7d"),
    current: User = Depends(require_manager_or_admin),
):
    start = _period_start(period)
    events = await Event.find(
        Event.org_id == current.org_id,
        Event.captured_at >= start,
    ).to_list()
    counts: dict[str, int] = {}
    for e in events:
        counts[e.platform] = counts.get(e.platform, 0) + 1
    total = sum(counts.values()) or 1
    return {
        "platforms": [
            {"platform": k, "prompts": v, "pct": round(100 * v / total, 1)}
            for k, v in sorted(counts.items(), key=lambda x: -x[1])
        ]
    }


@router.get("/top-users")
async def top_users(
    period: str = Query("7d"),
    limit: int = Query(10, le=50),
    current: User = Depends(require_manager_or_admin),
):
    start = _period_start(period)
    events = await Event.find(
        Event.org_id == current.org_id,
        Event.captured_at >= start,
    ).to_list()
    stats: dict[str, dict] = {}
    for e in events:
        if not e.user_id:
            continue
        uid = str(e.user_id)
        if uid not in stats:
            stats[uid] = {"prompts": 0, "flagged": 0, "critical": 0, "risk_sum": 0}
        stats[uid]["prompts"] += 1
        if e.status == "flagged":
            stats[uid]["flagged"] += 1
        if e.has_critical:
            stats[uid]["critical"] += 1
        stats[uid]["risk_sum"] += e.risk_score

    rows = []
    for uid, s in sorted(stats.items(), key=lambda x: -x[1]["prompts"])[:limit]:
        u = await User.get(PydanticObjectId(uid))
        rows.append({
            "user": {"id": uid, "name": u.name, "email": u.email},
            "prompts": s["prompts"],
            "flagged": s["flagged"],
            "critical": s["critical"],
            "avg_risk_score": round(s["risk_sum"] / s["prompts"], 1),
        })
    return {"users": rows}


@router.get("/recent-activity")
async def recent_activity(
    limit: int = Query(8, le=20),
    current: User = Depends(require_manager_or_admin),
):
    events = (
        await Event.find(Event.org_id == current.org_id)
        .sort(-Event.captured_at)
        .limit(limit)
        .to_list()
    )
    items = []
    for e in events:
        u = await User.get(e.user_id) if e.user_id else None
        items.append(event_list_item(e, u, reveal_prompt=True))
    return {"events": items}
