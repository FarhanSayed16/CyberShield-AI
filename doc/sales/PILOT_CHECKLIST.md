# Pilot checklist

1. Run the API against MongoDB (`STORAGE_BACKEND=mongodb`) so a restart does not erase the pilot.
2. Create the company from Sign up. Copy the org token from Org Settings.
3. Invite each person. They set a password from the invite link. Copy each user token from Team.
4. Load `extension/` (or the packed zip) and fill Config: API origin, org token, that person’s user token, dashboard URL.
5. Leave submit mode on Observe for the first week. Turn on Warn or Block only after the team has seen real alerts.
6. Set the alert email and send a test message before relying on mail.
7. For a managed Chrome rollout, follow `Plan/20_ORG_EMPLOYEE_MONITORING.md`.
