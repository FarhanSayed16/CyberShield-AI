# Incident response one-pager

**Product:** CyberSentinel  
**Date:** 2026-09-09

| Role | Responsibility |
| :--- | :--- |
| On-call eng | Acknowledge page, triage health/API/DB |
| Tech lead | Severity call, customer messaging |
| Product owner | Customer/comms decision |

## Severity

| Sev | Example | Response |
| :---: | :--- | :--- |
| SEV1 | Auth down, data exposure | Immediate; page on-call |
| SEV2 | Ingest degraded, Gemini outage | Same business day |
| SEV3 | UI bug, non-critical | Next sprint |

## First 15 minutes

1. Check `/health` and `/api/health`  
2. Check Mongo / Redis / host logs  
3. Freeze deploys if active incident  
4. Rotate compromised keys (`JWT_SECRET`, org tokens, Gemini keys) if secrets involved  
5. Notify support mailbox  

## Backup Gemini keys

Keep at least two keys in `GEMINI_API_KEYS` (comma-separated). Rotate via env redeploy; document who owns the Google Cloud project.

## Status

Until a public status page exists, use uptime ping on `/health` (UptimeRobot / cron) and post incidents to the internal channel + support@…
