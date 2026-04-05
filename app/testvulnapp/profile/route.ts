/**
 * GET /testvulnapp/profile  — Profile page
 * POST /testvulnapp/profile — Update profile
 *
 * ⚠️ VULNERABILITY: CSRF
 * The POST endpoint accepts state-changing requests with NO CSRF token check.
 * A forged cross-site request from any origin will succeed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { PROFILE, resolveUser } from '@/lib/testvulnapp-state';

function renderProfile(
  user: { name: string; email: string; role: string } | null,
  saved?: boolean,
): string {
  if (!user) {
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:60px auto;padding:0 20px">
      <h2>❌ 401 Unauthorized</h2><p>Login first.</p><a href="/testvulnapp">← Login</a>
    </body></html>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>My Profile — TestCorp</title>
  <style>
    body{font-family:sans-serif;max-width:700px;margin:0 auto;padding:24px 20px;background:#f9fafb}
    .banner{background:#fef9c3;border:2px solid #ca8a04;border-radius:8px;padding:10px 16px;margin-bottom:20px;font-size:13px;font-weight:600}
    h1{font-size:22px;font-weight:700;margin-bottom:16px}
    .badge{display:inline-block;background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:16px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:20px}
    .card h2{font-size:16px;font-weight:700;margin-bottom:12px}
    label{display:block;font-size:13px;font-weight:600;margin-bottom:4px}
    input,textarea{width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;margin-bottom:12px;outline:none}
    button{padding:9px 20px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer}
    .success{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;font-size:14px;color:#15803d;margin-bottom:14px}
    .note{font-size:12px;color:#9ca3af;margin-top:8px;font-style:italic}
    code{background:#f3f4f6;padding:1px 5px;border-radius:4px;font-size:11px}
    a{color:#4f46e5}
  </style>
</head>
<body>
  <div class="banner">⚠️ This form accepts POST requests with NO CSRF token validation — any forged cross-site request will succeed.</div>
  <h1>My Profile</h1>
  <div class="badge">⚠ CSRF VULNERABILITY</div>
  <p style="font-size:14px;color:#6b7280;margin-bottom:20px">Logged in as: <b>${user.name}</b> (${user.email})</p>

  <div class="card">
    <h2>Current Profile</h2>
    <p id="current-bio" style="font-size:14px;margin-bottom:6px"><b>Bio:</b> ${PROFILE.bio}</p>
    <p id="current-website" style="font-size:14px"><b>Website:</b> ${PROFILE.website}</p>
  </div>

  <div class="card">
    <h2>Update Profile</h2>
    ${saved ? '<div class="success">✅ Profile updated successfully!</div>' : ''}
    <!-- ⚠️ No hidden CSRF token field — intentionally missing -->
    <form id="profile-form" method="POST" action="/testvulnapp/profile">
      <label for="bio">Bio</label>
      <textarea id="bio" name="bio" rows="3">${PROFILE.bio}</textarea>
      <label for="website">Website</label>
      <input id="website" name="website" type="text" value="${PROFILE.website}" />
      <button id="profile-submit" type="submit">Update Profile</button>
      <p class="note">Notice: no <code>csrf_token</code> hidden field. Any authenticated POST will succeed.</p>
    </form>
  </div>

  <p><a href="/testvulnapp">← Back to portal</a></p>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const user = resolveUser(req);
  const saved = req.nextUrl.searchParams.get('saved') === '1';
  const status = user ? 200 : 401;
  return new Response(renderProfile(user, saved), {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function POST(req: NextRequest) {
  const user = resolveUser(req);
  if (!user) {
    return new Response(renderProfile(null), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Handle both form data and JSON (for api_request compatibility)
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    if (body.bio     !== undefined) PROFILE.bio     = body.bio;
    if (body.website !== undefined) PROFILE.website = body.website;
    return NextResponse.json({ message: 'Profile updated', profile: { ...PROFILE } });
  }

  const form = await req.formData().catch(() => null);
  const bio     = (form?.get('bio')     as string) ?? '';
  const website = (form?.get('website') as string) ?? '';

  // ⚠️ VULNERABILITY: No CSRF token check here
  if (bio)     PROFILE.bio     = bio;
  if (website) PROFILE.website = website;

  return NextResponse.redirect(new URL('/testvulnapp/profile?saved=1', req.url));
}
