"""Billing: Stripe Checkout (when configured) + local/dev activate path."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from loguru import logger
from pydantic import BaseModel

from app.api.deps import get_current_user, require_admin
from app.core.config import settings
from app.db.documents_org import Organization, User
from app.services.plans import PLAN_CATALOG, billing_status, trial_end_default

router = APIRouter()


class CheckoutRequest(BaseModel):
    plan: str = "starter"
    success_path: str = "/ai/billing?checkout=success"
    cancel_path: str = "/ai/billing?checkout=cancel"


def _stripe_enabled() -> bool:
    return bool((settings.STRIPE_SECRET_KEY or "").strip())


def _frontend() -> str:
    return (settings.FRONTEND_URL or "http://localhost:5173").rstrip("/")


@router.get("/billing/status")
async def get_billing_status(user: User = Depends(get_current_user)):
    org = await Organization.get(user.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    status = await billing_status(org)
    status["stripe_configured"] = _stripe_enabled()
    status["billing_mode"] = "stripe" if _stripe_enabled() else "dev"
    return status


@router.get("/billing/plans")
async def list_plans():
    return {
        "plans": {
            k: v
            for k, v in PLAN_CATALOG.items()
            if k in ("trial", "starter", "growth")
        },
        "currency_note": "Starter list price: ₹4,999/mo or $149/mo (D8). Stripe Price ID overrides display.",
    }


@router.post("/billing/checkout")
async def create_checkout(body: CheckoutRequest, admin: User = Depends(require_admin)):
    """
    Create a Stripe Checkout Session for Starter.
    If Stripe is not configured, returns instructions + use /billing/dev-activate.
    """
    if body.plan != "starter":
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "VALIDATION_ERROR", "message": "Only starter checkout in v1"}},
        )

    org = await Organization.get(admin.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if not _stripe_enabled():
        return {
            "mode": "dev",
            "checkout_url": None,
            "message": (
                "Stripe keys not set. For local/staging without Stripe, call "
                "POST /api/billing/dev-activate as admin, or set STRIPE_SECRET_KEY + STRIPE_PRICE_STARTER."
            ),
            "dev_activate": "/api/billing/dev-activate",
        }

    try:
        import stripe
    except ImportError as exc:
        raise HTTPException(
            status_code=500,
            detail="stripe package not installed",
        ) from exc

    stripe.api_key = settings.STRIPE_SECRET_KEY
    price = (settings.STRIPE_PRICE_STARTER or "").strip()
    if not price:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "CONFIG", "message": "STRIPE_PRICE_STARTER is not set"}},
        )

    if not org.stripe_customer_id:
        customer = stripe.Customer.create(
            email=admin.email,
            name=org.name,
            metadata={"org_id": str(org.id)},
        )
        org.stripe_customer_id = customer["id"]
        org.updated_at = datetime.now(timezone.utc)
        await org.save()

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=org.stripe_customer_id,
        line_items=[{"price": price, "quantity": 1}],
        success_url=f"{_frontend()}{body.success_path}",
        cancel_url=f"{_frontend()}{body.cancel_path}",
        metadata={"org_id": str(org.id), "plan": "starter"},
        client_reference_id=str(org.id),
    )
    return {"mode": "stripe", "checkout_url": session.url, "session_id": session.id}


@router.post("/billing/portal")
async def customer_portal(admin: User = Depends(require_admin)):
    """Stripe Customer Portal for cancel/update (minimum viable)."""
    if not _stripe_enabled():
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "CONFIG",
                    "message": "Stripe not configured — manage plan via /api/billing/dev-activate in non-prod",
                }
            },
        )
    org = await Organization.get(admin.org_id)
    if not org or not org.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer on this org yet — checkout first")

    import stripe

    stripe.api_key = settings.STRIPE_SECRET_KEY
    portal = stripe.billing_portal.Session.create(
        customer=org.stripe_customer_id,
        return_url=f"{_frontend()}/ai/billing",
    )
    return {"portal_url": portal.url}


class DevActivateRequest(BaseModel):
    plan: str = "starter"


@router.post("/billing/dev-activate")
async def dev_activate(body: DevActivateRequest, admin: User = Depends(require_admin)):
    """
    Activate Starter (or reset trial) without Stripe.
    Allowed only when ENVIRONMENT=development and ALLOW_DEV_BILLING=true
    (or development with Stripe unset for local convenience when ALLOW_DEV_BILLING is true).
    """
    env = (settings.ENVIRONMENT or "development").strip().lower()
    allow = bool(settings.ALLOW_DEV_BILLING)
    if env in ("staging", "production") or not allow:
        raise HTTPException(
            status_code=403,
            detail=(
                "dev-activate disabled. Set ALLOW_DEV_BILLING=true in development only, "
                "or use Stripe checkout."
            ),
        )

    org = await Organization.get(admin.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    plan = body.plan.lower()
    if plan not in ("trial", "starter", "growth", "free"):
        raise HTTPException(status_code=400, detail="Invalid plan")

    org.plan = plan
    if plan == "trial":
        org.trial_ends_at = trial_end_default()
        org.stripe_subscription_id = None
    elif plan in ("starter", "growth"):
        org.trial_ends_at = None
        org.stripe_subscription_id = org.stripe_subscription_id or f"dev_sub_{org.id}"
    else:
        org.trial_ends_at = None
        org.stripe_subscription_id = None
    org.updated_at = datetime.now(timezone.utc)
    await org.save()
    logger.info(f"Billing dev-activate org={org.id} plan={plan}")
    return await billing_status(org)


@router.post("/billing/webhook")
async def stripe_webhook(request: Request):
    """Activate/deactivate org plan from Stripe subscription events."""
    if not _stripe_enabled():
        raise HTTPException(status_code=400, detail="Stripe not configured")

    import stripe

    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    secret = (settings.STRIPE_WEBHOOK_SECRET or "").strip()
    stripe.api_key = settings.STRIPE_SECRET_KEY
    env = (settings.ENVIRONMENT or "development").strip().lower()

    try:
        if secret:
            event = stripe.Webhook.construct_event(payload, sig, secret)
        elif env == "development":
            # Local testing without signature verification — never in staging/prod
            event = stripe.Event.construct_from(
                __import__("json").loads(payload.decode("utf-8")),
                stripe.api_key,
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="STRIPE_WEBHOOK_SECRET required when Stripe is enabled outside development",
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning(f"Stripe webhook verify failed: {exc}")
        raise HTTPException(status_code=400, detail="Invalid webhook") from exc

    etype = event.get("type") if isinstance(event, dict) else event["type"]
    data = event.get("data", {}).get("object", {}) if isinstance(event, dict) else event["data"]["object"]

    org_id = None
    if isinstance(data, dict):
        org_id = (data.get("metadata") or {}).get("org_id") or data.get("client_reference_id")
        if not org_id and data.get("customer"):
            org = await Organization.find_one(Organization.stripe_customer_id == data["customer"])
            if org:
                org_id = str(org.id)

    if not org_id:
        logger.info(f"Stripe webhook {etype}: no org_id — ignored")
        return {"received": True, "handled": False}

    org = await Organization.get(org_id)
    if not org:
        # Beanie get may need ObjectId
        from beanie import PydanticObjectId

        try:
            org = await Organization.get(PydanticObjectId(org_id))
        except Exception:
            org = None
    if not org:
        return {"received": True, "handled": False}

    if etype in ("checkout.session.completed", "customer.subscription.created", "customer.subscription.updated"):
        status = data.get("status") if isinstance(data, dict) else None
        if etype == "checkout.session.completed" or status in (None, "active", "trialing"):
            org.plan = "starter"
            org.trial_ends_at = None
            if isinstance(data, dict):
                if data.get("subscription"):
                    org.stripe_subscription_id = data["subscription"]
                if data.get("customer"):
                    org.stripe_customer_id = data["customer"]
            org.updated_at = datetime.now(timezone.utc)
            await org.save()
            logger.info(f"Stripe activated starter for org={org.id}")
            return {"received": True, "handled": True, "plan": "starter"}

    if etype in ("customer.subscription.deleted", "customer.subscription.paused"):
        org.plan = "expired"
        org.stripe_subscription_id = None
        org.updated_at = datetime.now(timezone.utc)
        await org.save()
        logger.info(f"Stripe deactivated org={org.id}")
        return {"received": True, "handled": True, "plan": "expired"}

    return {"received": True, "handled": False}
