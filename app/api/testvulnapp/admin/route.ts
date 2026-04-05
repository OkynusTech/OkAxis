import { NextRequest, NextResponse } from 'next/server';
import { USERS, resolveUser } from '@/lib/testvulnapp-state';

export async function GET(req: NextRequest) {
  const current = resolveUser(req);
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ⚠️ VULNERABILITY: Checks authentication but NOT authorization — any user can access admin data
  // Should check: if (current.role !== 'admin') return 403
  return NextResponse.json({
    panel: 'Admin Control Panel',
    secret_key: 'ADMIN_SECRET_8675309',
    api_keys: ['sk-prod-abc123', 'sk-internal-xyz789'],
    all_users: Object.values(USERS),
    system_info: { version: '2.1.4', env: 'production', db: 'postgres://internal' },
  });
}
