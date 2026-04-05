import { NextRequest, NextResponse } from 'next/server';
import { COMMENTS, resolveUser } from '@/lib/testvulnapp-state';

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const text = (form?.get('text') as string) ?? '';

  if (text.trim()) {
    const user = resolveUser(req);
    const author = user ? user.name : 'Anonymous';
    // ⚠️ VULNERABILITY: text stored raw — zero sanitization (Stored XSS)
    COMMENTS.push({ author, text });
  }

  return NextResponse.redirect(new URL('/testvulnapp', req.url));
}
