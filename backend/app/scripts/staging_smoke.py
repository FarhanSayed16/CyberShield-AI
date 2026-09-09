"""Local / staging acceptance smoke (API only).

Usage:
  set BASE_URL=http://127.0.0.1:8000
  python -m app.scripts.staging_smoke

Exits non-zero on failure. Prints a short PASS/FAIL report.
"""

from __future__ import annotations

import json
import os
import sys
import uuid
import urllib.error
import urllib.request


BASE = os.environ.get("BASE_URL", "http://127.0.0.1:8000").rstrip("/")


def _req(method: str, path: str, body: dict | None = None, headers: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    h = {"Content-Type": "application/json", **(headers or {})}
    request = urllib.request.Request(f"{BASE}{path}", data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(request, timeout=60) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw}
        return e.code, payload


def main() -> int:
    results: list[tuple[str, bool, str]] = []

    def check(name: str, ok: bool, detail: str = ""):
        results.append((name, ok, detail))
        print(("PASS" if ok else "FAIL"), name, detail)

    status, health = _req("GET", "/api/health")
    check("health", status == 200 and health.get("status") in ("ok", "degraded"), str(health.get("status")))

    status, alias = _req("GET", "/health")
    check("health_alias", status == 200, str(alias.get("status")))

    email = f"staging_{uuid.uuid4().hex[:8]}@example.com"
    status, signup = _req(
        "POST",
        "/api/auth/signup",
        {
            "name": "Staging Admin",
            "email": email,
            "password": "password12345",
            "org_name": f"Staging {email}",
        },
    )
    check("signup", status == 201, f"plan={signup.get('org', {}).get('plan')}")
    token = signup.get("access_token", "")
    auth = {"Authorization": f"Bearer {token}"}

    status, me = _req("GET", "/api/auth/me", headers=auth)
    check("me", status == 200 and bool(me.get("user_token")), me.get("email", ""))

    status, org = _req("GET", "/api/org", headers=auth)
    check("org", status == 200 and bool(org.get("org_api_key")), org.get("plan", ""))
    org_key = org.get("org_api_key", "")
    user_tok = me.get("user_token", "")

    status, inv = _req(
        "POST",
        "/api/users/invite",
        {"email": f"emp_{uuid.uuid4().hex[:6]}@example.com", "role": "employee"},
        headers=auth,
    )
    check("invite", status == 201 and "accept_url" in inv, inv.get("email_delivery", ""))

    status, an = _req(
        "POST",
        "/api/analyze",
        {"type": "url", "content": "https://example.com/staging-smoke", "source": "dashboard"},
        headers=auth,
    )
    check("analyze", status == 200 and bool(an.get("id")), an.get("threat_level", ""))

    status, threats = _req("GET", "/api/threats?page=1&page_size=5", headers=auth)
    check("threats_list", status == 200, f"total={threats.get('total')}")

    status, ev = _req(
        "POST",
        "/api/events",
        {
            "user_token": user_tok,
            "platform": "chatgpt",
            "source": "extension",
            "event_type": "prompt_submit",
            "prompt_text": "key sk-test1234567890abcdef0123456789 staging fixture",
            "prompt_length": 60,
            "page_url": "https://chatgpt.com/",
            "page_title": "ChatGPT",
            "session_id": "sess_staging",
            "client_submit_id": f"sub_stg_{uuid.uuid4().hex[:8]}",
            "activity_log": [],
            "captured_at": "2026-09-09T12:00:00Z",
        },
        headers={"X-Org-Token": org_key},
    )
    check(
        "event_dlp",
        status == 201 and (ev.get("has_critical") or ev.get("risk_level") == "critical"),
        f"risk={ev.get('risk_level')} alert={ev.get('alert_id')}",
    )

    status, alerts = _req("GET", "/api/alerts", headers=auth)
    alert_list = alerts.get("alerts") or []
    check("alerts_list", status == 200 and len(alert_list) >= 1, f"n={len(alert_list)}")

    if alert_list:
        aid = alert_list[0]["id"]
        status, ack = _req(
            "PATCH",
            f"/api/alerts/{aid}",
            {"status": "acknowledged", "enforcement_action": "blackout_screen"},
            headers=auth,
        )
        check("alert_ack_enforcement", status == 200, ack.get("status", ""))

        status, pull = _req(
            "POST",
            "/api/enforcement/pull",
            {"user_token": user_tok},
            headers={"X-Org-Token": org_key},
        )
        actions = pull.get("actions") or []
        check("enforcement_pull", status == 200 and len(actions) >= 1, f"n={len(actions)}")
        if actions:
            status, done = _req(
                "POST",
                "/api/enforcement/complete",
                {"user_token": user_tok, "action_id": actions[0]["id"], "success": True},
                headers={"X-Org-Token": org_key},
            )
            check("enforcement_complete", status == 200, "")

    status, bill = _req("GET", "/api/billing/status", headers=auth)
    check("billing_status", status == 200 and "limits" in bill, bill.get("plan", ""))

    status, admin_h = _req("GET", "/api/admin/health/detailed", headers=auth)
    check("admin_verify_health", status in (200, 403), f"status={status}")

    failed = [n for n, ok, _ in results if not ok]
    print("---")
    print(f"BASE_URL={BASE}")
    print(f"{len(results) - len(failed)}/{len(results)} passed")
    if failed:
        print("Failed:", ", ".join(failed))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
