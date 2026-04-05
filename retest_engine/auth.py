"""
Authentication setup for different auth methods.

Supports:
  - form: No-op, the agent handles login via browser interaction (default)
  - bearer_token: Injects an Authorization header on all requests
  - cookie: Injects cookies directly into the browser context
  - oauth_password: Fetches a token via OAuth2 password grant, then sets Authorization header
"""

import json
from typing import Any

from playwright.async_api import Page, BrowserContext

from .logger import get_logger

log = get_logger(__name__)


async def setup_auth(
    page: Page,
    context: BrowserContext,
    credentials: dict[str, Any],
) -> bool:
    """
    Set up authentication based on the auth_type in credentials.

    Returns True if auth was set up successfully, False on error.
    If auth_type is 'form' or not specified, does nothing (agent handles it).
    """
    auth_type = credentials.get("auth_type", "form").lower()

    if auth_type == "form":
        # Agent handles login via browser interaction
        log.info("Auth type: form (agent will handle login)")
        return True

    elif auth_type == "bearer_token":
        token = credentials.get("token", "")
        if not token:
            log.error("bearer_token auth requires a 'token' field")
            return False
        await page.set_extra_http_headers({
            "Authorization": f"Bearer {token}"
        })
        log.info("Auth type: bearer_token (Authorization header set)")
        return True

    elif auth_type == "cookie":
        cookies = credentials.get("cookies", [])
        if not cookies:
            log.error("cookie auth requires a 'cookies' field (list of cookie objects)")
            return False
        # Normalize cookies: each needs at least name, value, and url/domain
        normalized = []
        for c in cookies:
            cookie = {
                "name": c.get("name", ""),
                "value": c.get("value", ""),
            }
            if c.get("domain"):
                cookie["domain"] = c["domain"]
                cookie["path"] = c.get("path", "/")
            elif c.get("url"):
                cookie["url"] = c["url"]
            else:
                log.warning(f"Cookie {c.get('name')} missing domain/url, skipping")
                continue
            normalized.append(cookie)

        if normalized:
            await context.add_cookies(normalized)
            log.info(f"Auth type: cookie ({len(normalized)} cookies injected)")
        return True

    elif auth_type == "oauth_password":
        token_url = credentials.get("token_url", "")
        client_id = credentials.get("client_id", "")
        username = credentials.get("username", "")
        password = credentials.get("password", "")

        if not token_url or not username or not password:
            log.error("oauth_password auth requires token_url, username, and password")
            return False

        try:
            # Use Playwright's request context to fetch the token
            form_data = {
                "grant_type": "password",
                "username": username,
                "password": password,
            }
            if client_id:
                form_data["client_id"] = client_id

            resp = await page.request.post(
                token_url,
                form=form_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=15000,
            )

            if resp.status != 200:
                body = await resp.text()
                log.error(f"OAuth token request failed: HTTP {resp.status}: {body[:200]}")
                return False

            data = json.loads(await resp.text())
            access_token = data.get("access_token", "")
            if not access_token:
                log.error(f"OAuth response missing access_token: {json.dumps(data)[:200]}")
                return False

            await page.set_extra_http_headers({
                "Authorization": f"Bearer {access_token}"
            })
            log.info(f"Auth type: oauth_password (token obtained, expires_in={data.get('expires_in', '?')})")
            return True

        except Exception as exc:
            log.error(f"OAuth token fetch failed: {exc}")
            return False

    else:
        log.warning(f"Unknown auth_type '{auth_type}', falling back to form login")
        return True
