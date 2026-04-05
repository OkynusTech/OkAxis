import { NextRequest, NextResponse } from 'next/server';
import { SESSIONS } from '@/lib/testvulnapp-state';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (token) delete SESSIONS[token];

  const res = NextResponse.redirect(new URL('/testvulnapp', req.url));
  res.cookies.set('session_token', '', { maxAge: 0, path: '/' });
  return res;
}
