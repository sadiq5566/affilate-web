import { NextResponse } from 'next/server';

const REGIONS = ['UK', 'FR', 'IT'];
const COUNTRY_TO_REGION = { GB: 'UK', UK: 'UK', IE: 'UK', FR: 'FR', BE: 'FR', MC: 'FR', LU: 'FR', IT: 'IT', SM: 'IT', VA: 'IT' };

function detectRegion(request) {
  const geo = request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry');
  if (geo && COUNTRY_TO_REGION[geo.toUpperCase()]) return COUNTRY_TO_REGION[geo.toUpperCase()];
  const lang = (request.headers.get('accept-language') || '').toLowerCase();
  if (lang.startsWith('fr')) return 'FR';
  if (lang.startsWith('it')) return 'IT';
  return REGIONS.includes(process.env.DEFAULT_REGION) ? process.env.DEFAULT_REGION : 'UK';
}

// First visit: pick a region from geo-IP / browser language and remember it in a cookie.
export function middleware(request) {
  const current = request.cookies.get('region')?.value;
  if (REGIONS.includes(current)) return NextResponse.next();

  const region = detectRegion(request);
  request.cookies.set('region', region);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set('region', region, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  return response;
}

export const config = {
  matcher: ['/((?!_next|go/|api/|favicon|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)'],
};
