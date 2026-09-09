"""Seed demo org for AI Workplace Guard.

Run from backend/:
  set STORAGE_BACKEND=memory   # optional for no Mongo
  python -m app.scripts.seed_org
"""

from __future__ import annotations

import asyncio

from app.db.connection import close_db, init_db
from app.db.documents_org import Organization, User
from app.utils.auth_security import hash_password


async def seed() -> None:
    existing = await Organization.find_one(Organization.slug == "democorp")
    if existing:
        print("Demo org already exists:", existing.org_api_key)
        return

    org = Organization(
        name="Demo Corp",
        slug="democorp",
        org_api_key="aisnl_org_demo123",
        plan="starter",
        settings={
            "retention_days": 90,
            "notify_on_critical": True,
            "dlp_sensitivity": "medium",
            "jit_mode": "off",
            "anonymize_mode": "off",
            "features": {
                "jit_training": False,
                "local_audit": False,
                "anonymization": False,
                "clipboard_lineage": False,
                "shadow_ai_detection": False,
                "policy_cache": True,
            },
        },
    )
    await org.insert()

    admin = User(
        org_id=org.id,
        email="admin@demo.com",
        name="Demo Admin",
        hashed_password=hash_password("password"),
        role="admin",
        user_token="aisnl_usr_admin123",
        status="active",
    )
    employee = User(
        org_id=org.id,
        email="emp@demo.com",
        name="Demo Employee",
        hashed_password=hash_password("password"),
        role="employee",
        user_token="aisnl_usr_emp456",
        status="active",
    )
    await admin.insert()
    await employee.insert()

    manager = User(
        org_id=org.id,
        email="manager@demo.com",
        name="Demo Manager",
        hashed_password=hash_password("password"),
        role="manager",
        user_token="aisnl_usr_mgr789",
        status="active",
    )
    await manager.insert()

    print("Seeded Demo Corp")
    print("  org_api_key:", org.org_api_key)
    print("  admin: admin@demo.com / password /", admin.user_token)
    print("  manager: manager@demo.com / password /", manager.user_token)
    print("  employee: emp@demo.com / password /", employee.user_token)


async def _main() -> None:
    await init_db()
    await seed()
    await close_db()


if __name__ == "__main__":
    asyncio.run(_main())
