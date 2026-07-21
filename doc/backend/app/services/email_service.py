"""
CyberSentinel AI — Email/EML Scanner Service
Parses raw .eml bytes and extracts headers, body text, and embedded URLs for analysis.
"""

import re
import email
from email import policy
from email.message import EmailMessage
from typing import Optional
from loguru import logger


def parse_eml(raw_bytes: bytes) -> dict:
    """
    Parse raw .eml bytes and extract security-relevant components.
    Returns a dict with: sender, subject, headers, body_text, urls, attachments, flags.
    """
    msg: EmailMessage = email.message_from_bytes(raw_bytes, policy=policy.default)

    sender = msg.get("From", "Unknown")
    reply_to = msg.get("Reply-To", "")
    subject = msg.get("Subject", "(No Subject)")
    date_str = msg.get("Date", "")
    message_id = msg.get("Message-ID", "")

    # Authentication headers
    auth_results = msg.get("Authentication-Results", "")
    dkim = msg.get("DKIM-Signature", "")
    spf_result = "unknown"
    dkim_result = "unknown"
    dmarc_result = "unknown"

    if auth_results:
        spf_match = re.search(r'spf=(\w+)', auth_results, re.IGNORECASE)
        dkim_match = re.search(r'dkim=(\w+)', auth_results, re.IGNORECASE)
        dmarc_match = re.search(r'dmarc=(\w+)', auth_results, re.IGNORECASE)
        if spf_match:
            spf_result = spf_match.group(1).lower()
        if dkim_match:
            dkim_result = dkim_match.group(1).lower()
        if dmarc_match:
            dmarc_result = dmarc_match.group(1).lower()

    # Extract body text
    body_text = ""
    html_body = ""
    attachments = []

    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            cd = str(part.get("Content-Disposition", ""))

            if "attachment" in cd:
                attachments.append({
                    "filename": part.get_filename() or "unknown",
                    "content_type": ct,
                    "size": len(part.get_payload(decode=True) or b""),
                })
                continue

            if ct == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    body_text += payload.decode("utf-8", errors="replace")
            elif ct == "text/html":
                payload = part.get_payload(decode=True)
                if payload:
                    html_body += payload.decode("utf-8", errors="replace")
    else:
        ct = msg.get_content_type()
        payload = msg.get_payload(decode=True)
        if payload:
            decoded = payload.decode("utf-8", errors="replace")
            if ct == "text/html":
                html_body = decoded
            else:
                body_text = decoded

    # If no plain text, strip HTML
    if not body_text and html_body:
        body_text = re.sub(r'<[^>]+>', ' ', html_body)
        body_text = re.sub(r'\s+', ' ', body_text).strip()

    # Extract URLs from both plain text and HTML body
    url_pattern = r'https?://[^\s<>"\')\]}>]+'
    all_text = (body_text or "") + " " + (html_body or "")
    urls = list(set(re.findall(url_pattern, all_text)))

    # Suspicious flags
    flags = []
    if sender != reply_to and reply_to:
        flags.append("Reply-To mismatch (possible spoofing)")
    if spf_result == "fail":
        flags.append("SPF check FAILED — sender domain not authorized")
    if dkim_result == "fail":
        flags.append("DKIM check FAILED — email signature invalid")
    if dmarc_result == "fail":
        flags.append("DMARC check FAILED — domain policy violation")
    if spf_result == "none":
        flags.append("No SPF record found for sender domain")
    if any(keyword in subject.lower() for keyword in
           ["urgent", "account suspended", "verify your", "click here", "limited time",
            "won", "prize", "lottery", "inheritance"]):
        flags.append(f"Subject contains urgency/bait keyword: \"{subject}\"")
    if len(urls) > 10:
        flags.append(f"Unusually high number of URLs embedded ({len(urls)})")

    # Check for suspicious attachment types
    dangerous_extensions = [".exe", ".scr", ".bat", ".cmd", ".vbs", ".js",
                            ".msi", ".pif", ".hta", ".wsf", ".iso", ".img"]
    for att in attachments:
        fname = att["filename"].lower()
        for ext in dangerous_extensions:
            if fname.endswith(ext):
                flags.append(f"Dangerous attachment type: {att['filename']}")

    return {
        "sender": sender,
        "reply_to": reply_to,
        "subject": subject,
        "date": date_str,
        "message_id": message_id,
        "auth": {
            "spf": spf_result,
            "dkim": dkim_result,
            "dmarc": dmarc_result,
            "raw_authentication_results": auth_results[:500] if auth_results else "",
        },
        "body_text": body_text[:5000],  # Truncate for AI analysis
        "body_preview": body_text[:300],
        "urls": urls[:20],  # Cap at 20
        "attachments": attachments,
        "flags": flags,
        "total_urls": len(urls),
        "total_attachments": len(attachments),
    }
