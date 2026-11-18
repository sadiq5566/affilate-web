import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/server/db';
import { recordConversion } from '@/lib/server/tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Affiliate network postback (S2S) – records sales / leads automatically.
// The URL (with token) is shown in Admin → Settings.
async function handle(request) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  if (request.method === 'POST') {
    const ct = request.headers.get('content-type') || '';
    const body = ct.includes('json')
      ? await request.json().catch(() => ({}))
      : Object.fromEntries(await request.formData().catch(() => new FormData()));
    Object.assign(params, body);
  }
  const token = getSetting('postback_token');
  if (!params.token || params.token !== token) return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  try {
    return NextResponse.json({ ok: true, ...recordConversion({ ...params, source: 'postback' }) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export { handle as GET, handle as POST };
