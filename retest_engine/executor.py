"""
Phase 1 — Playwright Executor.

Runs a list of structured actions inside a real browser.
Captures screenshots, console logs, and network traffic.

Design decisions:
  - Uses an async context manager so callers (verifiers) can keep the
    browser session alive after login for additional test steps.
  - All {{VAR}} placeholders in action values are substituted before use.
  - Each step is logged. Failures are non-fatal by default; a screenshot
    is taken and the error is recorded so evidence is preserved.
"""

import asyncio
import base64
import os
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator

from playwright.async_api import (
    async_playwright,
    BrowserContext,
    Page,
    Response,
)

from .config import HEADLESS, BROWSER_TIMEOUT_MS, SCREENSHOT_DIR
from .logger import get_logger

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class ExecutionResult:
    """Collects all evidence produced during an execution session."""
    screenshots: list[dict] = field(default_factory=list)
    # Each entry: {"name": str, "data": str (base64), "path": str}

    logs: list[dict] = field(default_factory=list)
    # Each entry: {"level": str, "msg": str, "time": str}

    network_data: list[dict] = field(default_factory=list)
    # Each entry: {"url": str, "method": str, "status": int,
    #              "response_body": str, "headers": dict}

    success: bool = True
    error: str | None = None


# ---------------------------------------------------------------------------
# Variable substitution
# ---------------------------------------------------------------------------

def _sub(value: str, variables: dict[str, str]) -> str:
    """Replace {{KEY}} placeholders in `value` with values from `variables`."""
    for key, val in variables.items():
        value = value.replace(f"{{{{{key}}}}}", str(val))
    return value


# ---------------------------------------------------------------------------
# Core context manager — keeps Playwright alive across multiple action batches
# ---------------------------------------------------------------------------

@asynccontextmanager
async def browser_session(
    headless: bool = HEADLESS,
) -> AsyncGenerator[tuple[Page, BrowserContext, ExecutionResult], None]:
    """
    Async context manager that spins up a Playwright browser, yields
    (page, context, result), and tears down on exit.

    Usage:
        async with browser_session() as (page, ctx, result):
            await run_actions(page, result, login_actions, variables)
            # ... more custom steps ...
    """
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    result = ExecutionResult()

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=headless)
        context = await browser.new_context()
        page = await context.new_page()

        # ── Console log capture ──────────────────────────────────────────
        def _on_console(msg: Any) -> None:
            result.logs.append({
                "level": msg.type,
                "msg":   msg.text,
                "time":  _now(),
            })

        page.on("console", _on_console)

        # ── Network response capture ─────────────────────────────────────
        async def _on_response(resp: Response) -> None:
            try:
                body = await resp.text()
            except Exception:
                body = ""
            result.network_data.append({
                "url":           resp.url,
                "method":        resp.request.method,
                "status":        resp.status,
                "response_body": body[:4096],   # Cap to avoid huge payloads
                "headers":       dict(resp.headers),
            })

        page.on("response", _on_response)

        try:
            yield page, context, result
        finally:
            await browser.close()


# ---------------------------------------------------------------------------
# Action runner — executes a list of action dicts on an existing page
# ---------------------------------------------------------------------------

async def run_actions(
    page: Page,
    result: ExecutionResult,
    actions: list[dict],
    variables: dict[str, str] | None = None,
    stop_on_error: bool = True,
) -> bool:
    """
    Execute a list of action dicts on `page`.

    Returns True if all actions completed successfully, False otherwise.
    Appends evidence (screenshots, logs) directly into `result`.
    """
    variables = variables or {}
    total = len(actions)

    for i, action in enumerate(actions, start=1):
        atype = action.get("type", "")
        desc  = action.get("description", f"step {i}")
        log.info(f"[{i}/{total}] {atype}: {desc}")

        try:
            await _dispatch(page, result, action, variables, i)
        except Exception as exc:
            msg = f"[{atype}] '{desc}' failed: {exc}"
            log.error(msg)
            result.logs.append({"level": "error", "msg": msg, "time": _now()})
            result.success = False
            result.error = str(exc)

            # Always try to grab an error screenshot
            await _take_screenshot(page, result, f"error_{atype}_step{i}")

            if stop_on_error:
                log.warning("Stopping execution after failure (stop_on_error=True).")
                return False

    return result.success


# ---------------------------------------------------------------------------
# Action dispatcher
# ---------------------------------------------------------------------------

async def _dispatch(
    page: Page,
    result: ExecutionResult,
    action: dict,
    variables: dict[str, str],
    step_num: int,
) -> None:
    atype = action.get("type", "")

    if atype == "navigate":
        url = _sub(action["url"], variables)
        await page.goto(url, timeout=BROWSER_TIMEOUT_MS, wait_until="domcontentloaded")
        log.debug(f"  → navigated to {url}")

    elif atype == "fill":
        selector = _sub(action["selector"], variables)
        value    = _sub(action.get("value", ""), variables)
        await page.wait_for_selector(selector, timeout=BROWSER_TIMEOUT_MS)
        await page.fill(selector, value)
        # Mask passwords in logs
        display = "***" if "password" in selector.lower() else value[:40]
        log.debug(f"  → filled '{selector}' = '{display}'")

    elif atype == "click":
        selector = _sub(action["selector"], variables)
        await page.wait_for_selector(selector, timeout=BROWSER_TIMEOUT_MS)
        await page.click(selector)
        log.debug(f"  → clicked '{selector}'")

    elif atype == "wait_for_selector":
        selector = _sub(action["selector"], variables)
        await page.wait_for_selector(selector, timeout=BROWSER_TIMEOUT_MS)
        log.debug(f"  → selector present: '{selector}'")

    elif atype == "screenshot":
        name = action.get("name", f"step_{step_num}")
        await _take_screenshot(page, result, name)

    elif atype == "wait_ms":
        ms = int(action.get("ms", 1000))
        await asyncio.sleep(ms / 1000)
        log.debug(f"  → waited {ms}ms")

    else:
        log.warning(f"  → unknown action type '{atype}', skipping")


# ---------------------------------------------------------------------------
# Screenshot helper
# ---------------------------------------------------------------------------

async def _take_screenshot(page: Page, result: ExecutionResult, name: str) -> None:
    try:
        timestamp = int(time.time())
        path = os.path.join(SCREENSHOT_DIR, f"{name}_{timestamp}.png")
        await page.screenshot(path=path, full_page=True)

        with open(path, "rb") as fh:
            encoded = base64.b64encode(fh.read()).decode()

        result.screenshots.append({"name": name, "data": encoded, "path": path})
        log.debug(f"  → screenshot saved: {path}")
    except Exception as exc:
        log.warning(f"  → screenshot failed: {exc}")


# ---------------------------------------------------------------------------
# Timestamp helper
# ---------------------------------------------------------------------------

def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S")
