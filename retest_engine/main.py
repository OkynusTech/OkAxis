"""
Phase 5 — Public integration interface.

Single entry point consumed by the existing backend:

    from retest_engine import run_retest
    result = run_retest(retest_request)

Also runnable from the command line for quick testing:

    python -m retest_engine '{"retest_id":"r1","vulnerability_type":"IDOR",...}'
    echo '<json>' | python -m retest_engine

Input schema:
{
    "retest_id":           string,
    "vulnerability_type":  "IDOR" | "STORED_XSS",
    "target_url":          string,
    "steps_to_reproduce":  string,
    "credentials": {
        "username": string,
        "password": string
    }
}

Output schema:
{
    "retest_id": string,
    "status":    "verified" | "not_fixed" | "failed",
    "evidence": {
        "screenshots":  list[{"name": str, "data": str (base64), "path": str}],
        "logs":         list[{"level": str, "msg": str, "time": str}],
        "network_data": list[{"url": str, "method": str, "status": int, ...}],
        "details":      dict  (verifier-specific extras)
    }
}
"""

import asyncio
import json
import sys
from typing import Any

from .logger      import get_logger
from .orchestrator import run as _async_run

log = get_logger(__name__)


def run_retest(retest_request: dict[str, Any]) -> dict[str, Any]:
    """
    Synchronous wrapper around the async orchestrator.

    Safe to call from any synchronous context (Django, Flask, Express via
    subprocess, etc.).  If an event loop is already running (e.g. inside a
    Jupyter notebook or an ASGI framework), use `await _async_run_retest()`
    directly instead.

    Args:
        retest_request: Dict matching the input schema above.

    Returns:
        Dict matching the output schema above.
    """
    log.info(f"run_retest called for retest_id={retest_request.get('retest_id')!r}")

    try:
        return asyncio.run(_async_run(retest_request))
    except RuntimeError as exc:
        # Already-running event loop (e.g. inside async framework)
        if "This event loop is already running" in str(exc):
            log.warning(
                "Detected existing event loop. "
                "Use `await retest_engine._async_run_retest(request)` instead."
            )
        raise


async def _async_run_retest(retest_request: dict[str, Any]) -> dict[str, Any]:
    """
    Async entry point — use this when your caller is already async.

        result = await _async_run_retest(request)
    """
    return await _async_run(retest_request)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def _cli() -> None:
    """
    Read a JSON retest request from argv[1] or stdin, run it, print result.

    Examples:
        python -m retest_engine '{"retest_id": "test1", ...}'
        cat request.json | python -m retest_engine
    """
    if len(sys.argv) > 1:
        raw = sys.argv[1]
    else:
        log.info("Reading JSON from stdin...")
        raw = sys.stdin.read()

    try:
        request = json.loads(raw)
    except json.JSONDecodeError as exc:
        log.error(f"Invalid JSON input: {exc}")
        sys.exit(1)

    result = run_retest(request)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    _cli()
