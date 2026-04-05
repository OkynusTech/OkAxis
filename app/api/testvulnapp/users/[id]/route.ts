import { NextRequest, NextResponse } from 'next/server';
import { USERS, resolveUser } from '@/lib/testvulnapp-state';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const current = resolveUser(req);
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const userId = parseInt(id, 10);
  const target = USERS[userId];
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // ⚠️ VULNERABILITY: No ownership check — bob (id=2) can read alice's (id=1) SSN
  return NextResponse.json(target);
}
