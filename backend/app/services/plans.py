"""Plan definitions, trial helper, and daily quota enforcement (Phase 5)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import HTTPException

from app.db.documents_org import Event, Organization, User
from app.db.models import ThreatEventDocument

PLAN_CATALOG: dict[str, dict[str, Any]] = {
    "trial": {
        "label": "Trial",
        "price_inr": 0,
        "price_usd": 0,
        "seats": 5,
        "events_per_day": 500,
        "analyzes_per_day": 100,
        "trial_days": 14,
        "description": "14-day full v1 trial · up to 5 users",
    },
    "starter": {
        "label": "Starter",
        "price_inr": 4999,
        "price_usd": 149,
        "seats": 10,
        "events_per_day": 2000,
        "analyzes_per_day": 500,
        "trial_days": 0,
        "description": "AI Guard + Threat Explainer · up to 10 users (D8)",
    },
    "growth": {
        "label": "Growth",
        "price_inr": None,
        "price_usd": None,
        "price_per_seat_inr": 499,
        "price_per_seat_usd": 15,
        "seats": 100,
        "events_per_day": 20000,
        "analyzes_per_day": 5000,
        "trial_days": 0,
        "description": "Higher quota · custom DLP · up to 100 seats",
    },
    "free": {
        "label": "Free (limited)",
        "price_inr": 0,
        "price_usd": 0,
        "seats": 1,
        "events_per_day": 50,
        "analyzes_per_day": 20,
        "trial_days": 0,
        "description": "Limited access — upgrade to Starter",
    },
    "expired": {
        "label": "Expired",
        "price_inr": 0,
        "price_usd": 0,
        "seats": 1,
        "events_per_day": 50,
        "analyzes_per_day": 20,
        "trial_days": 0,
        "description": "Trial ended — upgrade required for full quotas",
    },
}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def trial_end_default(days: int = 14) -> datetime:
    return _utc_now() + timedelta(days=days)


def effective_plan(org: Organization) -> str:
    plan = (org.plan or "free").lower()
    if plan == "trial" and org.trial_ends_at:
        end = org.trial_ends_at
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        if _utc_now() > end:
            return "expired"
    return plan if plan in PLAN_CATALOG else "free"


def plan_limits(org: Organization) -> dict[str, Any]:
    key = effective_plan(org)
    limits = dict(PLAN_CATALOG[key])
    limits["plan"] = key
    if org.seat_limit is not None:
        limits["seats"] = org.seat_limit
    return limits


def day_window_start() -> datetime:
    now = _utc_now()
    return datetime(now.year, now.month, now.day, tzinfo=timezone.utc)


async def count_events_today(org_id) -> int:
    start_naive = day_window_start().replace(tzinfo=None)
    return await Event.find(Event.org_id == org_id, Event.created_at >= start_naive).count()


async def count_analyzes_today(org_id_str: str) -> int:
    start_naive = day_window_start().replace(tzinfo=None)
    return await ThreatEventDocument.find(
        ThreatEventDocument.org_id == org_id_str,
        ThreatEventDocument.created_at >= start_naive,
    ).count()


async def count_active_seats(org_id) -> int:
    return await User.find(User.org_id == org_id, User.status == "active").count()


async def assert_seat_available(org: Organization) -> None:
    limits = plan_limits(org)
    used = await count_active_seats(org.id)
    pending = await User.find(User.org_id == org.id, User.status == "pending").count()
    if used + pending >= int(limits["seats"]):
        raise HTTPException(
            status_code=429,
            detail={
                "error": {
                    "code": "QUOTA_SEATS",
                    "message": (
                        f"Seat limit reached for {limits['label']} "
                        f"({limits['seats']} seats). Upgrade to add users."
                    ),
                    "upgrade_url": "/ai/billing",
                    "plan": limits["plan"],
                }
            },
        )


async def assert_event_quota(org: Organization) -> None:
    limits = plan_limits(org)
    used = await count_events_today(org.id)
    if used >= int(limits["events_per_day"]):
        raise HTTPException(
            status_code=429,
            detail={
                "error": {
                    "code": "QUOTA_EVENTS",
                    "message": (
                        f"Daily AI event quota reached "
                        f"({limits['events_per_day']}/day on {limits['label']})."
                    ),
                    "upgrade_url": "/ai/billing",
                    "plan": limits["plan"],
                }
            },
        )


async def assert_analyze_quota(org: Optional[Organization]) -> None:
    if org is None:
        return
    limits = plan_limits(org)
    used = await count_analyzes_today(str(org.id))
    if used >= int(limits["analyzes_per_day"]):
        raise HTTPException(
            status_code=429,
            detail={
                "error": {
                    "code": "QUOTA_ANALYZES",
                    "message": (
                        f"Daily analyze quota reached "
                        f"({limits['analyzes_per_day']}/day on {limits['label']})."
                    ),
                    "upgrade_url": "/ai/billing",
                    "plan": limits["plan"],
                }
            },
        )


async def billing_status(org: Organization) -> dict[str, Any]:
    limits = plan_limits(org)
    return {
        "plan": limits["plan"],
        "label": limits["label"],
        "description": limits["description"],
        "trial_ends_at": org.trial_ends_at.isoformat() if org.trial_ends_at else None,
        "stripe_customer_id": org.stripe_customer_id,
        "stripe_subscription_id": org.stripe_subscription_id,
        "limits": {
            "seats": limits["seats"],
            "events_per_day": limits["events_per_day"],
            "analyzes_per_day": limits["analyzes_per_day"],
        },
        "usage": {
            "seats": await count_active_seats(org.id),
            "events_today": await count_events_today(org.id),
            "analyzes_today": await count_analyzes_today(str(org.id)),
        },
        "pricing": {
            "starter_inr": PLAN_CATALOG["starter"]["price_inr"],
            "starter_usd": PLAN_CATALOG["starter"]["price_usd"],
        },
        "catalog": {
            k: {
                "label": v["label"],
                "description": v["description"],
                "seats": v["seats"],
                "events_per_day": v["events_per_day"],
                "analyzes_per_day": v["analyzes_per_day"],
                "price_inr": v.get("price_inr"),
                "price_usd": v.get("price_usd"),
                "price_per_seat_inr": v.get("price_per_seat_inr"),
                "price_per_seat_usd": v.get("price_per_seat_usd"),
            }
            for k, v in PLAN_CATALOG.items()
            if k in ("trial", "starter", "growth")
        },
    }
