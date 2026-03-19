"""
Structured logger shared by all retest_engine modules.
Every module calls:  log = get_logger(__name__)
"""

import io
import logging
import sys


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)

    if not logger.handlers:
        # Use UTF-8 stream to avoid cp1252 crashes on Windows
        stream = sys.stdout
        if hasattr(stream, "buffer"):
            stream = io.TextIOWrapper(stream.buffer, encoding="utf-8", errors="replace")
        handler = logging.StreamHandler(stream)
        handler.setFormatter(logging.Formatter(
            "%(asctime)s [%(levelname)-5s] %(name)s: %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        ))
        logger.addHandler(handler)

    logger.setLevel(logging.DEBUG)
    return logger
