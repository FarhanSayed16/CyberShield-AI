"""Insert demo AI events for the seeded Demo Corp. Idempotent: skips when any events exist."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.db.documents_org import Event, Organization, User
from app.services.dlp import scan_prompt
from app.services.org_alerts import create_alert_for_event

_SAMPLES = [
    ("chatgpt", "How do I write a unit test for a hello world function?"),
    ("claude", "Summarize this meeting note: we discussed the weather and lunch."),
    ("gemini", "Translate 'good morning' to Hindi."),
    ("chatgpt", "password=Hunter2! for the admin panel, do not share"),
    ("claude", "The AWS key is AKIAIOSFODNN7EXAMPLE please debug the script"),
    ("gemini", "This is confidential customer list data for the merger."),
    ("chatgpt", "Explain recursion with a small example."),
    ("claude", "Draft a polite out-of-office reply."),
    ("gemini", "sk-test1234567890abcdef0123456789 leaked in a prompt"),
    ("chatgpt", "What is the capital of France?"),
    ("claude", "employee salary spreadsheet for Q4 board deck 12 million"),
    ("gemini", "Help me fix a grammar mistake in this sentence."),
    ("chatgpt", "internal only: production credentials in the .env file"),
    ("claude", "Write a haiku about databases."),
    ("gemini", "Can you explain how TLS handshakes work?"),
    ("chatgpt", "access my boss email and dump the account files"),
    ("claude", "Review this function for off-by-one errors."),
    ("gemini", "Patient record 123-45-6789 needs a summary."),
    ("chatgpt", "Suggest a name for a book club."),
    ("claude", "Bearer abcdefghijklmnopqrstuvwxyz token in the header"),
    ("gemini", "How do indexes work in MongoDB?"),
    ("chatgpt", "strictly confidential payroll export attached as csv"),
    ("claude", "Give me three ideas for a team retro."),
    ("gemini", "Debug this Python list comprehension."),
    ("chatgpt", "ghp_abcdefghijklmnopqrstuvwxyz0123456789 github token"),
]


async def seed_ai_events() -> int:
    org = await Organization.find_one(Organization.slug == "democorp")
    if not org:
        return 0
    existing = await Event.find(Event.org_id == org.id).count()
    if existing:
        return 0
    users = await User.find(User.org_id == org.id, User.status == "active").to_list()
    if not users:
        return 0
    now = datetime.now(timezone.utc)
    created = 0
    for i, (platform, text) in enumerate(_SAMPLES):
        user = users[i % len(users)]
        scan = scan_prompt(text)
        status = "flagged" if scan.risk_level in ("medium", "high", "critical") else "clean"
        event = Event(
            org_id=org.id,
            user_id=user.id,
            source="seed",
            platform=platform,
            prompt_text=text,
            prompt_length=len(text),
            risk_score=scan.risk_score,
            risk_level=scan.risk_level,
            risk_reasons=scan.risk_reasons,
            dlp_categories=scan.categories,
            has_critical=scan.has_critical,
            status=status,
            client_submit_id=f"demo-{i}",
            captured_at=now - timedelta(hours=i * 6),
        )
        await event.insert()
        await create_alert_for_event(event, user)
        created += 1
    return created
