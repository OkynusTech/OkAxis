"""
Page State Extractor -- produces a text-only representation of the
current browser state for the agent brain to reason about.

Since Groq's model is text-only (no vision), we extract:
- URL, title
- Visible text (truncated)
- Form fields with CSS selectors
- Buttons with CSS selectors
- Links
- Cookies
- Last network response
- Console errors
"""

import json
from dataclasses import dataclass, field
from typing import Any

from playwright.async_api import Page, BrowserContext


@dataclass
class PageState:
    """Everything the agent brain needs to reason about the current page."""
    url: str = ""
    title: str = ""
    visible_text: str = ""
    form_fields: list[dict] = field(default_factory=list)
    buttons: list[dict] = field(default_factory=list)
    links: list[dict] = field(default_factory=list)
    cookies: list[dict] = field(default_factory=list)
    console_errors: list[str] = field(default_factory=list)
    last_network_response: dict | None = None
    meta_tags: list[dict] = field(default_factory=list)
    response_headers: dict | None = None
    dom_summary: str = ""
    error: str | None = None


async def extract_page_state(
    page: Page,
    context: BrowserContext,
    last_response: dict | None = None,
) -> PageState:
    """Extract a comprehensive text-only snapshot of the current page."""
    state = PageState()

    state.url = page.url
    try:
        state.title = await page.title()
    except Exception:
        state.title = ""

    # Visible text (truncated)
    try:
        raw_text = await page.inner_text("body")
        state.visible_text = raw_text[:4000].strip()
    except Exception:
        state.visible_text = "[could not extract page text]"

    # Form fields
    try:
        state.form_fields = await page.evaluate("""() => {
            const fields = [];
            document.querySelectorAll('input, textarea, select').forEach(el => {
                const f = {
                    tag: el.tagName.toLowerCase(),
                    type: el.type || '',
                    name: el.name || '',
                    id: el.id || '',
                    placeholder: el.placeholder || '',
                    value: el.type === 'password' ? '***' : (el.value || '').substring(0, 100),
                };
                if (el.id) f.selector = '#' + el.id;
                else if (el.name) f.selector = el.tagName.toLowerCase() + '[name="' + el.name + '"]';
                else f.selector = null;
                fields.push(f);
            });
            return fields;
        }""")
    except Exception:
        state.form_fields = []

    # Buttons
    try:
        state.buttons = await page.evaluate("""() => {
            const buttons = [];
            document.querySelectorAll('button, input[type="submit"], input[type="button"]').forEach(el => {
                const b = {
                    text: (el.innerText || el.value || '').trim().substring(0, 50),
                    type: el.type || '',
                };
                if (el.id) b.selector = '#' + el.id;
                else if (el.name) b.selector = el.tagName.toLowerCase() + '[name="' + el.name + '"]';
                else if (b.text) b.selector = el.tagName.toLowerCase() + ':has-text("' + b.text.substring(0, 30) + '")';
                else b.selector = el.tagName.toLowerCase() + (el.type ? '[type="' + el.type + '"]' : '');
                buttons.push(b);
            });
            return buttons;
        }""")
    except Exception:
        state.buttons = []

    # Links (cap at 20)
    try:
        state.links = await page.evaluate("""() => {
            const links = [];
            document.querySelectorAll('a[href]').forEach(el => {
                links.push({
                    text: (el.innerText || '').trim().substring(0, 50),
                    href: el.getAttribute('href'),
                });
            });
            return links.slice(0, 40);
        }""")
    except Exception:
        state.links = []

    # Cookies
    try:
        cookies = await context.cookies()
        state.cookies = [
            {"name": c["name"], "value": c["value"][:50], "domain": c.get("domain", "")}
            for c in cookies
        ]
    except Exception:
        state.cookies = []

    # Meta tags (security-relevant)
    try:
        state.meta_tags = await page.evaluate("""() => {
            const metas = [];
            document.querySelectorAll('meta').forEach(el => {
                const name = el.getAttribute('name') || el.getAttribute('http-equiv') || '';
                const content = el.getAttribute('content') || '';
                if (name && content) metas.push({ name, content: content.substring(0, 200) });
            });
            return metas.slice(0, 15);
        }""")
    except Exception:
        state.meta_tags = []

    # DOM summary
    try:
        state.dom_summary = await page.evaluate("""() => {
            return `forms:${document.forms.length} inputs:${document.querySelectorAll('input').length} buttons:${document.querySelectorAll('button').length} links:${document.querySelectorAll('a').length} iframes:${document.querySelectorAll('iframe').length}`;
        }""")
    except Exception:
        state.dom_summary = ""

    # Response headers from last navigation
    if last_response:
        state.response_headers = {}
        for header in ['content-security-policy', 'x-frame-options', 'strict-transport-security',
                       'x-content-type-options', 'x-xss-protection', 'access-control-allow-origin']:
            val = last_response.get('headers', {}).get(header)
            if val:
                state.response_headers[header] = val

    # Last network response
    state.last_network_response = last_response

    return state


def state_to_text(state: PageState) -> str:
    """Format PageState as a concise text block for the LLM."""
    parts = []
    parts.append(f"URL: {state.url}")
    parts.append(f"TITLE: {state.title}")

    if state.last_network_response:
        r = state.last_network_response
        parts.append(f"LAST_RESPONSE: HTTP {r.get('status', '?')} {r.get('url', '')}")
        body = r.get("body_snippet", "")
        if body:
            parts.append(f"RESPONSE_BODY: {body[:500]}")

    if state.visible_text:
        parts.append(f"VISIBLE_TEXT:\n{state.visible_text}")

    if state.form_fields:
        parts.append(f"FORM_FIELDS: {json.dumps(state.form_fields)}")

    if state.buttons:
        parts.append(f"BUTTONS: {json.dumps(state.buttons)}")

    if state.links:
        links_brief = [{"text": l["text"], "href": l["href"]} for l in state.links[:10]]
        parts.append(f"LINKS: {json.dumps(links_brief)}")

    if state.cookies:
        cookie_str = ", ".join(f"{c['name']}={c['value']}" for c in state.cookies)
        parts.append(f"COOKIES: {cookie_str}")

    if state.dom_summary:
        parts.append(f"DOM_SUMMARY: {state.dom_summary}")

    if state.response_headers:
        headers_str = ", ".join(f"{k}: {v}" for k, v in state.response_headers.items())
        parts.append(f"SECURITY_HEADERS: {headers_str}")

    if state.console_errors:
        parts.append(f"CONSOLE_ERRORS: {'; '.join(state.console_errors[-5:])}")

    if state.error:
        parts.append(f"EXTRACTION_ERROR: {state.error}")

    return "\n".join(parts)
