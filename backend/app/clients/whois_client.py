"""
CyberSentinel AI — WHOIS / Domain Info Client (Optional)
"""

import httpx
from loguru import logger
from datetime import datetime


async def check_domain_age(url: str) -> str | None:
    """
    Check domain registration age using an API.
    Returns domain age string (e.g., '15 days') or None.
    """
    try:
        # Extract domain from URL
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path

        async with httpx.AsyncClient(timeout=10.0) as client:
            # Using a free WHOIS API
            response = await client.get(
                f"https://api.api-ninjas.com/v1/whois?domain={domain}",
            )

            if response.status_code != 200:
                return None

            data = response.json()
            creation_date = data.get("creation_date")

            if creation_date:
                if isinstance(creation_date, list):
                    creation_date = creation_date[0]
                created = datetime.fromisoformat(str(creation_date))
                age_days = (datetime.utcnow() - created).days
                age_str = f"{age_days} days"
                logger.info(f"🌐 WHOIS: {domain} → age = {age_str}")
                return age_str

        return None
    except Exception as e:
        logger.warning(f"🌐 WHOIS error: {e}")
        return None
