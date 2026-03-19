"""
Agentic Orchestrator -- observe-reason-act loop.

Replaces the old linear plan-execute-verify pipeline.

The agent:
  1. Takes an action (decided by agent_brain via Groq LLM)
  2. Executes it in the browser (via Playwright)
  3. Extracts page state as text (via page_state)
  4. Sends state back to agent_brain for reasoning
  5. Repeats until verdict or max turns
"""

import asyncio
import time
import traceback
from typing import Any

from .agent_brain import AgentBrain, AgentTurn
from .page_state import extract_page_state, state_to_text
from .executor import browser_session, _take_screenshot, ExecutionResult
from .config import (
    MAX_AGENT_TURNS, BROWSER_TIMEOUT_MS,
    XSS_MARKER_PAYLOAD,
)
from .logger import get_logger

log = get_logger(__name__)

_SUPPORTED_TYPES = {"IDOR", "STORED_XSS"}


async def run(retest_request: dict[str, Any]) -> dict[str, Any]:
    """Orchestrate the agentic retest loop."""
    retest_id   = retest_request.get("retest_id", "unknown")
    vuln_type   = str(retest_request.get("vulnerability_type", "")).upper()
    target_url  = retest_request.get("target_url", "")
    steps       = retest_request.get("steps_to_reproduce", "")
    credentials = retest_request.get("credentials", {})

    log.info(f"=== Agentic retest started: id={retest_id} type={vuln_type} ===")

    # -- Input validation --
    if vuln_type not in _SUPPORTED_TYPES:
        return _output(retest_id, "failed", _empty_evidence(),
                       error=f"Unsupported type '{vuln_type}'")
    if not target_url:
        return _output(retest_id, "failed", _empty_evidence(),
                       error="target_url is empty")
    if not credentials.get("username") or not credentials.get("password"):
        return _output(retest_id, "failed", _empty_evidence(),
                       error="missing credentials")

    # -- Initialize agent brain --
    xss_payload = XSS_MARKER_PAYLOAD if vuln_type == "STORED_XSS" else ""
    try:
        brain = AgentBrain(
            vuln_type=vuln_type,
            target_url=target_url,
            steps_to_reproduce=steps,
            credentials=credentials,
            xss_payload=xss_payload,
        )
    except EnvironmentError as exc:
        return _output(retest_id, "failed", _empty_evidence(), error=str(exc))

    # -- Run agent loop inside browser session --
    async with browser_session() as (page, context, exec_result):

        last_response = None
        verdict = None

        # Intercept network responses for state extraction
        async def _on_response_for_state(resp):
            nonlocal last_response
            try:
                body = await resp.text()
            except Exception:
                body = ""
            last_response = {
                "url": resp.url,
                "method": resp.request.method,
                "status": resp.status,
                "body_snippet": body[:500],
            }

        page.on("response", _on_response_for_state)

        parse_failures = 0

        for turn_num in range(1, MAX_AGENT_TURNS + 1):
            log.info(f"--- Turn {turn_num}/{MAX_AGENT_TURNS} ---")

            # OBSERVE: extract current page state
            try:
                state = await extract_page_state(page, context, last_response)
                state_text = state_to_text(state)
            except Exception as exc:
                state_text = f"[State extraction failed: {exc}]"
                log.warning(f"State extraction error: {exc}")

            # REASON: ask the brain for next action
            try:
                action = brain.decide_next_action(state_text)
                parse_failures = 0  # reset on success
            except Exception as exc:
                parse_failures += 1
                log.error(f"Agent brain error (attempt {parse_failures}): {exc}")
                if parse_failures >= 2:
                    log.error("Two consecutive parse failures, stopping.")
                    break
                brain.feed_action_result(
                    f"ERROR: Could not parse your response: {exc}. "
                    f"Please respond with ONLY a valid JSON object."
                )
                continue

            action_type = action.get("action", "")
            reasoning = action.get("reasoning", "")
            log.info(f"  Action: {action_type} | Reasoning: {reasoning[:120]}")

            # CHECK FOR VERDICT
            if action_type == "verdict":
                verdict = action
                log.info(f"  VERDICT: {action.get('status')} "
                         f"(confidence={action.get('confidence', 0):.2f})")
                # Take final screenshot
                await _take_screenshot(page, exec_result, "final_state")
                break

            # ACT: execute the action
            action_result = await _execute_action(
                page, context, exec_result, action, turn_num
            )
            log.info(f"  Result: {action_result[:150]}")

            # Take a screenshot after every action for evidence
            await _take_screenshot(page, exec_result, f"turn_{turn_num}")

            # Record turn
            turn = AgentTurn(
                turn_number=turn_num,
                page_state_text=state_text[:500],  # truncate for storage
                action=action,
                action_result=action_result,
            )
            brain.record_turn(turn)
            brain.feed_action_result(action_result)

        # -- Force verdict if none issued --
        if verdict is None:
            log.warning("Agent exhausted turns without issuing a verdict.")
            verdict = {
                "action": "verdict",
                "status": "inconclusive",
                "confidence": 0.2,
                "summary": "Agent could not determine vulnerability status within the turn limit.",
                "reasoning": "Max turns reached without definitive evidence.",
            }

    # -- Map verdict to engine status --
    status = _map_verdict(verdict)

    # -- Assemble evidence --
    evidence = {
        "screenshots": exec_result.screenshots,
        "logs": exec_result.logs,
        "network_data": exec_result.network_data[:20],
        "details": {
            "confidence": verdict.get("confidence", 0.0),
            "reason": verdict.get("summary", ""),
            "reasoning_chain": verdict.get("reasoning", ""),
            "turns_used": len(brain.turns),
            "max_turns": MAX_AGENT_TURNS,
            "agent_turns": [
                {
                    "turn": t.turn_number,
                    "action": t.action.get("action", ""),
                    "reasoning": t.action.get("reasoning", ""),
                    "result": t.action_result[:300],
                }
                for t in brain.turns
            ],
        },
    }

    log.info(f"=== Agentic retest completed: id={retest_id} "
             f"status={status} turns={len(brain.turns)} ===")
    return _output(retest_id, status, evidence)


# ---------------------------------------------------------------------------
# Single-action executor
# ---------------------------------------------------------------------------

async def _execute_action(
    page, context, exec_result: ExecutionResult,
    action: dict, turn_num: int,
) -> str:
    """
    Execute one agent action on the browser.
    Returns a text description of the result for the brain.
    """
    atype = action.get("action", "")

    try:
        if atype == "navigate":
            url = action["url"]
            resp = await page.goto(
                url, timeout=BROWSER_TIMEOUT_MS,
                wait_until="domcontentloaded"
            )
            status = resp.status if resp else "unknown"
            return f"SUCCESS: Navigated to {url} (HTTP {status})"

        elif atype == "fill":
            selector = action["selector"]
            value = action.get("value", "")
            await page.wait_for_selector(selector, timeout=10000)
            await page.fill(selector, value)
            display = "***" if "password" in selector.lower() else value[:50]
            return f"SUCCESS: Filled '{selector}' with '{display}'"

        elif atype == "click":
            selector = action["selector"]
            await page.wait_for_selector(selector, timeout=10000)
            await page.click(selector)
            await asyncio.sleep(1)  # brief wait for navigation/response
            return f"SUCCESS: Clicked '{selector}'. Page now at {page.url}"

        elif atype == "api_request":
            method = action.get("method", "GET").upper()
            url = action["url"]
            headers = action.get("headers", {})
            body = action.get("body")

            if method == "GET":
                resp = await page.request.get(
                    url, headers=headers, timeout=BROWSER_TIMEOUT_MS
                )
            elif method == "POST":
                resp = await page.request.post(
                    url, headers=headers, data=body,
                    timeout=BROWSER_TIMEOUT_MS
                )
            else:
                resp = await page.request.fetch(
                    url, method=method, headers=headers,
                    data=body, timeout=BROWSER_TIMEOUT_MS
                )

            resp_text = await resp.text()
            return (
                f"SUCCESS: {method} {url} -> HTTP {resp.status}. "
                f"Body ({len(resp_text)} chars): {resp_text[:500]}"
            )

        elif atype == "evaluate_js":
            expr = action["expression"]
            result = await page.evaluate(expr)
            return f"SUCCESS: evaluate('{expr}') returned: {result!r}"

        elif atype == "wait":
            ms = int(action.get("ms", 1000))
            await asyncio.sleep(ms / 1000)
            return f"SUCCESS: Waited {ms}ms"

        else:
            return f"ERROR: Unknown action type '{atype}'"

    except Exception as exc:
        error_msg = f"ERROR: {atype} failed: {exc}"
        exec_result.logs.append({
            "level": "error",
            "msg": error_msg,
            "time": time.strftime("%Y-%m-%dT%H:%M:%S"),
        })
        await _take_screenshot(page, exec_result, f"error_turn{turn_num}")
        return error_msg


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _map_verdict(verdict: dict) -> str:
    """Map agent verdict to engine status."""
    v = verdict.get("status", "").lower()
    if v == "not_fixed":
        return "not_fixed"
    elif v in ("verified", "fixed"):
        return "verified"
    else:
        return "failed"  # inconclusive or unknown


def _empty_evidence() -> dict:
    return {"screenshots": [], "logs": [], "network_data": [], "details": {}}


def _output(retest_id: str, status: str, evidence: dict,
            error: str | None = None) -> dict:
    result = {"retest_id": retest_id, "status": status, "evidence": evidence}
    if error:
        result["error"] = error
    return result
