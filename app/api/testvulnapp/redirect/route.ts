import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get('next') || '/testvulnapp';

  // ⚠️ VULNERABILITY: No validation of the redirect target — allows open redirect to any URL
  // Should check: new URL(next).host === req.nextUrl.host (or use an allowlist)
  return new Response(null, {
    status: 302,
    headers: {
      Location: next,
      'X-Vulnerable': 'OPEN_REDIRECT',
    },
  });
}
