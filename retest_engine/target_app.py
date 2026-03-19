#!/usr/bin/env python3
"""
Intentionally Vulnerable Test Application
==========================================
DO NOT deploy to production. For testing retest_engine only.

Vulnerabilities:
  - IDOR on GET /api/users/<id>  (no ownership check)
  - Stored XSS on POST /comments (no sanitization)

Run:
    python retest_engine/target_app.py
    # Starts on http://localhost:8080
"""

from flask import Flask, request, jsonify, make_response

app = Flask(__name__)

# ── In-memory data ─────────────────────────────────────────────────────────────

USERS = {
    1: {"id": 1, "name": "Alice Johnson", "email": "alice@testcorp.com", "role": "admin", "ssn": "123-45-6789"},
    2: {"id": 2, "name": "Bob Smith",    "email": "bob@testcorp.com",   "role": "user",  "ssn": "987-65-4321"},
    3: {"id": 3, "name": "Carol White",  "email": "carol@testcorp.com", "role": "user",  "ssn": "555-12-3456"},
}

# Sessions: token -> user_id
SESSIONS: dict[str, int] = {}

# Comments (stores raw HTML — intentionally vulnerable to XSS)
COMMENTS: list[dict] = []

# ── Auth helpers ───────────────────────────────────────────────────────────────

def _get_current_user(req) -> dict | None:
    token = req.cookies.get("session_token") or req.headers.get("X-Session-Token")
    if not token:
        return None
    uid = SESSIONS.get(token)
    return USERS.get(uid)


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    """Landing page with login form and comment board."""
    user = _get_current_user(request)
    logged_in_info = f"<p>Logged in as: <b>{user['name']}</b> (id={user['id']})</p>" if user else ""

    # Render comments — raw HTML, no escaping (XSS vuln)
    comments_html = ""
    for c in COMMENTS:
        comments_html += f"<div class='comment'><b>{c['author']}</b>: {c['text']}</div>\n"

    return f"""<!DOCTYPE html>
<html>
<head>
  <title>TestCorp Internal Portal</title>
  <style>
    body {{ font-family: sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; }}
    input, textarea {{ width: 100%; padding: 8px; margin: 4px 0 12px; box-sizing: border-box; }}
    button {{ padding: 8px 20px; background: #4f46e5; color: #fff; border: none; cursor: pointer; }}
    .comment {{ background: #f3f4f6; padding: 8px 12px; margin: 6px 0; border-radius: 4px; }}
    .section {{ margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; }}
  </style>
</head>
<body>
  <h1>TestCorp Internal Portal</h1>
  {logged_in_info}

  <div class="section">
    <h2>Login</h2>
    <form method="POST" action="/login">
      <label>Username <input name="username" placeholder="alice or bob" /></label>
      <label>Password <input name="password" type="password" placeholder="password123" /></label>
      <button type="submit">Login</button>
    </form>
  </div>

  <div class="section">
    <h2>Comments</h2>
    {comments_html if comments_html else "<p><i>No comments yet.</i></p>"}
    <form method="POST" action="/comments">
      <label>Add a comment:
        <textarea name="text" rows="3" placeholder="Type your comment..."></textarea>
      </label>
      <button type="submit">Post Comment</button>
    </form>
  </div>
</body>
</html>"""


@app.route("/login", methods=["GET"])
def login_page():
    return '<form method="POST" action="/login">Username: <input name="username"> Password: <input name="password" type="password"> <button>Login</button></form>'


@app.route("/login", methods=["POST"])
def login():
    """Authenticate user — returns session cookie."""
    if request.is_json:
        data = request.get_json() or {}
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()
    else:
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()

    # Simple credential check
    creds = {
        "alice": (1, "password123"),
        "bob":   (2, "password123"),
        "carol": (3, "password123"),
        # also accept email prefixes
        "alice@testcorp.com": (1, "password123"),
        "bob@testcorp.com":   (2, "password123"),
    }

    entry = creds.get(username)
    if not entry or entry[1] != password:
        return jsonify({"error": "Invalid credentials"}), 401

    uid, _ = entry
    token = f"tok_{uid}_{len(SESSIONS)}"
    SESSIONS[token] = uid

    if request.is_json:
        return jsonify({"token": token, "user_id": uid, "message": "Login successful"})

    resp = make_response(f"<p>Logged in! Token: {token}</p><a href='/'>← Back</a>")
    resp.set_cookie("session_token", token)
    return resp


@app.route("/logout", methods=["POST", "GET"])
def logout():
    token = request.cookies.get("session_token")
    if token:
        SESSIONS.pop(token, None)
    resp = make_response('<p>Logged out.</p><a href="/">← Back</a>')
    resp.set_cookie("session_token", "", expires=0)
    return resp


# ── VULNERABILITY 1: IDOR ──────────────────────────────────────────────────────

@app.route("/api/users/<int:user_id>")
def get_user(user_id: int):
    """
    VULNERABLE: Returns ANY user's data if you are authenticated.
    There is no ownership check — user 2 can read user 1's profile.
    """
    current = _get_current_user(request)
    if not current:
        return jsonify({"error": "Unauthorized"}), 401

    target = USERS.get(user_id)
    if not target:
        return jsonify({"error": "User not found"}), 404

    # BUG: should check current["id"] == user_id but doesn't
    return jsonify(target)


@app.route("/api/users/me")
def get_me():
    """Non-vulnerable own-profile endpoint (for comparison)."""
    current = _get_current_user(request)
    if not current:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(current)


# ── VULNERABILITY 2: STORED XSS ───────────────────────────────────────────────

@app.route("/comments", methods=["POST"])
def post_comment():
    """
    VULNERABLE: Stores raw user input without sanitization.
    Scripts injected here execute when the page is loaded.
    """
    current = _get_current_user(request)
    author = current["name"] if current else "Anonymous"

    text = request.form.get("text") or (request.json.get("text", "") if request.is_json else "")
    if not text:
        return jsonify({"error": "text is required"}), 400

    comment = {"author": author, "text": text}  # BUG: text is never sanitized
    COMMENTS.append(comment)

    if request.is_json:
        return jsonify({"message": "Comment posted", "comment": comment})

    resp = make_response('<p>Comment posted!</p><a href="/">← Back</a>')
    return resp


@app.route("/comments", methods=["GET"])
def list_comments():
    """Return all comments as JSON (also reflects raw HTML)."""
    return jsonify(COMMENTS)


# ── Health / Reset ─────────────────────────────────────────────────────────────

@app.route("/health")
def health():
    return jsonify({"status": "ok", "users": len(USERS), "comments": len(COMMENTS)})


@app.route("/reset", methods=["POST"])
def reset():
    """Reset state between test runs."""
    SESSIONS.clear()
    COMMENTS.clear()
    return jsonify({"message": "State reset"})


if __name__ == "__main__":
    print("=" * 60)
    print("  INTENTIONALLY VULNERABLE TEST APPLICATION")
    print("  DO NOT USE IN PRODUCTION")
    print("=" * 60)
    print()
    print("  URL:      http://localhost:8080")
    print("  Users:    alice / password123  (id=1, admin)")
    print("            bob   / password123  (id=2, user)")
    print()
    print("  IDOR:     Login as bob, GET /api/users/1 -> alice's SSN")
    print("  XSS:      POST /comments with <script>alert(1)</script>")
    print()
    app.run(host="0.0.0.0", port=8080, debug=False)
