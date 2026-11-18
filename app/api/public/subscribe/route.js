import { NextResponse } from 'next/server';
import { subscribe } from '@/lib/server/public';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 10 sign-ups per hour per IP (in memory) + a hidden honeypot field that only bots fill in.
const WINDOW_MS = 60 * 60 * 1000;
const MAX = 10;
const hits = (globalThis.__subscribeHits ??= new Map());

export async function POST(request) {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (recent.length > MAX) return NextResponse.json({ error: 'Too many attempts, please try again later' }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  if (body?.website) return NextResponse.json({ ok: true }); // honeypot: pretend success
  const result = subscribe(body);
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}
