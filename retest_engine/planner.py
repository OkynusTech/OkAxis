"""
Phase 2 — AI Planning via Groq API.

Converts a human-readable "steps_to_reproduce" string into a structured
JSON action plan that the Playwright executor can run.

The AI is ONLY allowed to plan — it never executes anything.
"""

import json
import re
from typing import Any

from groq import Groq

from .config import GROQ_API_KEY, GROQ_MODEL
from .logger import get_logger

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Strict system prompt — no wiggle room for the model
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = """
You are a security test automation planner for VAPT (Vulnerability Assessment & Penetration Testing).

Convert the vulnerability reproduction steps into a structured JSON action plan.

CRITICAL RULES:
1. Output ONLY valid JSON. No markdown. No code fences. No preamble. No explanation.
2. Use {{USERNAME}} and {{PASSWORD}} as credential placeholders.
3. Use {{XSS_PAYLOAD}} as the exact fill value for XSS injection fields.
4. Use {{TARGET_ID}} for the victim's resource identifier in IDOR tests.
5. Keep the action list minimal — only the steps needed to reach and trigger the vulnerability.

Output schema (output exactly this structure, no extra keys):
{
  "vulnerability_type": "IDOR" or "STORED_XSS",
  "login_actions": [ <Action>, ... ],
  "test_actions":  [ <Action>, ... ],
  "injection_selector":      "<CSS selector of injection field, or null>",
  "vulnerable_url_template": "<URL with {{TARGET_ID}} placeholder, or null>",
  "reflection_url":          "<URL where injected XSS payload renders, or null>"
}

Supported Action types:
  navigate          : {"type": "navigate",          "url": "...",      "description": "..."}
  fill              : {"type": "fill",              "selector": "...", "value": "...", "description": "..."}
  click             : {"type": "click",             "selector": "...", "description": "..."}
  wait_for_selector : {"type": "wait_for_selector", "selector": "...", "description": "..."}
  screenshot        : {"type": "screenshot",        "name": "...",     "description": "..."}
  wait_ms           : {"type": "wait_ms",           "ms": 2000,        "description": "..."}

For IDOR:
  - login_actions: authenticate the user.
  - test_actions: navigate to the resource that uses {{TARGET_ID}}.
  - vulnerable_url_template: the full URL with {{TARGET_ID}}, e.g. "https://app.example.com/api/users/{{TARGET_ID}}/data"
  - injection_selector: null
  - reflection_url: null

For STORED_XSS:
  - login_actions: authenticate the user.
  - test_actions: navigate to the injection form, fill {{XSS_PAYLOAD}} into the vulnerable field, submit, then navigate to reflection_url.
  - injection_selector: CSS selector of the vulnerable input/textarea.
  - reflection_url: URL where the stored payload will be rendered.
  - vulnerable_url_template: null

Use only valid CSS selectors. Prefer #id, then [name="..."], then input[type="..."].
""".strip()


def create_action_plan(
    vulnerability_type: str,
    steps_to_reproduce: str,
    target_url: str,
) -> dict[str, Any]:
    """
    Call Groq LLM and return a structured action plan dict.

    Raises ValueError if the model returns unparseable JSON.
    Does NOT run any browser code.
    """
    if not GROQ_API_KEY:
        raise EnvironmentError(
            "GROQ_API_KEY is not set. Add it to your .env file."
        )

    log.info(f"Planning action for vulnerability_type={vulnerability_type}")

    client = Groq(api_key=GROQ_API_KEY)

    user_message = (
        f"Vulnerability Type: {vulnerability_type}\n"
        f"Target URL: {target_url}\n\n"
        f"Steps to Reproduce:\n{steps_to_reproduce}\n\n"
        "Generate the JSON action plan now."
    )

    log.debug("Sending planning request to Groq...")
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": user_message},
        ],
        temperature=0.1,   # Low temperature for deterministic, structured output
        max_tokens=2048,
    )

    raw: str = response.choices[0].message.content.strip()
    log.debug(f"Planner raw response (first 300 chars): {raw[:300]}")

    # Strip accidental markdown fences the model may add despite instructions
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\s*```\s*$", "", raw, flags=re.MULTILINE)
    raw = raw.strip()

    try:
        plan: dict = json.loads(raw)
    except json.JSONDecodeError as exc:
        log.error(f"Planner returned invalid JSON: {exc}")
        log.error(f"Full raw output:\n{raw}")
        raise ValueError(f"Groq planner returned non-JSON output: {exc}") from exc

    login_count = len(plan.get("login_actions", []))
    test_count  = len(plan.get("test_actions",  []))
    log.info(
        f"Action plan created: {login_count} login step(s), "
        f"{test_count} test step(s)"
    )

    return plan
