#!/usr/bin/env python3
"""
Test client for retest_engine server.

Usage:
    python retest_engine/test_client.py --help
    python retest_engine/test_client.py health
    python retest_engine/test_client.py retest --id r_001 --type IDOR --url https://... --steps "..." --user alice --pass secret
    python retest_engine/test_client.py demo   # Run a demo with sample requests
"""

import argparse
import json
import sys
import time
from typing import Any

try:
    import requests
except ImportError:
    print("ERROR: requests module not found. Install with: pip install requests")
    sys.exit(1)

from .logger import get_logger

log = get_logger("test_client")

# Server URL (change if running on different host/port)
SERVER_URL = "http://localhost:5555"


def _print_response(response: requests.Response) -> None:
    """Pretty-print the response."""
    try:
        data = response.json()
        print(json.dumps(data, indent=2))
    except Exception:
        print(response.text)


def health_check() -> None:
    """Check if server is running."""
    try:
        resp = requests.get(f"{SERVER_URL}/health", timeout=5)
        _print_response(resp)
    except requests.exceptions.ConnectionError:
        print(f"ERROR: Cannot connect to {SERVER_URL}")
        print("Is the server running? Start it with:")
        print("  python retest_engine/server.py")
        sys.exit(1)
    except Exception as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)


def get_info() -> None:
    """Get service info."""
    try:
        resp = requests.get(f"{SERVER_URL}/info", timeout=5)
        _print_response(resp)
    except Exception as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)


def submit_retest(
    retest_id: str,
    vuln_type: str,
    target_url: str,
    steps: str,
    username: str,
    password: str,
) -> dict[str, Any]:
    """Submit a retest request and return the result."""
    payload = {
        "retest_id": retest_id,
        "vulnerability_type": vuln_type,
        "target_url": target_url,
        "steps_to_reproduce": steps,
        "credentials": {
            "username": username,
            "password": password,
        },
    }

    print(f"\n📝 Submitting retest request: {retest_id}")
    print(f"   Type: {vuln_type}")
    print(f"   Target: {target_url}")
    print(f"   Waiting...\n")

    try:
        resp = requests.post(
            f"{SERVER_URL}/retest",
            json=payload,
            timeout=120,  # Retests can take a while
        )

        result = resp.json()

        # Parse result
        status = result.get("status", "unknown")
        retest_id = result.get("retest_id", "?")
        evidence = result.get("evidence", {})

        # ── Summary ───────────────────────────────────────────────────────
        status_icon = {
            "verified": "✅",
            "not_fixed": "⚠️ ",
            "failed": "❌",
        }.get(status, "❓")

        print(f"\n{status_icon} RESULT: {status.upper()}")
        print(f"   Retest ID: {retest_id}")

        # ── Details ───────────────────────────────────────────────────────
        details = evidence.get("details", {})
        if details.get("confidence") is not None:
            conf = details.get("confidence", 0)
            print(f"   Confidence: {conf:.0%}")

        if details.get("reason"):
            print(f"   Reason: {details['reason']}")

        # ── Evidence Counts ───────────────────────────────────────────────
        screenshots = evidence.get("screenshots", [])
        logs = evidence.get("logs", [])
        network = evidence.get("network_data", [])

        print(f"\n📦 Evidence Collected:")
        print(f"   • Screenshots: {len(screenshots)}")
        print(f"   • Log entries: {len(logs)}")
        print(f"   • Network requests: {len(network)}")

        # ── Full JSON (compact) ───────────────────────────────────────────
        print(f"\n📊 Full Response:")
        print(json.dumps(result, indent=2))

        return result

    except requests.exceptions.Timeout:
        print("ERROR: Request timed out (server may be processing a long test)")
        sys.exit(1)
    except requests.exceptions.ConnectionError:
        print(f"ERROR: Cannot connect to {SERVER_URL}")
        sys.exit(1)
    except Exception as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)


def demo() -> None:
    """
    Run a demo showing what a typical workflow looks like.
    This uses sample data — you need real credentials and a real app for actual testing.
    """
    print("\n" + "="*70)
    print("RETEST ENGINE — DEMO")
    print("="*70)

    # Demo 1: Health check
    print("\n[1/4] Health Check")
    print("-" * 70)
    health_check()

    # Demo 2: Service info
    print("\n[2/4] Service Info")
    print("-" * 70)
    get_info()

    # Demo 3: Mock response (show what output looks like)
    print("\n[3/4] Example Response (IDOR Test)")
    print("-" * 70)
    mock_result = {
        "retest_id": "demo_idor_001",
        "status": "not_fixed",
        "evidence": {
            "screenshots": [
                {
                    "name": "login_success",
                    "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==",
                    "path": "/tmp/retest_screenshots/login_success_1705331025.png",
                },
                {
                    "name": "idor_probe",
                    "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                    "path": "/tmp/retest_screenshots/idor_probe_1705331035.png",
                },
            ],
            "logs": [
                {
                    "level": "info",
                    "msg": "Planning action for vulnerability_type=IDOR",
                    "time": "2026-01-15T14:23:45",
                },
                {
                    "level": "info",
                    "msg": "[1/5] navigate: Navigate to login page",
                    "time": "2026-01-15T14:23:46",
                },
                {
                    "level": "debug",
                    "msg": "  → navigated to https://api.example.com/login",
                    "time": "2026-01-15T14:23:47",
                },
                {
                    "level": "info",
                    "msg": "[2/5] fill: Fill username field",
                    "time": "2026-01-15T14:23:47",
                },
                {
                    "level": "debug",
                    "msg": "  → filled '#username' = '***'",
                    "time": "2026-01-15T14:23:48",
                },
                {
                    "level": "info",
                    "msg": "IDOR probe result — status=200, body_len=246, is_idor=True",
                    "time": "2026-01-15T14:24:05",
                },
            ],
            "network_data": [
                {
                    "url": "https://api.example.com/users/42/profile",
                    "method": "GET",
                    "status": 200,
                    "response_body": '{"id":42,"name":"Alice","email":"alice@example.com","role":"user"}',
                    "headers": {"content-type": "application/json"},
                },
                {
                    "url": "https://api.example.com/users/43/profile",
                    "method": "GET",
                    "status": 200,
                    "response_body": '{"id":43,"name":"Bob","email":"bob@example.com","role":"user"}',
                    "headers": {"content-type": "application/json"},
                },
            ],
            "details": {
                "confidence": 0.9,
                "probe_url": "https://api.example.com/users/43/profile",
                "http_status": 200,
                "reason": "User 42 was able to access user 43's profile despite not owning it.",
            },
        },
    }

    print(json.dumps(mock_result, indent=2))

    # Demo 4: What the actual request would look like
    print("\n[4/4] Example Request Format")
    print("-" * 70)
    example_request = {
        "retest_id": "r_2026_idor_001",
        "vulnerability_type": "IDOR",
        "target_url": "https://api.example.com",
        "steps_to_reproduce": (
            "Login as user 42. "
            "Navigate to GET /users/42/profile to see your own data (returns 200). "
            "Try to access GET /users/43/profile — if you get user 43's data, IDOR is not fixed."
        ),
        "credentials": {
            "username": "alice@example.com",
            "password": "SecurePassword123",
        },
    }
    print(json.dumps(example_request, indent=2))

    print("\n" + "="*70)
    print("To run an actual test:")
    print("="*70)
    print("python retest_engine/test_client.py retest \\")
    print("  --id r_001 \\")
    print("  --type IDOR \\")
    print("  --url https://your-app.com \\")
    print('  --steps "Login as user 42, access /api/users/43/profile" \\')
    print("  --user alice@example.com \\")
    print("  --pass SecurePassword123")
    print()


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Test client for retest_engine server",
    )
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # ── health ────────────────────────────────────────────────────────────
    subparsers.add_parser(
        "health",
        help="Check if server is running",
    )

    # ── info ──────────────────────────────────────────────────────────────
    subparsers.add_parser(
        "info",
        help="Get service info",
    )

    # ── retest ────────────────────────────────────────────────────────────
    retest_parser = subparsers.add_parser(
        "retest",
        help="Submit a retest request",
    )
    retest_parser.add_argument(
        "--id", required=True, help="Unique retest ID (e.g. r_001)"
    )
    retest_parser.add_argument(
        "--type",
        required=True,
        choices=["IDOR", "STORED_XSS"],
        help="Vulnerability type",
    )
    retest_parser.add_argument(
        "--url", required=True, help="Target URL (e.g. https://api.example.com)"
    )
    retest_parser.add_argument(
        "--steps",
        required=True,
        help="Steps to reproduce (narrative description)",
    )
    retest_parser.add_argument(
        "--user", required=True, help="Username or email"
    )
    retest_parser.add_argument(
        "--pass", required=True, dest="password", help="Password"
    )

    # ── demo ──────────────────────────────────────────────────────────────
    subparsers.add_parser(
        "demo",
        help="Run a demo with sample requests and expected output",
    )

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    if args.command == "health":
        health_check()
    elif args.command == "info":
        get_info()
    elif args.command == "retest":
        submit_retest(
            retest_id=args.id,
            vuln_type=args.type,
            target_url=args.url,
            steps=args.steps,
            username=args.user,
            password=args.password,
        )
    elif args.command == "demo":
        demo()


if __name__ == "__main__":
    main()
