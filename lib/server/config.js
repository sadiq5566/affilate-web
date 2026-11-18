import path from 'node:path';

// Next.js loads .env / .env.local automatically.
const env = process.env;

export const config = {
  siteUrl: (env.NEXT_PUBLIC_SITE_URL || env.SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  adminEmail: env.ADMIN_EMAIL || 'admin@example.com',
  adminPassword: env.ADMIN_PASSWORD || 'admin123',
  jwtSecret: env.JWT_SECRET || '',
  dataDir: path.resolve(process.cwd(), env.DATA_DIR || 'data'),
};

// Markets the site operates in. 'ALL' on an item means "show in every region".
export const REGIONS = {
  UK: { name: 'United Kingdom', currency: 'GBP', locale: 'en-GB' },
  DE: { name: 'Germany', currency: 'EUR', locale: 'de-DE' },
  FR: { name: 'France', currency: 'EUR', locale: 'fr-FR' },
  IT: { name: 'Italy', currency: 'EUR', locale: 'it-IT' },
};

export const CONVERSION_STATUSES = ['pending', 'approved', 'rejected', 'paid'];

// Loud reminder (once, at runtime – not during `next build`) when production still uses development defaults.
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build' && !globalThis.__envWarned) {
  globalThis.__envWarned = true;
  if (!config.jwtSecret || config.jwtSecret.length < 32) console.warn('[config] JWT_SECRET is missing or short: set a random value of 32+ characters.');
  if (config.adminPassword === 'admin123') console.warn('[config] ADMIN_PASSWORD is still the default "admin123": change it.');
  if (/localhost/.test(config.siteUrl)) console.warn('[config] NEXT_PUBLIC_SITE_URL points to localhost: set your real domain.');
}
