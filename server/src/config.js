import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  process.loadEnvFile(path.join(serverRoot, '.env'));
} catch {
  // no .env file – rely on real environment variables
}

const env = process.env;

export const config = {
  port: Number(env.PORT || 4000),
  apiPublicUrl: (env.API_PUBLIC_URL || `http://localhost:${env.PORT || 4000}`).replace(/\/$/, ''),
  siteUrl: (env.SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  corsOrigins: (env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  adminEmail: env.ADMIN_EMAIL || 'admin@example.com',
  adminPassword: env.ADMIN_PASSWORD || 'admin123',
  jwtSecret: env.JWT_SECRET || '',
  dataDir: path.resolve(serverRoot, env.DATA_DIR || 'data'),
};

// Markets the site operates in. 'ALL' on an item means "show in every region".
export const REGIONS = {
  UK: { name: 'United Kingdom', currency: 'GBP', locale: 'en-GB' },
  FR: { name: 'France', currency: 'EUR', locale: 'fr-FR' },
  IT: { name: 'Italy', currency: 'EUR', locale: 'it-IT' },
};

export const CONVERSION_STATUSES = ['pending', 'approved', 'rejected', 'paid'];
