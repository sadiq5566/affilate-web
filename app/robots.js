import { SITE_URL } from '@/lib/server';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/go/', '/search', '/api/', '/admin'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
