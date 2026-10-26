# 18 — Scaling Strategy

## Executive summary

**MVP stays on Docker Compose + single-node MongoDB** until **5 paying teams** use the product weekly. Then scale horizontally on AWS (or MongoDB Atlas) per original platform vision.

---

## Phase 0 — MVP (now)

| Component | Choice |
|-----------|--------|
| API | 1 FastAPI container |
| DB | MongoDB 7 single node |
| Cache | Redis single instance |
| Frontend | nginx static container |
| Cost | ~$0 local; ~$30–80/mo small VPS |

---

## Phase 1 — First paying customers (5–50 orgs)

- MongoDB Atlas M10 or self-hosted replica set
- Redis ElastiCache or managed Redis
- API: 2+ instances behind ALB
- S3 for extension packages + backups
- CloudWatch logs

---

## Phase 2 — Growth (50–500 orgs)

- Read preference secondary for analytics aggregations
- Dedicated worker for email/digest jobs
- CDN (CloudFront) for dashboard
- Separate DLP worker if spaCy enabled

---

## Phase 3 — Platform (500+ orgs)

- Kubernetes (EKS) or ECS Fargate
- Kafka for event stream
- ClickHouse or BigQuery for analytics
- Multi-region API

---

## AWS service map (from founder plan)

| Service | Use |
|---------|-----|
| EC2 / ECS | API containers |
| Atlas / DocumentDB | MongoDB |
| ElastiCache | Redis |
| S3 | artifacts, exports |
| CloudWatch | metrics + logs |
| CloudFront | frontend CDN |

---

## Trigger to leave Docker-only

- p95 ingest latency &gt; 200ms sustained
- Mongo disk &gt; 80%
- &gt; 1000 events/minute peak

---

## Cross-links

- [`13_DEPLOYMENT_DOCKER.md`](13_DEPLOYMENT_DOCKER.md)
- [`10_DEVOPS_CI_CD.md`](10_DEVOPS_CI_CD.md)
