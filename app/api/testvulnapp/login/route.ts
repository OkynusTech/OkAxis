import { NextRequest, NextResponse } from 'next/server';
import { validateCreds } from '@/lib/testvulnapp-state';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body;
  if (!username || !password)
    return NextResponse.json({ error: 'username and password required' }, { status: 400 });

  const result = validateCreds(username, password);
  if (!result)
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const res = NextResponse.json({
    token: result.token,
    user_id: result.uid,
    name: result.name,
    role: result.role,
    message: 'Login successful',
  });
  res.cookies.set('session_token', result.token, { httpOnly: false, path: '/' });
  return res;
}
