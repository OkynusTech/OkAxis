/**
 * GET /testvulnapp/admin — Admin Panel
 *
 * ⚠️ VULNERABILITY: AUTH_BYPASS
 * Checks that the user is authenticated but does NOT check their role.
 * Any logged-in user (including bob with role=user) can access admin data.
 */
import { NextRequest } from 'next/server';
import { USERS, resolveUser } from '@/lib/testvulnapp-state';

export async function GET(req: NextRequest) {
  const user = resolveUser(req);

  if (!user) {
    return new Response(
      `<!DOCTYPE html><html><head><title>Unauthorized</title></head>
       <body style="font-family:sans-serif;max-width:600px;margin:60px auto;padding:0 20px">
         <h2>❌ 401 Unauthorized</h2>
         <p>You must be logged in to access this page.</p>
         <a href="/testvulnapp">← Back to login</a>
       </body></html>`,
      { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  // ⚠️ BUG: Should check if (user.role !== 'admin') return 403 — but doesn't
  const usersTable = Object.values(USERS)
    .map(u =>
      `<tr>
         <td>${u.id}</td><td>${u.name}</td><td>${u.email}</td>
         <td>${u.role}</td><td><code>${u.ssn}</code></td>
       </tr>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Admin Panel — TestCorp</title>
  <style>
    body{font-family:sans-serif;max-width:900px;margin:0 auto;padding:24px 20px;background:#f9fafb}
    .banner{background:#fef9c3;border:2px solid #ca8a04;border-radius:8px;padding:10px 16px;margin-bottom:20px;font-size:13px;font-weight:600}
    h1{font-size:22px;font-weight:700;margin-bottom:4px}
    .badge{display:inline-block;background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:16px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:20px}
    .card h2{font-size:16px;font-weight:700;margin-bottom:12px}
    .secret{font-family:monospace;background:#fef2f2;padding:10px 14px;border-radius:8px;color:#dc2626;font-size:14px;margin-bottom:10px}
    .api-key{font-family:monospace;background:#f0fdf4;padding:8px 12px;border-radius:6px;color:#15803d;font-size:13px;margin-bottom:6px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th,td{padding:8px 12px;border:1px solid #e5e7eb;text-align:left}
    th{background:#f3f4f6;font-weight:600}
    code{background:#f3f4f6;padding:1px 5px;border-radius:4px;font-size:12px}
    a{color:#4f46e5}
  </style>
</head>
<body>
  <div class="banner">⚠️ This page is accessible because the app checks AUTHENTICATION but not AUTHORIZATION (role).</div>
  <h1>🔐 Admin Control Panel</h1>
  <div class="badge">⚠ AUTH_BYPASS VULNERABILITY</div>
  <p style="font-size:14px;color:#6b7280;margin-bottom:20px">
    Logged in as: <b>${user.name}</b> (role: <b style="color:${user.role === 'admin' ? '#16a34a' : '#dc2626'}">${user.role}</b>)
    — A role=user account should NOT be able to access this page.
  </p>

  <div class="card">
    <h2>Secret Configuration</h2>
    <div class="secret" id="secret-key">ADMIN_SECRET_KEY: ADMIN_SECRET_8675309</div>
    <div class="api-key" id="api-key-prod">sk-prod-abc123xyzPRODUCTION</div>
    <div class="api-key" id="api-key-internal">sk-internal-xyz789INTERNAL</div>
  </div>

  <div class="card">
    <h2>All Users (including PII)</h2>
    <table id="users-table">
      <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>SSN</th></tr></thead>
      <tbody>${usersTable}</tbody>
    </table>
  </div>

  <div class="card">
    <h2>System Info</h2>
    <table>
      <tr><td>App Version</td><td><code>2.1.4</code></td></tr>
      <tr><td>Environment</td><td><code>production</code></td></tr>
      <tr><td>Database</td><td><code>postgres://internal.testcorp.com/app</code></td></tr>
      <tr><td>Admin Email</td><td><code>admin@testcorp.com</code></td></tr>
    </table>
  </div>

  <p><a href="/testvulnapp">← Back to portal</a></p>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
