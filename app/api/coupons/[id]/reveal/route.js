import { NextResponse } from 'next/server';
import { revealCoupon } from '@/lib/server/public';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 60 reveals / minute / IP so scrapers cannot harvest every code.
const WINDOW_MS = 60 * 1000;
const MAX = 60;
const hits = (globalThis.__revealHits ??= new Map());

export async function POST(request, { params }) {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (recent.length > MAX) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { id } = await params;
  const coupon = revealCoupon(Number(id));
  if (!coupon) return NextResponse.json({ error: 'Coupon not found or expired' }, { status: 404 });
  return NextResponse.json(coupon, { headers: { 'Cache-Control': 'no-store' } });
}
