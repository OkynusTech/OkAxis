"""
Action schema -- defines what actions the agent can take.
The LLM must output one of these as JSON each turn.
"""

ACTION_SCHEMA_TEXT = """
You must respond with exactly ONE JSON object per turn. No markdown, no explanation outside JSON.

Supported actions:

1. navigate: Go to a URL
   {"action": "navigate", "url": "http://...", "reasoning": "why I'm navigating here"}

2. fill: Type into a form field (use selectors from FORM_FIELDS)
   {"action": "fill", "selector": "input[name='username']", "value": "bob", "reasoning": "why"}

3. click: Click an element (use selectors from BUTTONS or FORM_FIELDS)
   {"action": "click", "selector": "button:has-text('Login')", "reasoning": "why"}

4. api_request: Make a direct HTTP request (inherits browser cookies/session)
   {"action": "api_request", "method": "GET", "url": "http://...", "headers": {}, "body": null, "reasoning": "why"}

5. evaluate_js: Run JavaScript in the page context
   {"action": "evaluate_js", "expression": "document.title", "reasoning": "why"}

6. wait: Wait for a specified duration (milliseconds)
   {"action": "wait", "ms": 2000, "reasoning": "why"}

7. verdict: Declare the FINAL result (this TERMINATES the test)
   {"action": "verdict", "status": "not_fixed" | "verified" | "inconclusive",
    "confidence": 0.0-1.0,
    "summary": "One-line human-readable explanation",
    "reasoning": "Detailed chain of thought about evidence gathered"}

IMPORTANT: "not_fixed" means the vulnerability STILL EXISTS. "verified" means the fix WORKS and the vuln is gone.
"""

VALID_ACTIONS = {
    "navigate", "fill", "click", "api_request",
    "evaluate_js", "wait", "verdict",
}
