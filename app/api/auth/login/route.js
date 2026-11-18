import { NextResponse } from 'next/server';
import { get } from '@/lib/server/db';
import { ensureAdminUser, signToken, verifyPassword } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Simple in-memory brute-force guard: 20 attempts / 15 minutes per IP.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;
const attempts = (globalThis.__loginAttempts ??= new Map());

function limited(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > MAX_ATTEMPTS;
}

export async function POST(request) {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return NextResponse.json({ error: 'Too many login attempts, try again later' }, { status: 429 });

  ensureAdminUser();
  const body = await request.json().catch(() => ({}));
  const email = String(body?.email || '').trim().toLowerCase();
  const user = get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !verifyPassword(String(body?.password || ''), user.password_hash)) {
    return NextResponse.json({ error: 'Wrong email or password' }, { status: 401 });
  }
  return NextResponse.json({ token: signToken(user), user: { id: user.id, email: user.email, name: user.name } });
}
