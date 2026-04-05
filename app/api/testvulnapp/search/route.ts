import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';

  // ⚠️ VULNERABILITY: User input reflected directly into HTML without escaping — Reflected XSS
  // Should use: q.replace(/[<>"'&]/g, ...) or a sanitization library
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>TestCorp Search</title>
  <style>
    body { font-family: sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; }
    .result { background: #f3f4f6; padding: 12px; border-radius: 6px; margin-top: 12px; }
    a { color: #4f46e5; }
  </style>
</head>
<body>
  <h1>TestCorp Employee Search</h1>
  <p>Search results for: <b>${q}</b></p>
  <div class="result">
    <p>No employees found matching your query.</p>
    <p><a href="/testvulnapp">← Back to lab</a></p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Vulnerable': 'REFLECTED_XSS' },
  });
}
