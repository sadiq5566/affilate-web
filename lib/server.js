import { cookies } from 'next/headers';
import { REGIONS } from './regions';
import { publicApi, settings } from './server/public';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export async function getRegion() {
  const value = (await cookies()).get('region')?.value;
  if (REGIONS[value]) return value;
  return REGIONS[process.env.DEFAULT_REGION] ? process.env.DEFAULT_REGION : 'UK';
}

/** Read from the database (in-process). Returns null when the item does not exist. */
export async function api(path, params = {}) {
  return publicApi(path, params);
}

export async function getSettings() {
  try {
    return settings();
  } catch {
    return { site_name: 'DealHaven', site_tagline: 'Verified discount codes & deals' };
  }
}

export function monthYear(locale = 'en-GB') {
  return new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}
