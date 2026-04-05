# How to Use the Auto-Retest Engine

This guide walks you through running an automated vulnerability retest using the OkNexus AI agent.

---

## Prerequisites

Before using the retest engine, make sure both servers are running:

```bash
npm run dev:all
```

This starts the Next.js app on **port 3000** and the Python engine on **port 5555**.

---

## Step 1 — Go to the Retest Queue

Navigate to **Retests** in the left sidebar, or open [http://localhost:3000/retests](http://localhost:3000/retests).

You'll see the **Queue** tab listing open retests that have been requested by clients.

![Retest Queue — showing a vulnerability card with the Auto-Retest button](C:/Users/Aarsh/.gemini/antigravity/brain/22e2c82e-66e4-4b04-9d58-89b41f4516da/retest_queue_view_1775382507993.png)

Each card shows:
- **Vulnerability title and severity** (Critical / High / Medium / Low)
- Which **client and engagement** it belongs to
- The **client's claim** (e.g. "Fixed")
- Who it is **assigned to**

---

## Step 2 — Click "Auto-Retest"

Click the **Auto-Retest** button on the card you want to verify. A modal dialog will open.

> 💡 "Manual Update" lets you set the status yourself. "Auto-Retest" runs the autonomous AI agent.

---

## Step 3 — Fill in the Retest Form

The modal pre-fills some fields from the finding. Review and complete:

| Field | What to Enter |
|---|---|
| **Target URL** | The URL of the application to test (e.g. `http://localhost:3000/testvulnapp`) |
| **Vulnerability Type** | Select from the dropdown — must match the original finding type |
| **Steps to Reproduce** | Describe the steps a tester would take to trigger the vulnerability |
| **Authentication Method** | How the agent should log in (Form Login, Bearer Token, or Cookie) |
| **Username / Password** | Credentials for the test account (e.g. `bob` / `password`) |

![Filled-in retest dialog form ready to run](C:/Users/Aarsh/.gemini/antigravity/brain/22e2c82e-66e4-4b04-9d58-89b41f4516da/retest_dialog_filled_1775382606823.png)

> **Tip on Steps to Reproduce**: Be specific about which user and which endpoint to test. For example: *"Login as bob, then GET /api/users/2 to check if alice's data is returned."*

---

## Step 4 — Run the Agent

Click **Run Auto-Retest**. The dialog switches to a live log view as the agent works.

The agent runs an **observe-reason-act loop**:
1. **Observes** the current page (DOM, network traffic, cookies)
2. **Reasons** using the Groq LLM about what to do next
3. **Acts** — navigates, fills forms, or calls APIs directly
4. Repeats until it has enough evidence to issue a **verdict**

![Agent actively running — streaming turn-by-turn log](C:/Users/Aarsh/.gemini/antigravity/brain/22e2c82e-66e4-4b04-9d58-89b41f4516da/retest_agent_running_1775382681147.png)

Each turn shows:
- The **action** the agent decided to take (navigate, fill, click, api_request, etc.)
- The **reasoning** behind it
- The **result** (HTTP status, page state, JS evaluation output)

Typical runtime: **30 seconds to 2 minutes** depending on the vulnerability type and app speed.

---

## Step 5 — Read the Verdict

When the agent finishes, the dialog shows the final verdict:

![Retest verdict — vulnerability verified as fixed](C:/Users/Aarsh/.gemini/antigravity/brain/22e2c82e-66e4-4b04-9d58-89b41f4516da/retest_verdict_result_1775382795868.png)

| Status | Meaning |
|---|---|
| ✅ `verified` | The vulnerability is **fixed** — the agent could not reproduce it |
| ⚠️ `not_fixed` | The vulnerability is **still exploitable** — the agent successfully reproduced it |
| ❌ `failed` | The agent encountered an error — check the turn log for details |

The result also shows:
- **Confidence score** (0–100%) — how certain the agent is
- **Turns used** — how many reasoning steps it took
- **Summary** — plain-English explanation of the verdict
- **Turn log** — full step-by-step trace you can expand and review

---

## Supported Vulnerability Types

| Type | Description |
|---|---|
| `IDOR` | Tries to access another user's resource by modifying object IDs |
| `STORED_XSS` | Injects a marker payload and checks if it executes on reload |
| `REFLECTED_XSS` | Tests URL parameter reflection for script execution |
| `AUTH_BYPASS` | Tries to access admin/protected routes without proper credentials |
| `CSRF` | Extracts form tokens and checks if state-changing requests require them |
| `OPEN_REDIRECT` | Checks if redirect parameters can be manipulated to external sites |
| `SQLI` | Tests query parameters for SQL error responses |

---

## Troubleshooting

| Issue | Fix |
|---|---|
| *"Stream ended without a complete result"* | Restart both servers: `Ctrl+C` then `npm run dev:all` |
| *Engine returned 502* | The Python engine isn't running — check the Flask terminal for errors |
| *"Authentication setup failed"* | Verify the username/password are correct and the login form selectors match |
| Agent exits with 0 turns | Check the Flask terminal for a Python traceback — likely a missing `GROQ_API_KEY` |
| *"Executable doesn't exist"* | Run `python -m playwright install chromium` |
