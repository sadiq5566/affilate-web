import { cookies } from 'next/headers';
import { REGIONS } from './regions';

const API_URL = process.env.API_URL || 'http://localhost:4000';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export async function getRegion() {
  const value = (await cookies()).get('region')?.value;
  if (REGIONS[value]) return value;
  return REGIONS[process.env.DEFAULT_REGION] ? process.env.DEFAULT_REGION : 'UK';
}

/** Fetch from the public API. Returns null on 404. */
export async function api(path, params = {}) {
  const url = new URL(`/api/public${path}`, API_URL);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return res.json();
}

export async function getSettings() {
  try {
    return await api('/settings');
  } catch {
    return { site_name: 'DealHaven', site_tagline: 'Verified discount codes & deals' };
  }
}

export function monthYear() {
  return new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
