import { NextResponse } from 'next/server';
import { USERS, SESSIONS, COMMENTS } from '@/lib/testvulnapp-state';

export { USERS, SESSIONS, COMMENTS };

export function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'OkNexus Vulnerable Lab',
    users: Object.keys(USERS).length,
    sessions: Object.keys(SESSIONS).length,
    comments: COMMENTS.length,
  });
}
