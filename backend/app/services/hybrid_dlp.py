from app.services.dlp import ScanResult

LINEAGE_BOOST = {
    "internal_restricted": 15,
    "highly_confidential": 25,
}


def _level_from_score(score: int, has_critical: bool) -> str:
    if has_critical:
        return "critical"
    if score >= 65:
        return "high"
    if score >= 35:
        return "medium"
    if score >= 15:
        return "low"
    return "none"


def merge_hybrid_scan(
    server: ScanResult,
    client_score: int | None = None,
    client_level: str | None = None,
    lineage_label: str | None = None,
) -> ScanResult:
    score = server.risk_score
    if client_score is not None:
        score = max(score, min(100, client_score))
    if lineage_label and lineage_label in LINEAGE_BOOST:
        score = min(100, score + LINEAGE_BOOST[lineage_label])

    has_critical = server.has_critical
    if client_level == "critical":
        has_critical = True

    level = _level_from_score(score, has_critical)
    level_rank = {"none": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}
    if client_level and level_rank.get(client_level, 0) > level_rank.get(level, 0):
        level = client_level

    reasons = list(server.risk_reasons)
    if client_score and client_score > server.risk_score:
        reasons.insert(0, "Client-side risk scan elevated score")
    if lineage_label:
        reasons.append(f"Clipboard source: {lineage_label.replace('_', ' ')}")

    return ScanResult(
        risk_score=score if level != "none" else 0,
        risk_level=level,
        findings=server.findings,
        categories=server.categories,
        has_critical=has_critical,
        risk_reasons=reasons[:10] if reasons else server.risk_reasons,
    )
