# Retest Engine

Automated vulnerability retesting service for the VAPT lifecycle platform.

## What It Does

When a client requests a retest of a previously-found vulnerability:

1. **Plan** (Groq LLM) → Convert narrative steps into an automated action plan
2. **Execute** (Playwright) → Run the plan in a real browser, capture evidence
3. **Verify** (IDOR/XSS logic) → Check if vulnerability still exists
4. **Decide** → Status: `verified` (fixed), `not_fixed` (still exploitable), or `failed` (error)

## Quick Start

```bash
# 1. Setup
cd retest_engine
pip install -r requirements.txt
playwright install chromium

# 2. Configure
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# 3. Start server
python retest_engine/server.py
# Server runs on http://localhost:5555

# 4. Test it
python retest_engine/test_client.py demo

# 5. Submit a retest
python retest_engine/test_client.py retest \
  --id r_001 \
  --type IDOR \
  --url https://your-app.com \
  --steps "Login as user 42, access /users/43/profile" \
  --user alice \
  --pass secret
```

## Documentation

| File | Purpose |
|------|---------|
| **SETUP.md** | Installation, configuration, usage guide |
| **IMPLEMENTATION_REPORT.md** | Technical deep-dive, architecture, API spec |
| **DEMO_OUTPUT.txt** | Example outputs and integration examples |
| **server.py** | HTTP API server (Flask) |
| **test_client.py** | Command-line test client |

## Supported Vulnerabilities

### IDOR (Insecure Direct Object Reference)
Detect unauthorized access to resources belonging to other users.

```json
{
  "vulnerability_type": "IDOR",
  "steps_to_reproduce": "Login as user 42, access /api/users/43/profile"
}
```

### STORED_XSS (Stored Cross-Site Scripting)
Detect if injected JavaScript payloads still execute.

```json
{
  "vulnerability_type": "STORED_XSS",
  "steps_to_reproduce": "Post comment with payload, reload page to see execution"
}
```

## Integration Options

### 1. HTTP API (Any Language)
```bash
curl -X POST http://localhost:5555/retest \
  -H "Content-Type: application/json" \
  -d '{"retest_id":"r_001",...}'
```

### 2. Python SDK
```python
from retest_engine import run_retest

result = run_retest({
    "retest_id": "r_001",
    "vulnerability_type": "IDOR",
    "target_url": "https://...",
    "steps_to_reproduce": "...",
    "credentials": {"username": "...", "password": "..."}
})
```

### 3. Node.js / Express
```javascript
const result = execSync(`python -m retest_engine '${JSON.stringify(request)}'`).toString();
```

## API Endpoints

### POST /retest
Submit a retest request.

**Request:**
```json
{
  "retest_id": "string",
  "vulnerability_type": "IDOR | STORED_XSS",
  "target_url": "string",
  "steps_to_reproduce": "string",
  "credentials": {
    "username": "string",
    "password": "string"
  }
}
```

**Response:**
```json
{
  "retest_id": "string",
  "status": "verified | not_fixed | failed",
  "evidence": {
    "screenshots": [...],
    "logs": [...],
    "network_data": [...]
  }
}
```

### GET /health
Health check.

### GET /info
Service information.

## Architecture

```
Request
  ↓
Phase 1: Planner (Groq LLM)
  ↓
Phase 2: Executor (Playwright)
  ↓
Phase 3: Verifier (IDOR/XSS logic)
  ↓
Phase 4: Decision (verdict)
  ↓
Response
```

## Evidence Collected

- **Screenshots**: Base64-encoded PNG at key milestones
- **Logs**: Browser console + step-by-step execution logs
- **Network Data**: Captured HTTP requests/responses

## Performance

- Login: 5–10 seconds
- Verification: 3–8 seconds
- Total per retest: 10–30 seconds

## Prerequisites

- Python 3.10+
- Groq API key (free): https://console.groq.com

## Troubleshooting

### "GROQ_API_KEY is not set"
```bash
# Add to .env:
GROQ_API_KEY=your_key_here
```

### "ModuleNotFoundError: No module named 'playwright'"
```bash
pip install -r requirements.txt
playwright install chromium
```

### Timeout errors
- Increase `BROWSER_TIMEOUT_MS` in .env
- Check if target app is accessible
- Verify steps_to_reproduce match current app state

## See Also

- [SETUP.md](SETUP.md) — Installation & usage
- [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md) — Architecture & design
- [DEMO_OUTPUT.txt](DEMO_OUTPUT.txt) — Example outputs
- [server.py](server.py) — HTTP server code
- [test_client.py](test_client.py) — Test client
