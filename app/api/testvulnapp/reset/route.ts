import { NextResponse } from 'next/server';
import { resetState } from '@/lib/testvulnapp-state';

export async function POST() {
  resetState();
  return NextResponse.json({ message: 'State reset' });
}
