/**
 * GET /testvulnapp  — Server-rendered HTML home page for the Vulnerable Lab.
 *
 * This is the entry point for the OkNexus Retest Engine.
 * All form fields have explicit id + name attributes so the agent's
 * page_state extractor produces concrete CSS selectors (not null).
 *
 * Vulnerabilities demonstrated here:
 *   - Stored XSS: comment text rendered as raw HTML (no sanitization)
 */

import { NextRequest } from 'next/server';
import { USERS, SESSIONS, COMMENTS, resolveUser } from '@/lib/testvulnapp-state';

const CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;color:#111827;padding:0 0 60px}
  .wrap{max-width:860px;margin:0 auto;padding:0 24px}
  .banner{background:#fef9c3;border-bottom:2px solid #ca8a04;padding:10px 24px;font-size:13px;font-weight:600}
  .banner span{color:#92400e}
  header{background:#1e1b4b;color:#fff;padding:20px 24px;margin-bottom:0}
  header h1{font-size:24px;font-weight:700;margin-bottom:4px}
  header p{font-size:13px;color:#a5b4fc}
  .section{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:22px 24px;margin-top:20px}
  .section h2{font-size:16px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px}
  .badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:.5px}
  .badge-xss{background:#fef2f2;color:#dc2626;border:1px solid #fca5a5}
  .badge-ok{background:#f0fdf4;color:#16a34a;border:1px solid #86efac}
  label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:4px}
  input[type=text],input[type=password],textarea{width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;outline:none;background:#fff}
  input:focus,textarea:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.15)}
  .form-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}
  .form-row>*{flex:1;min-width:160px}
  textarea{resize:vertical}
  .btn{padding:8px 18px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
  .btn-primary{background:#4f46e5;color:#fff}
  .btn-danger{background:#dc2626;color:#fff}
  .btn-gray{background:#6b7280;color:#fff}
  .btn-sm{padding:5px 12px;font-size:12px}
  .status-bar{display:flex;align-items:center;gap:12px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:14px}
  .status-bar .name{font-weight:700;color:#15803d}
  .comment{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:14px;line-height:1.5}
  .comment b{color:#1e40af}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  @media(max-width:620px){.grid2{grid-template-columns:1fr}}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{padding:7px 12px;border:1px solid #e5e7eb;text-align:left}
  th{background:#f3f4f6;font-weight:600}
  code{background:#f3f4f6;padding:1px 5px;border-radius:4px;font-size:12px}
  .vuln-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
  .vuln-links a{padding:7px 14px;background:#f5f3ff;border:1px solid #a5b4fc;border-radius:8px;text-decoration:none;color:#4f46e5;font-size:13px;font-weight:600}
  .vuln-links a:hover{background:#ede9fe}
  .api-list{font-size:12px;color:#6b7280;margin-top:12px;line-height:2}
  .api-list code{background:#f1f5f9;color:#1e293b}
  .error-msg{background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:8px 14px;font-size:13px;color:#b91c1c;margin-bottom:12px}
`;

function renderPage(
  user: (typeof USERS)[number] | null,
  errorMsg?: string,
): string {
  // ── Login / status section ────────────────────────────────────────────────
  const statusHtml = user
    ? `<div class="status-bar">
         <span class="name">✅ ${user.name}</span>
         <span style="color:#6b7280;font-size:13px">role: ${user.role} · id: ${user.id}</span>
         <form method="POST" action="/testvulnapp/logout" style="margin-left:auto">
           <button id="logout-btn" class="btn btn-gray btn-sm" type="submit">Logout</button>
         </form>
       </div>`
    : '';

  const loginHtml = `
    <div class="section">
      <h2>Login</h2>
      ${errorMsg ? `<div class="error-msg">❌ ${errorMsg}</div>` : ''}
      ${statusHtml}
      <form id="login-form" method="POST" action="/testvulnapp/login">
        <div class="form-row">
          <div>
            <label for="username">Username</label>
            <input id="username" name="username" type="text" placeholder="alice or bob" autocomplete="username" />
          </div>
          <div>
            <label for="password">Password</label>
            <input id="password" name="password" type="password" placeholder="password123" autocomplete="current-password" />
          </div>
        </div>
        <button id="login-btn" class="btn btn-primary" type="submit">Login</button>
        ${user ? `<span style="margin-left:10px;font-size:13px;color:#6b7280">(switch account)</span>` : ''}
      </form>
    </div>`;

  // ── Credentials table ─────────────────────────────────────────────────────
  const credsHtml = `
    <div class="section">
      <h2>Test Credentials</h2>
      <table>
        <thead><tr><th>Username</th><th>Password</th><th>Role</th><th>User ID</th></tr></thead>
        <tbody>
          <tr><td><code>alice</code></td><td><code>password123</code></td><td>admin</td><td>1</td></tr>
          <tr><td><code>bob</code></td><td><code>password123</code></td><td>user</td><td>2</td></tr>
          <tr><td><code>carol</code></td><td><code>password123</code></td><td>user</td><td>3</td></tr>
        </tbody>
      </table>
    </div>`;

  // ── Comments (Stored XSS) ─────────────────────────────────────────────────
  const commentsListHtml = COMMENTS.length === 0
    ? `<p id="no-comments" style="color:#9ca3af;font-size:14px;font-style:italic">No comments yet.</p>`
    // ⚠️ VULNERABILITY: comment text is injected as raw HTML — zero sanitization
    : COMMENTS.map(c =>
        `<div class="comment"><b>${c.author}</b>: ${c.text}</div>`
      ).join('\n');

  const xssHtml = `
    <div class="section">
      <h2>
        Comments Board
        <span class="badge badge-xss">⚠ Stored XSS</span>
      </h2>
      <form id="comment-form" method="POST" action="/testvulnapp/comments" style="margin-bottom:16px">
        <label for="comment">Add a comment (XSS payloads execute here)</label>
        <textarea id="comment" name="text" rows="3"
          placeholder='Try: &lt;img src=x onerror="window[&apos;__xss_oknexus&apos;]=1"&gt;'
          style="margin-top:6px;margin-bottom:8px"></textarea>
        <button id="comment-submit" class="btn btn-primary" type="submit">Post Comment</button>
      </form>
      <div id="comments-list">
        ${commentsListHtml}
      </div>
    </div>`;

  // ── Navigation to other vuln endpoints ───────────────────────────────────
  const navHtml = `
    <div class="section">
      <h2>All Vulnerability Endpoints</h2>
      <div class="vuln-links">
        <a id="link-admin"   href="/testvulnapp/admin">Admin Panel <small>(Auth Bypass)</small></a>
        <a id="link-profile" href="/testvulnapp/profile">My Profile <small>(CSRF)</small></a>
        <a id="link-search"  href="/api/testvulnapp/search">Employee Search <small>(Reflected XSS)</small></a>
        <a id="link-showcase" href="/testvulnapp/showcase">Interactive Showcase</a>
      </div>
      <div class="api-list">
        <b>JSON API endpoints (for <code>api_request</code>):</b><br>
        <code>GET /api/testvulnapp/users/:id</code> — IDOR (no ownership check)<br>
        <code>GET /api/testvulnapp/admin</code> — Auth Bypass (no role check)<br>
        <code>POST /api/testvulnapp/profile</code> — CSRF (no token validation)<br>
        <code>GET /api/testvulnapp/products?id=</code> — SQL Injection<br>
        <code>GET /api/testvulnapp/search?q=</code> — Reflected XSS<br>
        <code>GET /api/testvulnapp/redirect?next=</code> — Open Redirect<br>
        <code>POST /api/testvulnapp/reset</code> — Reset all state
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TestCorp Internal Portal — OkNexus Vulnerable Lab</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="banner">
    ⚠️ <span>INTENTIONALLY VULNERABLE APPLICATION</span> — OkNexus Retest Engine demo only. Do NOT deploy to production.
  </div>
  <header>
    <div class="wrap">
      <h1>TestCorp Internal Portal</h1>
      <p>OkNexus Vulnerable Lab · 7 vulnerability types · <code style="background:rgba(255,255,255,.15);color:#c7d2fe">localhost:3000/testvulnapp</code></p>
    </div>
  </header>
  <div class="wrap">
    ${loginHtml}
    <div class="grid2" style="margin-top:0">
      <div>${credsHtml.replace('<div class="section">', '<div class="section" style="margin-top:20px">')}</div>
      <div>${xssHtml.replace('<div class="section">', '<div class="section" style="margin-top:20px">')}</div>
    </div>
    ${navHtml}
  </div>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const user = resolveUser(req);
  const error = req.nextUrl.searchParams.get('error') ?? undefined;
  const errorMsg = error === 'invalid_credentials' ? 'Invalid username or password.' : undefined;
  return new Response(renderPage(user, errorMsg), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
