# MongoDB backup & restore (staging / prod)

CyberSentinel stores org, users, events, alerts, threats, and enforcement in MongoDB. Prefer **Atlas** managed backups in cloud; use `mongodump` / `mongorestore` for local Compose or self-hosted.

---

## Atlas (recommended for staging)

1. Atlas → Project → Cluster → **Backup** (or Cloud Backup / Snapshots depending on tier).
2. Confirm continuous cloud backup **or** take a manual snapshot before risky deploys.
3. **Restore:** Atlas → Backup → Restore to new cluster **or** restore into staging cluster per Atlas UI.
4. Update `MONGODB_URI` only if restore targets a new host; restart Render service.
5. Re-run `python -m app.scripts.ensure_indexes` after restore if indexes were dropped.

**M0 free tier:** automated backup options are limited — schedule a weekly `mongodump` from an operator machine instead (below).

---

## Local / Compose dump

```powershell
# Dump staging DB (host Mongo on 27017)
mongodump --uri "mongodb://127.0.0.1:27017" --db cybersentinel_staging --out .\backups\mongo-%date:~-4,4%%date:~-10,2%%date:~-7,2%

# Or Atlas URI
mongodump --uri "$env:MONGODB_URI" --db cybersentinel_staging --out .\backups\staging-dump
```

Store dumps **outside** git (add `backups/` to local ignore if needed). Encrypt at rest for any real customer data.

---

## Restore

```powershell
# Drop-and-restore into a scratch DB first when unsure
mongorestore --uri "mongodb://127.0.0.1:27017" --db cybersentinel_staging_restore --dir .\backups\staging-dump\cybersentinel_staging

# Production-like cutover: restore into target DB name used by app
mongorestore --uri "$env:MONGODB_URI" --db cybersentinel_staging --drop --dir .\backups\staging-dump\cybersentinel_staging
```

`--drop` removes existing collections in that DB before restore — confirm DB name first.

Then:

```powershell
cd backend
$env:STORAGE_BACKEND='mongodb'
$env:MONGODB_URI='...'
$env:DB_NAME='cybersentinel_staging'
.\.venv\Scripts\python.exe -m app.scripts.ensure_indexes
$env:BASE_URL='http://127.0.0.1:8000'
.\.venv\Scripts\python.exe -m app.scripts.staging_smoke
```

---

## What not to back up from app servers

- Do not commit `.env` / `.env.staging`
- Rotate `JWT_SECRET` / org API keys after a suspected dump leak
- Prefer logical dumps over copying Docker volume files unless you know WiredTiger recovery
