import { NextResponse } from 'next/server';
import { suggest } from '@/lib/server/public';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Autocomplete for the header search box: /api/public/search?q=nord&country=UK
export async function GET(request) {
  const query = Object.fromEntries(request.nextUrl.searchParams);
  return NextResponse.json(suggest(query), { headers: { 'Cache-Control': 'no-store' } });
}
