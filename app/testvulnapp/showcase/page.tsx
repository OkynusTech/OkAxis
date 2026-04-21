'use client';

import { useState, useEffect, useRef } from 'react';

/* ──────────────────────────────────────────────────────────────────────────────
   Types & constants
   ────────────────────────────────────────────────────────────────────────────── */

type VulnId = 'IDOR' | 'STORED_XSS' | 'AUTH_BYPASS' | 'CSRF' | 'OPEN_REDIRECT' | 'REFLECTED_XSS' | 'SQLI';

interface VulnMeta {
  id: VulnId;
  label: string;
  severity: 'Critical' | 'High' | 'Medium';
  cvss: string;
  endpoint: string;
  shortDesc: string;
}

const VULNS: VulnMeta[] = [
  { id: 'IDOR',          label: 'IDOR',          severity: 'High',     cvss: '8.1', endpoint: 'GET /api/testvulnapp/users/:id',   shortDesc: 'Access any user\'s private data by changing the ID.' },
  { id: 'STORED_XSS',   label: 'Stored XSS',    severity: 'High',     cvss: '7.4', endpoint: 'POST /api/testvulnapp/comments',    shortDesc: 'Store malicious scripts that execute for all viewers.' },
  { id: 'AUTH_BYPASS',  label: 'Auth Bypass',   severity: 'Critical', cvss: '9.1', endpoint: 'GET /api/testvulnapp/admin',         shortDesc: 'Access admin panel with a low-privilege account.' },
  { id: 'CSRF',         label: 'CSRF',          severity: 'Medium',   cvss: '6.5', endpoint: 'POST /api/testvulnapp/profile',      shortDesc: 'Forge cross-site requests with no token validation.' },
  { id: 'OPEN_REDIRECT',label: 'Open Redirect', severity: 'Medium',   cvss: '6.1', endpoint: 'GET /api/testvulnapp/redirect?next=', shortDesc: 'Redirect users to attacker-controlled URLs.' },
  { id: 'REFLECTED_XSS',label: 'Reflected XSS', severity: 'High',    cvss: '7.4', endpoint: 'GET /api/testvulnapp/search?q=',     shortDesc: 'Unsanitized search query reflected as executable HTML.' },
  { id: 'SQLI',         label: 'SQL Injection',  severity: 'Critical', cvss: '9.8', endpoint: 'GET /api/testvulnapp/products?id=',  shortDesc: 'Inject SQL into the product lookup endpoint.' },
];

const SEV_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Critical: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
  High:     { bg: '#fff7ed', text: '#ea580c', border: '#fdba74' },
  Medium:   { bg: '#fefce8', text: '#ca8a04', border: '#fde047' },
};

/* ──────────────────────────────────────────────────────────────────────────────
   Retest config helper — shows what to paste into the OkAxis retest dialog
   ────────────────────────────────────────────────────────────────────────────── */

const RETEST_CONFIGS: Record<VulnId, { steps: string; targetUrl: string; creds: string }> = {
  IDOR: {
    targetUrl: 'http://localhost:3000/testvulnapp',
    creds: 'bob / password123',
    steps: `1. Navigate to http://localhost:3000/testvulnapp and find the login form.
2. Fill username with "bob" and password with "password123", then submit.
3. After login, send GET /api/testvulnapp/users/1 with the session token.
4. If the response contains Alice's SSN (123-45-6789), the vulnerability is NOT FIXED.
5. If the response returns 403 Forbidden or an access-denied error, it is FIXED.`,
  },
  STORED_XSS: {
    targetUrl: 'http://localhost:3000/testvulnapp',
    creds: 'alice / password123',
    steps: `1. Navigate to http://localhost:3000/testvulnapp and log in as alice.
2. Find the comment form on the page.
3. Submit a comment containing the XSS payload (will be provided by engine).
4. Navigate back to http://localhost:3000/testvulnapp to load stored comments.
5. Use evaluate_js to check: window['__xss_oknexus'] == 1.
   - If 1/truthy: XSS payload executed — NOT FIXED.
   - If null/undefined: payload was sanitized — FIXED.`,
  },
  AUTH_BYPASS: {
    targetUrl: 'http://localhost:3000/testvulnapp',
    creds: 'bob / password123',
    steps: `1. Navigate to http://localhost:3000/testvulnapp and log in as bob (role=user).
2. Verify login succeeded by checking the session token.
3. Send GET /api/testvulnapp/admin with the session token.
4. If the response is HTTP 200 with admin data (secret_key, api_keys): NOT FIXED.
5. If the response is HTTP 403 Forbidden: FIXED.`,
  },
  CSRF: {
    targetUrl: 'http://localhost:3000/testvulnapp',
    creds: 'alice / password123',
    steps: `1. Navigate to http://localhost:3000/testvulnapp and log in as alice.
2. Inspect the profile form using evaluate_js for CSRF tokens (input[name*="csrf"]).
3. Submit POST /api/testvulnapp/profile with {"bio":"hacked"} — WITHOUT any CSRF token.
4. If the request is accepted (HTTP 200) and profile is updated: NOT FIXED.
5. If the request is rejected (HTTP 403/422 with CSRF error): FIXED.`,
  },
  OPEN_REDIRECT: {
    targetUrl: 'http://localhost:3000/testvulnapp',
    creds: '(none required)',
    steps: `1. Navigate to http://localhost:3000/api/testvulnapp/redirect?next=https://evil.example.com
2. Check the final URL after the redirect completes.
3. If the browser ends up at evil.example.com (or any external domain): NOT FIXED.
4. If redirected to /testvulnapp or an error page (blocked external redirect): FIXED.
5. Try bypass variants if the first payload is blocked:
   - ?next=//evil.example.com
   - ?next=/\\evil.example.com`,
  },
  REFLECTED_XSS: {
    targetUrl: 'http://localhost:3000/testvulnapp',
    creds: '(none required)',
    steps: `1. Navigate to http://localhost:3000/api/testvulnapp/search?q=<script>window['__xss_oknexus']=1</script>
2. Use evaluate_js to check: window['__xss_oknexus']
3. If result is 1/truthy: XSS payload executed in reflected context — NOT FIXED.
4. If result is null/undefined: input was sanitized — FIXED.`,
  },
  SQLI: {
    targetUrl: 'http://localhost:3000/testvulnapp',
    creds: '(none required)',
    steps: `1. Send GET /api/testvulnapp/products?id=1 to establish a baseline (HTTP 200).
2. Send GET /api/testvulnapp/products?id=1' OR '1'='1 (error-based payload).
3. Inspect the response for SQL syntax error messages.
4. If the response contains SQL error text (errno 1064 or similar): NOT FIXED.
5. If the request is handled cleanly (no SQL errors, parameterized): FIXED.`,
  },
};

/* ──────────────────────────────────────────────────────────────────────────────
   Main component
   ────────────────────────────────────────────────────────────────────────────── */

export default function VulnLabPage() {
  const [activeTab, setActiveTab] = useState<VulnId>('IDOR');
  const [token, setToken] = useState<string | null>(null);
  const [loggedInAs, setLoggedInAs] = useState<string | null>(null);
  const [username, setUsername] = useState('bob');
  const [password, setPassword] = useState('password123');
  const [loginMsg, setLoginMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Per-vuln demo state
  const [idorId, setIdorId] = useState('1');
  const [idorResult, setIdorResult] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<{ author: string; text: string }[]>([]);
  const [adminResult, setAdminResult] = useState<any>(null);
  const [profileResult, setProfileResult] = useState<any>(null);
  const [profileBio, setProfileBio] = useState('hacked via CSRF');
  const [redirectTarget, setRedirectTarget] = useState('https://evil.example.com');
  const [redirectResult, setRedirectResult] = useState('');
  const [searchQuery, setSearchQuery] = useState("<script>window['__xss_oknexus']=1</script>");
  const [sqliId, setSqliId] = useState("1' OR '1'='1");
  const [sqliResult, setSqliResult] = useState<any>(null);

  const demoRef = useRef<HTMLDivElement>(null);

  const fetchComments = async () => {
    const res = await fetch('/api/testvulnapp/comments');
    if (res.ok) setComments(await res.json());
  };

  useEffect(() => { fetchComments(); }, []);

  const authHeaders = (): Record<string, string> => token ? { 'X-Session-Token': token } : {};

  /* ── Auth actions ──────────────────────────────────────────────────────── */

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMsg('');
    const res = await fetch('/api/testvulnapp/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setToken(data.token);
      setLoggedInAs(`${data.name} (${data.role})`);
      setLoginMsg(`✅ Logged in! Token: ${data.token.substring(0, 20)}...`);
    } else {
      setLoginMsg(`❌ ${data.error}`);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/testvulnapp/logout', { method: 'POST', headers: authHeaders() });
    setToken(null); setLoggedInAs(null); setLoginMsg('Logged out.');
  };

  const handleReset = async () => {
    await fetch('/api/testvulnapp/reset', { method: 'POST' });
    setToken(null); setLoggedInAs(null); setLoginMsg('State reset.');
    setIdorResult(null); setAdminResult(null); setProfileResult(null);
    setSqliResult(null); setRedirectResult(''); setComments([]);
  };

  /* ── Vuln demos ────────────────────────────────────────────────────────── */

  const runIdor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setIdorResult({ error: 'Login first' }); return; }
    const res = await fetch(`/api/testvulnapp/users/${idorId}`, { headers: authHeaders() });
    setIdorResult(await res.json());
  };

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/testvulnapp/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ text: commentText }),
    });
    setCommentText('');
    fetchComments();
  };

  const runAdminBypass = async () => {
    if (!token) { setAdminResult({ error: 'Login first (as bob — a non-admin)' }); return; }
    const res = await fetch('/api/testvulnapp/admin', { headers: authHeaders() });
    setAdminResult(await res.json());
  };

  const runCsrf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setProfileResult({ error: 'Login first' }); return; }
    const res = await fetch('/api/testvulnapp/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ bio: profileBio }),
      // Note: intentionally no X-CSRF-Token header
    });
    setProfileResult(await res.json());
  };

  const runRedirect = async () => {
    const url = `/api/testvulnapp/redirect?next=${encodeURIComponent(redirectTarget)}`;
    setRedirectResult(`Navigating to: ${url}\n\nOpen in a new tab to observe the redirect →\n${window.location.origin}${url}`);
  };

  const openRedirectInTab = () => {
    window.open(`/api/testvulnapp/redirect?next=${encodeURIComponent(redirectTarget)}`, '_blank');
  };

  const openSearchInTab = () => {
    window.open(`/api/testvulnapp/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
  };

  const runSqli = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/testvulnapp/products?id=${encodeURIComponent(sqliId)}`);
    setSqliResult(await res.json());
  };

  /* ── Copy retest config ────────────────────────────────────────────────── */

  const copyConfig = () => {
    const cfg = RETEST_CONFIGS[activeTab];
    const text = [
      `Vulnerability Type: ${activeTab}`,
      `Target URL: ${cfg.targetUrl}`,
      `Credentials: ${cfg.creds}`,
      ``,
      `Steps to Reproduce:`,
      cfg.steps,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ── Render helpers ────────────────────────────────────────────────────── */

  const vuln = VULNS.find(v => v.id === activeTab)!;
  const sev = SEV_COLORS[vuln.severity];
  const cfg = RETEST_CONFIGS[activeTab];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#f9fafb', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{ background: '#1e1b4b', color: '#fff', padding: '20px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ background: '#dc2626', padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>INTENTIONALLY VULNERABLE</span>
            <span style={{ color: '#a5b4fc', fontSize: 13 }}>For OkNexus Retest Engine testing only — do NOT deploy to production</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>OkNexus Vulnerable Lab</h1>
          <p style={{ color: '#c7d2fe', margin: '4px 0 0', fontSize: 14 }}>
            7 deliberately vulnerable endpoints · All retest engine vulnerability types covered
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 32px' }}>

        {/* ── Top bar: credentials + login ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

          {/* Credentials table */}
          <div style={card}>
            <h3 style={cardTitle}>Test Credentials</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  {['Username', 'Password', 'Role', 'ID'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['alice', 'password123', 'admin', '1'],
                  ['bob',   'password123', 'user',  '2'],
                  ['carol', 'password123', 'user',  '3'],
                ].map(([u, p, r, id]) => (
                  <tr key={u} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={td}><code style={code}>{u}</code></td>
                    <td style={td}><code style={code}>{p}</code></td>
                    <td style={td}>
                      <span style={{ background: r === 'admin' ? '#fef2f2' : '#f0fdf4', color: r === 'admin' ? '#dc2626' : '#16a34a', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{r}</span>
                    </td>
                    <td style={td}>{id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Login form */}
          <div style={card}>
            <h3 style={cardTitle}>
              Login
              {loggedInAs && <span style={{ marginLeft: 10, color: '#16a34a', fontWeight: 400, fontSize: 13 }}>✅ {loggedInAs}</span>}
            </h3>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" style={{ ...input, flex: 1 }} />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" style={{ ...input, flex: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" style={btn('#4f46e5')}>Login</button>
                {token && <button type="button" onClick={handleLogout} style={btn('#6b7280')}>Logout</button>}
                <button type="button" onClick={handleReset} style={{ ...btn('#6b7280'), marginLeft: 'auto' }}>🔄 Reset All</button>
              </div>
            </form>
            {loginMsg && <p style={{ margin: '8px 0 0', fontSize: 13, background: '#f3f4f6', padding: '6px 10px', borderRadius: 6 }}>{loginMsg}</p>}
          </div>
        </div>

        {/* ── Vuln tab nav ── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {VULNS.map(v => {
            const s = SEV_COLORS[v.severity];
            const isActive = v.id === activeTab;
            return (
              <button
                key={v.id}
                onClick={() => setActiveTab(v.id)}
                style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', border: '2px solid',
                  background: isActive ? s.bg : '#fff',
                  borderColor: isActive ? s.text : '#e5e7eb',
                  color: isActive ? s.text : '#374151',
                  transition: 'all .15s',
                }}
              >
                {v.label}
                <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>{v.cvss}</span>
              </button>
            );
          })}
        </div>

        {/* ── Active vuln panel ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Left: info + demo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Vuln info */}
            <div style={{ ...card, borderLeft: `4px solid ${sev.text}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ background: sev.bg, color: sev.text, border: `1px solid ${sev.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  {vuln.severity} · CVSS {vuln.cvss}
                </span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>{vuln.label}</h2>
              <p style={{ color: '#6b7280', margin: '0 0 10px', fontSize: 14 }}>{vuln.shortDesc}</p>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px' }}>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>VULNERABLE ENDPOINT</span>
                <br />
                <code style={{ fontSize: 13, color: '#1e293b' }}>{vuln.endpoint}</code>
              </div>
            </div>

            {/* Demo */}
            <div style={card} ref={demoRef}>
              <h3 style={cardTitle}>Try It Live</h3>
              {activeTab === 'IDOR' && (
                <div>
                  <p style={hint}>Login as <b>bob</b>, then fetch user <b>1</b> (Alice) to see her SSN.</p>
                  <form onSubmit={runIdor} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <label style={{ fontSize: 13 }}>User ID:
                      <input type="number" min={1} max={3} value={idorId} onChange={e => setIdorId(e.target.value)}
                        style={{ ...input, width: 70, marginLeft: 8 }} />
                    </label>
                    <button type="submit" style={btn('#dc2626')}>Fetch</button>
                  </form>
                  {idorResult && <pre style={resultBox(idorResult?.ssn ? '#fef2f2' : '#f0fdf4')}>{JSON.stringify(idorResult, null, 2)}</pre>}
                </div>
              )}

              {activeTab === 'STORED_XSS' && (
                <div>
                  <p style={hint}>Post a comment with an XSS payload. It renders as raw HTML for every visitor.</p>
                  <form onSubmit={postComment} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <textarea value={commentText} onChange={e => setCommentText(e.target.value)} rows={3}
                      placeholder='Try: <img src=x onerror="alert(1)">'
                      style={{ ...input, resize: 'vertical' }} />
                    <button type="submit" style={btn('#dc2626')}>Post Comment</button>
                  </form>
                  <div style={{ marginTop: 12 }}>
                    {comments.length === 0 ? <p style={{ color: '#9ca3af', fontSize: 13 }}>No comments yet.</p>
                      : comments.map((c, i) => (
                        <div key={i} style={{ background: '#f3f4f6', padding: '8px 12px', borderRadius: 6, marginBottom: 6, fontSize: 13 }}>
                          <b>{c.author}</b>:{' '}
                          {/* ⚠️ Intentionally vulnerable: raw HTML rendered */}
                          <span dangerouslySetInnerHTML={{ __html: c.text }} />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {activeTab === 'AUTH_BYPASS' && (
                <div>
                  <p style={hint}>Login as <b>bob</b> (role=user), then access the admin panel. No role check exists.</p>
                  <button onClick={runAdminBypass} style={{ ...btn('#dc2626'), marginTop: 8 }}>Access Admin Panel</button>
                  {adminResult && <pre style={resultBox(adminResult?.secret_key ? '#fef2f2' : '#f0fdf4')}>{JSON.stringify(adminResult, null, 2)}</pre>}
                </div>
              )}

              {activeTab === 'CSRF' && (
                <div>
                  <p style={hint}>Update the profile bio — no CSRF token is required. Any forged request succeeds.</p>
                  <form onSubmit={runCsrf} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <input value={profileBio} onChange={e => setProfileBio(e.target.value)} placeholder="New bio" style={input} />
                    <button type="submit" style={btn('#dc2626')}>Update Profile (no CSRF token)</button>
                  </form>
                  {profileResult && <pre style={resultBox(profileResult?.profile ? '#fef2f2' : '#f0fdf4')}>{JSON.stringify(profileResult, null, 2)}</pre>}
                </div>
              )}

              {activeTab === 'OPEN_REDIRECT' && (
                <div>
                  <p style={hint}>The <code>?next=</code> param is not validated — redirects to any URL.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <input value={redirectTarget} onChange={e => setRedirectTarget(e.target.value)} placeholder="https://evil.example.com" style={input} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={runRedirect} style={btn('#dc2626')}>Show Redirect URL</button>
                      <button onClick={openRedirectInTab} style={btn('#7c3aed')}>Open in New Tab ↗</button>
                    </div>
                  </div>
                  {redirectResult && <pre style={resultBox('#fef2f2')}>{redirectResult}</pre>}
                </div>
              )}

              {activeTab === 'REFLECTED_XSS' && (
                <div>
                  <p style={hint}>The search query is reflected as raw HTML — scripts execute in the page context.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="XSS payload" style={input} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a href={`/api/testvulnapp/search?q=${encodeURIComponent(searchQuery)}`} target="_blank" rel="noreferrer">
                        <button type="button" style={btn('#dc2626')}>Open Search Page ↗</button>
                      </a>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '10px 12px', fontSize: 13 }}>
                    <b>URL preview:</b><br />
                    <code style={{ wordBreak: 'break-all', color: '#7c3aed' }}>
                      /api/testvulnapp/search?q={encodeURIComponent(searchQuery)}
                    </code>
                  </div>
                </div>
              )}

              {activeTab === 'SQLI' && (
                <div>
                  <p style={hint}>Inject SQL into the product ID — the raw error exposes the query structure.</p>
                  <form onSubmit={runSqli} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <input value={sqliId} onChange={e => setSqliId(e.target.value)} placeholder="Product ID" style={{ ...input, flex: 1 }} />
                    <button type="submit" style={btn('#dc2626')}>Fetch</button>
                  </form>
                  {sqliResult && <pre style={resultBox(sqliResult?.error?.includes('SQL') ? '#fef2f2' : '#f0fdf4')}>{JSON.stringify(sqliResult, null, 2)}</pre>}
                </div>
              )}
            </div>
          </div>

          {/* Right: retest config */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ ...card, background: '#1e1b4b', color: '#e0e7ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
                  Retest Config
                </h3>
                <button
                  onClick={copyConfig}
                  style={{ background: copied ? '#059669' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
              <p style={{ fontSize: 12, color: '#a5b4fc', marginTop: 0, marginBottom: 12 }}>
                Paste these values into the OkAxis Auto-Retest dialog to test this vulnerability:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <ConfigRow label="Vulnerability Type" value={activeTab} highlight />
                <ConfigRow label="Target URL" value={cfg.targetUrl} />
                <ConfigRow label="Credentials" value={cfg.creds} />
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  Steps to Reproduce
                </div>
                <pre style={{
                  margin: 0, background: '#0f172a', borderRadius: 8, padding: '12px 14px',
                  fontSize: 12, lineHeight: 1.7, color: '#94a3b8',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 300, overflowY: 'auto',
                }}>
                  {cfg.steps}
                </pre>
              </div>
            </div>

            {/* Quick reference */}
            <div style={card}>
              <h3 style={cardTitle}>All Vulnerability Endpoints</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {VULNS.map(v => {
                  const s = SEV_COLORS[v.severity];
                  return (
                    <div key={v.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12 }}>
                      <span style={{ background: s.bg, color: s.text, padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {v.severity}
                      </span>
                      <code style={{ color: '#374151', wordBreak: 'break-all' }}>{v.endpoint}</code>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Small sub-component ─────────────────────────────────────────────────── */

function ConfigRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{
        background: '#0f172a', borderRadius: 6, padding: '6px 10px',
        fontSize: 13, color: highlight ? '#fbbf24' : '#e2e8f0',
        fontWeight: highlight ? 700 : 400, fontFamily: 'monospace',
      }}>
        {value}
      </div>
    </div>
  );
}

/* ── Shared styles ───────────────────────────────────────────────────────── */

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)',
  border: '1px solid #e5e7eb',
};
const cardTitle: React.CSSProperties = { margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#111827' };
const input: React.CSSProperties = { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, width: '100%', boxSizing: 'border-box', outline: 'none' };
const btn = (bg: string): React.CSSProperties => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' });
const hint: React.CSSProperties = { margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.5 };
const td: React.CSSProperties = { padding: '6px 10px', fontSize: 13, color: '#374151' };
const code: React.CSSProperties = { background: '#f3f4f6', padding: '1px 6px', borderRadius: 4, fontSize: 12 };
const resultBox = (bg: string): React.CSSProperties => ({
  margin: '10px 0 0', background: bg, border: '1px solid #fca5a5', borderRadius: 8,
  padding: '10px 12px', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  maxHeight: 220, overflowY: 'auto', lineHeight: 1.6,
});
