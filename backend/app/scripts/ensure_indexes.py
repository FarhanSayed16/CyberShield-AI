"""Ensure MongoDB indexes for staging/production hot paths.

Run after deploy (or against Atlas from CI/operator machine):

  cd backend
  set STORAGE_BACKEND=mongodb
  set MONGODB_URI=...
  python -m app.scripts.ensure_indexes

Beanie also applies Document.Settings.indexes on init_beanie; this script
prints what exists and creates any missing compounds defensively.
"""

from __future__ import annotations

import asyncio

from loguru import logger

from app.core.config import settings
from app.db.connection import close_db, get_motor_client, init_db


INDEX_SPECS: list[tuple[str, list[tuple[str, int]], dict]] = [
    ("events", [("org_id", 1), ("created_at", -1)], {}),
    ("events", [("org_id", 1), ("user_id", 1), ("client_submit_id", 1)], {}),
    ("alerts", [("org_id", 1), ("created_at", -1)], {}),
    ("alerts", [("org_id", 1), ("status", 1), ("severity", 1)], {}),
    ("threat_events", [("org_id", 1), ("created_at", -1)], {}),
    ("threat_events", [("event_id", 1)], {"unique": True}),
    ("users", [("org_id", 1), ("email", 1)], {}),
    ("users", [("email", 1)], {}),
    ("dlp_findings", [("org_id", 1), ("created_at", -1)], {}),
    ("enforcement_actions", [("org_id", 1), ("user_id", 1), ("status", 1)], {}),
    ("custom_rules", [("org_id", 1), ("is_active", 1)], {}),
]


async def main() -> None:
    if (settings.STORAGE_BACKEND or "").strip().lower() == "memory":
        logger.warning("STORAGE_BACKEND=memory — indexes are ephemeral; use mongodb for staging.")
    await init_db()
    client = get_motor_client()
    if client is None:
        raise SystemExit("DB client not initialized — check MONGODB_URI")
    db = client[settings.DB_NAME]
    for coll_name, keys, opts in INDEX_SPECS:
        coll = db[coll_name]
        name = await coll.create_index(keys, **opts)
        logger.info(f"index ok: {coll_name}.{name} keys={keys} opts={opts}")
    for coll_name in {c for c, _, _ in INDEX_SPECS}:
        idxs = await db[coll_name].index_information()
        logger.info(f"{coll_name} indexes: {list(idxs.keys())}")
    await close_db()
    print("ensure_indexes: done")


if __name__ == "__main__":
    asyncio.run(main())
