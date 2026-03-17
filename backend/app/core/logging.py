"""
CyberSentinel AI — Structured Logging
Uses Loguru for structured, colored logging with request tracing.
"""

import sys
from loguru import logger
import contextvars
import uuid

# Context variable for request tracing
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

def _request_id_filter(record):
    """Injects request_id from contextvar into the log record's extra dictionary."""
    record["extra"]["request_id"] = request_id_var.get()
    return True

def setup_logging():
    """Configure Loguru for the application."""
    # Remove default handler
    logger.remove()

    log_format_console = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<magenta>{extra[request_id]}</magenta> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "{message}"
    )
    
    log_format_file = (
        "{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {extra[request_id]} | "
        "{name}:{function}:{line} | {message}"
    )

    # Console handler with pretty format
    logger.add(
        sys.stdout,
        format=log_format_console,
        level="DEBUG",
        filter=_request_id_filter,
        colorize=True,
    )

    # File handler for persistence
    logger.add(
        "logs/cybersentinel.log",
        rotation="10 MB",
        retention="7 days",
        format=log_format_file,
        filter=_request_id_filter,
        level="INFO",
    )

    logger.info("CyberSentinel AI logging initialized")

__all__ = ["logger", "setup_logging", "request_id_var"]
