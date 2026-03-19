"""
Simple Flask HTTP server for the retest_engine.

Run with:
    python -m flask --app retest_engine.server run --port 5555

Or directly:
    python retest_engine/server.py

Then POST to: http://localhost:5555/retest

Example:
    curl -X POST http://localhost:5555/retest \\
      -H "Content-Type: application/json" \\
      -d '{
        "retest_id": "test_001",
        "vulnerability_type": "IDOR",
        "target_url": "https://app.example.com",
        "steps_to_reproduce": "Login as user 123, access /api/users/124/profile",
        "credentials": {"username": "alice", "password": "secret"}
      }'
"""

import json
import logging
import traceback
from datetime import datetime

from flask import Flask, request, jsonify

from .main import run_retest
from .logger import get_logger

# ── Flask Setup ───────────────────────────────────────────────────────────────
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False
log = get_logger("server")

# Suppress Flask's verbose default logging
logging.getLogger('werkzeug').setLevel(logging.WARNING)


# ── CORS ─────────────────────────────────────────────────────────────────────
# Allow the Next.js frontend (localhost:3000) to call the engine directly.

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response


@app.route('/retest', methods=['OPTIONS'])
@app.route('/health', methods=['OPTIONS'])
@app.route('/info', methods=['OPTIONS'])
def cors_preflight():
    return '', 204


# ── Health check ──────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    """Simple health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "retest_engine",
        "timestamp": datetime.utcnow().isoformat(),
    }), 200


# ── Main retest endpoint ──────────────────────────────────────────────────────

@app.route('/retest', methods=['POST'])
def submit_retest():
    """
    Accept a retest request and run it synchronously.

    Request body:
    {
        "retest_id": "string",
        "vulnerability_type": "IDOR" | "STORED_XSS",
        "target_url": "string",
        "steps_to_reproduce": "string",
        "credentials": {
            "username": "string",
            "password": "string"
        }
    }

    Response:
    {
        "retest_id": "string",
        "status": "verified" | "not_fixed" | "failed",
        "evidence": {
            "screenshots": list,
            "logs": list,
            "network_data": list,
            "details": dict
        },
        "error": "string (only if status=failed)"
    }
    """
    try:
        # ── Parse request ─────────────────────────────────────────────────────
        if not request.is_json:
            return jsonify({
                "error": "Content-Type must be application/json"
            }), 400

        payload = request.get_json()
        log.info(f"Retest request received: {payload.get('retest_id')}")

        # ── Validate required fields ──────────────────────────────────────────
        required = ["retest_id", "vulnerability_type", "target_url", "credentials"]
        missing = [f for f in required if not payload.get(f)]
        if missing:
            return jsonify({
                "error": f"Missing required fields: {', '.join(missing)}"
            }), 400

        if not isinstance(payload.get("credentials"), dict):
            return jsonify({"error": "credentials must be a dict"}), 400

        # ── Run retest ────────────────────────────────────────────────────────
        log.info(f"Running retest: {payload['retest_id']}")
        result = run_retest(payload)

        log.info(
            f"Retest completed: {payload['retest_id']} -> {result['status']}"
        )

        return jsonify(result), 200

    except Exception as exc:
        log.error(f"Unhandled exception:\n{traceback.format_exc()}")
        return jsonify({
            "error": f"Internal server error: {str(exc)}",
            "trace": traceback.format_exc()
        }), 500


# ── Info endpoint ─────────────────────────────────────────────────────────────

@app.route('/info', methods=['GET'])
def info():
    """Returns service metadata."""
    return jsonify({
        "service": "retest_engine",
        "version": "1.0",
        "endpoints": {
            "POST /retest": "Submit a retest request",
            "GET /health": "Health check",
            "GET /info": "This endpoint",
        },
        "supported_vulnerabilities": ["IDOR", "STORED_XSS"],
    }), 200


# ── Error handlers ────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405


# ── Entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    log.info("Starting retest_engine server on http://localhost:5555")
    log.info("Health check: GET http://localhost:5555/health")
    log.info("Submit retest: POST http://localhost:5555/retest")
    app.run(host="0.0.0.0", port=5555, debug=False, use_reloader=False)
