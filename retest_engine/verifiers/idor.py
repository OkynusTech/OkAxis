"""
Phase 3 — IDOR Verification.

Strategy
--------
1. Login using the provided credentials (execute login_actions).
2. Access the resource at `vulnerable_url_template` with the *attacker's own* ID
   (from steps_to_reproduce or auto-detected from network traffic).
3. Replace the ID with a different one (TARGET_ID extracted from steps or +1/-1
   heuristic) and replay the request using the authenticated browser session.
4. Compare HTTP status and response size:
   - 200 + non-trivial body  → IDOR still exploitable → success=True (not_fixed)
   - 4xx / empty body        → access denied         → success=False (verified)

Returns a VerificationResult dict:
  {
    "success":    bool,          # True = vulnerability NOT fixed
    "confidence": float,         # 0.0 – 1.0
    "evidence":   dict,
  }
"""

import re
from typing import Any

from ..config   import BROWSER_TIMEOUT_MS
from ..executor import browser_session, run_actions, ExecutionResult
from ..logger   import get_logger

log = get_logger(__name__)

# Minimum response body length that signals "real data" vs an error page
_MIN_DATA_BYTES = 64


async def verify(
    plan: dict[str, Any],
    credentials: dict[str, str],
    steps_to_reproduce: str,
) -> dict[str, Any]:
    """
    Run IDOR verification.

    Args:
        plan:               Action plan from the planner.
        credentials:        {"username": "...", "password": "..."}
        steps_to_reproduce: Original steps text (used to extract IDs).

    Returns:
        VerificationResult dict.
    """
    log.info("Starting IDOR verification")

    login_actions = plan.get("login_actions", [])
    test_actions  = plan.get("test_actions",  [])
    url_template  = plan.get("vulnerable_url_template")  # may be None

    variables = {
        "USERNAME": credentials.get("username", ""),
        "PASSWORD": credentials.get("password", ""),
    }

    # ── Extract IDs from steps_to_reproduce ──────────────────────────────
    own_id, target_id = _extract_ids(steps_to_reproduce)
    log.info(f"IDs extracted — own_id={own_id!r}, target_id={target_id!r}")

    if own_id:
        variables["OWN_ID"] = own_id
    if target_id:
        variables["TARGET_ID"] = target_id

    async with browser_session() as (page, context, exec_result):

        # ── Step 1: Login ─────────────────────────────────────────────────
        log.info("Running login actions")
        login_ok = await run_actions(page, exec_result, login_actions, variables)
        if not login_ok:
            log.error("Login failed — cannot proceed with IDOR test")
            return _result(
                success=False,
                confidence=0.0,
                evidence={"error": "login_failed", "logs": exec_result.logs},
            )

        # ── Step 2: Run test_actions (navigate to resource) ───────────────
        if test_actions:
            log.info("Running test actions")
            await run_actions(page, exec_result, test_actions, variables,
                              stop_on_error=False)

        # ── Step 3: Probe vulnerable URL with own ID, then target ID ──────
        probe_url = _resolve_probe_url(
            url_template, exec_result.network_data, own_id, target_id
        )

        if not probe_url:
            log.warning("Could not determine a probe URL — falling back to heuristic")
            return _result(
                success=False,
                confidence=0.2,
                evidence={
                    "reason": "Could not determine a testable URL with a numeric ID.",
                    "network_requests_captured": len(exec_result.network_data),
                },
            )

        log.info(f"Probing target URL: {probe_url}")

        try:
            resp = await page.request.get(probe_url, timeout=BROWSER_TIMEOUT_MS)
        except Exception as exc:
            log.error(f"Request to probe URL failed: {exc}")
            return _result(
                success=False,
                confidence=0.2,
                evidence={"error": str(exc), "probe_url": probe_url},
            )

        status   = resp.status
        body     = await _safe_text(resp)
        is_idor  = (status == 200 and len(body) >= _MIN_DATA_BYTES)

        log.info(
            f"IDOR probe result — status={status}, "
            f"body_len={len(body)}, is_idor={is_idor}"
        )

        return _result(
            success=is_idor,
            confidence=0.9 if is_idor else 0.75,
            evidence={
                "probe_url":       probe_url,
                "http_status":     status,
                "response_snippet": body[:500],
                "screenshots":     exec_result.screenshots,
                "network_data":    exec_result.network_data[:10],
            },
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_ids(steps: str) -> tuple[str | None, str | None]:
    """
    Look for patterns like 'user_id=123' or '/users/123' in the steps text.
    Returns (own_id, target_id) — tries to find two distinct numeric IDs.
    """
    # Match standalone integers 1–9 digits that look like IDs
    candidates = re.findall(r"\b(\d{1,9})\b", steps)
    unique = list(dict.fromkeys(candidates))  # preserve order, deduplicate

    if len(unique) >= 2:
        return unique[0], unique[1]
    if len(unique) == 1:
        n = int(unique[0])
        target = str(n + 1) if n < 99999 else str(n - 1)
        return unique[0], target
    return None, None


def _resolve_probe_url(
    url_template: str | None,
    network_data: list[dict],
    own_id: str | None,
    target_id: str | None,
) -> str | None:
    """
    Build the URL to probe for unauthorized access.

    Priority:
    1. Use `vulnerable_url_template` from the plan (most accurate).
    2. Scan captured network requests for URLs containing `own_id`.
    3. Give up.
    """
    if url_template and target_id:
        url = url_template.replace("{{TARGET_ID}}", target_id)
        # Also replace OWN_ID if present
        if own_id:
            url = url.replace("{{OWN_ID}}", own_id)
        return url

    if own_id and target_id:
        for entry in network_data:
            req_url = entry.get("url", "")
            if own_id in req_url:
                probed = req_url.replace(own_id, target_id, 1)
                log.debug(f"Derived probe URL from network: {probed}")
                return probed

    return None


async def _safe_text(resp: Any) -> str:
    try:
        return await resp.text()
    except Exception:
        return ""


def _result(success: bool, confidence: float, evidence: dict) -> dict:
    return {"success": success, "confidence": confidence, "evidence": evidence}
