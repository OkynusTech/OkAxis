import { NextRequest, NextResponse } from 'next/server';
import { COMMENTS, resolveUser } from '@/lib/testvulnapp-state';

export async function GET() {
  return NextResponse.json(COMMENTS);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { text } = body;
  if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });

  const current = resolveUser(req);
  const author = current ? current.name : 'Anonymous';

  // ⚠️ VULNERABILITY: Raw user input stored and reflected — zero sanitization (Stored XSS)
  const comment = { author, text };
  COMMENTS.push(comment);
  return NextResponse.json({ message: 'Comment posted', comment });
}
