import { NextRequest, NextResponse } from 'next/server';
import { validateCreds } from '@/lib/testvulnapp-state';

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const username = (form?.get('username') as string) ?? '';
  const password = (form?.get('password') as string) ?? '';

  const result = validateCreds(username, password);
  if (!result) {
    return NextResponse.redirect(new URL('/testvulnapp?error=invalid_credentials', req.url));
  }

  const res = NextResponse.redirect(new URL('/testvulnapp', req.url));
  res.cookies.set('session_token', result.token, {
    httpOnly: false,   // keep readable by JS so XSS demos work
    path: '/',
    sameSite: 'lax',
  });
  return res;
}

// Also accept JSON (for api_request compatibility)
export async function GET() {
  return NextResponse.redirect('/testvulnapp');
}
