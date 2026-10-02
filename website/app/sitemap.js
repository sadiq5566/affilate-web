import { api, SITE_URL } from '@/lib/server';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const statics = ['', '/coupons', '/deals', '/stores', '/categories', '/about', '/affiliate-disclosure', '/privacy', '/terms'].map(
    (p) => ({ url: `${SITE_URL}${p}`, changeFrequency: 'daily', priority: p === '' ? 1 : 0.6 }),
  );
  let data = { stores: [], categories: [], products: [] };
  try {
    data = await api('/sitemap');
  } catch {
    /* API offline – return static pages only */
  }
  const toDate = (d) => (d ? new Date(`${d.replace(' ', 'T')}Z`) : undefined);
  return [
    ...statics,
    ...data.stores.map((s) => ({ url: `${SITE_URL}/stores/${s.slug}`, lastModified: toDate(s.updated_at), changeFrequency: 'daily', priority: 0.9 })),
    ...data.categories.map((c) => ({ url: `${SITE_URL}/categories/${c.slug}`, lastModified: toDate(c.updated_at), priority: 0.7 })),
    ...data.products.map((p) => ({ url: `${SITE_URL}/deals/${p.slug}`, lastModified: toDate(p.updated_at), priority: 0.5 })),
  ];
}
