/**
 * Shared in-memory state for the OkNexus Vulnerable Lab.
 *
 * Uses globalThis so the same state is shared across ALL Next.js route
 * handlers, server components, and API routes within a single process
 * (i.e., in `next dev`). In production/serverless each lambda would be
 * isolated, but this app is demo-only on localhost.
 */

import { NextRequest } from 'next/server';

// ── Static user store ────────────────────────────────────────────────────────

export const USERS: Record<number, {
  id: number; name: string; email: string; role: string; ssn: string;
}> = {
  1: { id: 1, name: 'Alice Johnson', email: 'alice@testcorp.com', role: 'admin', ssn: '123-45-6789' },
  2: { id: 2, name: 'Bob Smith',     email: 'bob@testcorp.com',   role: 'user',  ssn: '987-65-4321' },
  3: { id: 3, name: 'Carol White',   email: 'carol@testcorp.com', role: 'user',  ssn: '555-12-3456' },
};

const CREDS: Record<string, [number, string]> = {
  alice:                [1, 'password123'],
  bob:                  [2, 'password123'],
  carol:                [3, 'password123'],
  'alice@testcorp.com': [1, 'password123'],
  'bob@testcorp.com':   [2, 'password123'],
  'carol@testcorp.com': [3, 'password123'],
};

// ── Global mutable state (survives Next.js hot-reloads) ──────────────────────

interface VulnState {
  SESSIONS: Record<string, number>;
  COMMENTS: Array<{ author: string; text: string }>;
  PROFILE: { bio: string; website: string };
}

const g = globalThis as typeof globalThis & { __testvulnState?: VulnState };
if (!g.__testvulnState) {
  g.__testvulnState = {
    SESSIONS: {},
    COMMENTS: [],
    PROFILE: { bio: 'Security enthusiast and coffee lover.', website: 'https://testcorp.com' },
  };
}

// Named exports that always point to the live objects
export const SESSIONS: Record<string, number>              = g.__testvulnState.SESSIONS;
export const COMMENTS: Array<{ author: string; text: string }> = g.__testvulnState.COMMENTS;
export const PROFILE:  { bio: string; website: string }    = g.__testvulnState.PROFILE;

// ── Helpers ──────────────────────────────────────────────────────────────────

export function resolveUser(req: NextRequest): (typeof USERS)[number] | null {
  const token =
    req.headers.get('X-Session-Token') ||
    req.cookies.get('session_token')?.value;
  if (!token) return null;
  const uid = SESSIONS[token];
  return uid ? USERS[uid] : null;
}

export function validateCreds(username: string, password: string) {
  const entry = CREDS[username.trim().toLowerCase()];
  if (!entry || entry[1] !== password.trim()) return null;
  const [uid] = entry;
  const token = `tok_${uid}_${Date.now()}`;
  SESSIONS[token] = uid;
  return { token, uid, name: USERS[uid].name, role: USERS[uid].role };
}

export function resetState() {
  Object.keys(SESSIONS).forEach(k => delete SESSIONS[k]);
  COMMENTS.splice(0, COMMENTS.length);
  PROFILE.bio     = 'Security enthusiast and coffee lover.';
  PROFILE.website = 'https://testcorp.com';
}
