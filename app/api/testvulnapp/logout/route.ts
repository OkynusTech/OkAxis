import { NextRequest, NextResponse } from 'next/server';
import { SESSIONS } from '@/lib/testvulnapp-state';

export async function POST(req: NextRequest) {
  const token = req.headers.get('X-Session-Token') || req.cookies.get('session_token')?.value;
  if (token) delete SESSIONS[token];
  const res = NextResponse.json({ message: 'Logged out' });
  res.cookies.set('session_token', '', { maxAge: 0, path: '/' });
  return res;
}
