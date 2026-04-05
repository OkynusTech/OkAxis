import { NextRequest, NextResponse } from 'next/server';
import { PROFILE, resolveUser } from '@/lib/testvulnapp-state';

export async function GET(req: NextRequest) {
  const current = resolveUser(req);
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ ...PROFILE, name: current.name, email: current.email });
}

export async function POST(req: NextRequest) {
  const current = resolveUser(req);
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // ⚠️ VULNERABILITY: State-changing request with no CSRF token validation
  if (body.bio     !== undefined) PROFILE.bio     = body.bio;
  if (body.website !== undefined) PROFILE.website = body.website;

  return NextResponse.json({ message: 'Profile updated', profile: { ...PROFILE } });
}
