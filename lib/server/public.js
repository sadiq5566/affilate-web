import { all, get, exec, getSetting } from './db.js';
import { REGIONS } from './config.js';
import { paging } from './util.js';

function region(query) {
  const r = String(query.country || '').toUpperCase();
  return REGIONS[r] ? r : null;
}

// region is whitelisted against REGIONS, so it is safe to inline.
const inRegion = (alias, r) => (r ? ` AND (${alias}.country IS NULL OR ${alias}.country IN ('ALL', '${r}'))` : '');

const LIVE_COUPON = `cp.is_active = 1
  AND (cp.expires_at IS NULL OR cp.expires_at = '' OR cp.expires_at >= date('now'))
  AND (cp.starts_at IS NULL OR cp.starts_at = '' OR cp.starts_at <= date('now'))`;

const LIVE_PRODUCT = `p.is_active = 1 AND (p.expires_at IS NULL OR p.expires_at = '' OR p.expires_at >= date('now'))`;

// 'code' | 'sale' | 'print'. Empty kind = derived from whether a code exists.
const TYPE_SQL = `COALESCE(NULLIF(cp.kind, ''), CASE WHEN cp.code IS NOT NULL AND cp.code != '' THEN 'code' ELSE 'sale' END)`;

// The full code is NOT part of listings: the browser asks POST /api/coupons/:id/reveal when a visitor clicks.
// Only the last 3 characters are sent for the "peek" teaser on the button.
const COUPON_SELECT = `
  SELECT cp.id, cp.title, cp.description, cp.discount_label, cp.is_featured, cp.is_verified,
         cp.is_exclusive, cp.expires_at, cp.uses, cp.country, cp.store_id, cp.category_id,
         cp.verified_at, cp.usage_note, cp.event_id,
         s.name AS store_name, s.slug AS store_slug, s.logo_url AS store_logo,
         CASE WHEN cp.code IS NOT NULL AND cp.code != '' THEN substr(cp.code, -3) END AS code_peek,
         CASE WHEN cp.code IS NOT NULL AND cp.code != '' THEN 1 ELSE 0 END AS has_code,
         ${TYPE_SQL} AS type,
         (SELECT COUNT(*) FROM clicks k WHERE k.item_type = 'coupon' AND k.item_id = cp.id AND k.created_at >= date('now')) AS today_uses
  FROM coupons cp JOIN stores s ON s.id = cp.store_id AND s.is_active = 1`;

const PRODUCT_SELECT = `
  SELECT p.id, p.title, p.slug, p.description, p.image_url, p.price, p.old_price, p.currency, p.country,
         p.is_featured, p.expires_at, p.store_id, p.category_id, p.created_at,
         s.name AS store_name, s.slug AS store_slug, s.logo_url AS store_logo,
         c.name AS category_name, c.slug AS category_slug,
         CASE WHEN p.old_price > p.price AND p.old_price > 0
              THEN CAST(ROUND((p.old_price - p.price) * 100.0 / p.old_price) AS INTEGER) ELSE NULL END AS discount_pct
  FROM products p
  JOIN stores s ON s.id = p.store_id AND s.is_active = 1
  LEFT JOIN categories c ON c.id = p.category_id`;

const STORE_SELECT = `
  SELECT s.id, s.name, s.slug, s.logo_url, s.description, s.country, s.is_featured, s.category_id,
    (SELECT COUNT(*) FROM coupons cp WHERE cp.store_id = s.id AND ${LIVE_COUPON}) AS coupon_count,
    (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id AND ${LIVE_PRODUCT}) AS product_count
  FROM stores s`;

function couponOrder() {
  return ' ORDER BY cp.is_featured DESC, cp.is_exclusive DESC, cp.created_at DESC';
}

export function settings() {
  return {
    site_name: getSetting('site_name', 'DealHaven'),
    site_tagline: getSetting('site_tagline', 'Verified discount codes & deals'),
    contact_email: getSetting('contact_email', ''),
    default_region: getSetting('default_region', 'UK'),
    regions: REGIONS,
  };
}


const notFound = () => null;

/** FAQ is stored as text, one "Question | Answer" per line. */
export function parseFaq(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.split('|'))
    .filter((p) => p.length >= 2 && p[0].trim() && p.slice(1).join('|').trim())
    .map((p) => ({ q: p[0].trim(), a: p.slice(1).join('|').trim() }));
}

function home(query) {
  const r = region(query);
  return {
    featured_coupons: all(`${COUPON_SELECT} WHERE ${LIVE_COUPON}${inRegion('cp', r)} AND cp.is_featured = 1${couponOrder()} LIMIT 9`),
    latest_coupons: all(`${COUPON_SELECT} WHERE ${LIVE_COUPON}${inRegion('cp', r)} ORDER BY cp.created_at DESC LIMIT 12`),
    featured_products: all(
      `${PRODUCT_SELECT} WHERE ${LIVE_PRODUCT}${inRegion('p', r)} ORDER BY p.is_featured DESC, p.created_at DESC LIMIT 8`,
    ),
    stores: all(
      `${STORE_SELECT} WHERE s.is_active = 1${inRegion('s', r)} ORDER BY s.is_featured DESC, coupon_count DESC LIMIT 12`,
    ),
    categories: all('SELECT id, name, slug, icon, image_url FROM categories WHERE is_active = 1 ORDER BY sort_order, name'),
    events: eventsList(4),
    articles: latestArticles(3),
  };
}

function stores(query) {
  const r = region(query);
  return all(`${STORE_SELECT} WHERE s.is_active = 1${inRegion('s', r)} ORDER BY s.name COLLATE NOCASE`);
}

function storeDetail(slug, query) {
  const r = region(query);
  const store = get(`${STORE_SELECT} WHERE s.slug = ? AND s.is_active = 1`, [slug]);
  if (!store) return notFound();
  const s = get(
    `SELECT website_url, rating_avg, rating_count, last_checked_at, success_rate, editor_name, seo_title, seo_description, faq
     FROM stores WHERE id = ?`,
    [store.id],
  );
  return {
    store: {
      ...store,
      website_url: s.website_url,
      rating_avg: s.rating_avg,
      rating_count: s.rating_count,
      last_checked_at: s.last_checked_at,
      success_rate: s.success_rate,
      editor_name: s.editor_name,
      seo_title: s.seo_title,
      seo_description: s.seo_description,
      faq: parseFaq(s.faq),
    },
    coupons: all(`${COUPON_SELECT} WHERE cp.store_id = ? AND ${LIVE_COUPON}${inRegion('cp', r)}${couponOrder()}`, [store.id]),
    products: all(`${PRODUCT_SELECT} WHERE p.store_id = ? AND ${LIVE_PRODUCT}${inRegion('p', r)} ORDER BY p.is_featured DESC, p.created_at DESC`, [store.id]),
    related: all(
      `${STORE_SELECT} WHERE s.is_active = 1 AND s.id != ? AND s.category_id IS ? ${inRegion('s', r)} ORDER BY s.is_featured DESC LIMIT 6`,
      [store.id, store.category_id],
    ),
  };
}

function categories(query) {
  const r = region(query);
  return all(
    `SELECT c.id, c.name, c.slug, c.icon, c.image_url, c.description,
      (SELECT COUNT(*) FROM coupons cp WHERE cp.category_id = c.id AND ${LIVE_COUPON}${inRegion('cp', r)}) AS coupon_count,
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND ${LIVE_PRODUCT}${inRegion('p', r)}) AS product_count
     FROM categories c WHERE c.is_active = 1 ORDER BY c.sort_order, c.name`,
  );
}

function categoryDetail(slug, query) {
  const r = region(query);
  const category = get('SELECT id, name, slug, icon, image_url, description FROM categories WHERE slug = ? AND is_active = 1', [slug]);
  if (!category) return notFound();
  return {
    category,
    coupons: all(`${COUPON_SELECT} WHERE cp.category_id = ? AND ${LIVE_COUPON}${inRegion('cp', r)}${couponOrder()} LIMIT 60`, [category.id]),
    products: all(`${PRODUCT_SELECT} WHERE p.category_id = ? AND ${LIVE_PRODUCT}${inRegion('p', r)} ORDER BY p.is_featured DESC, p.created_at DESC LIMIT 60`, [category.id]),
    stores: all(`${STORE_SELECT} WHERE s.is_active = 1 AND s.category_id = ?${inRegion('s', r)} ORDER BY s.name LIMIT 24`, [category.id]),
  };
}

function coupons(query) {
  const r = region(query);
  const { limit, offset, page } = paging(query, 24);
  let where = `WHERE ${LIVE_COUPON}${inRegion('cp', r)}`;
  const params = [];
  const wanted = query.type === 'deal' ? 'sale' : query.type;
  if (['code', 'sale', 'print'].includes(wanted)) {
    where += ` AND ${TYPE_SQL} = ?`;
    params.push(wanted);
  }
  if (query.event) {
    where += ' AND cp.event_id = (SELECT id FROM events WHERE slug = ?)';
    params.push(query.event);
  }
  if (query.q) {
    where += ' AND (cp.title LIKE ? OR s.name LIKE ?)';
    params.push(`%${query.q}%`, `%${query.q}%`);
  }
  if (query.store) {
    where += ' AND s.slug = ?';
    params.push(query.store);
  }
  if (query.category) {
    where += ' AND cp.category_id = (SELECT id FROM categories WHERE slug = ?)';
    params.push(query.category);
  }
  if (query.exclusive === '1') where += ' AND cp.is_exclusive = 1';
  if (query.verified === '1') where += ' AND cp.is_verified = 1';
  const total = get(`SELECT COUNT(*) n FROM coupons cp JOIN stores s ON s.id = cp.store_id AND s.is_active = 1 ${where}`, params).n;
  const order = query.sort === 'expiring'
    ? " ORDER BY CASE WHEN cp.expires_at IS NULL OR cp.expires_at = '' THEN 1 ELSE 0 END, cp.expires_at"
    : query.sort === 'popular' ? ' ORDER BY cp.uses DESC' : couponOrder();
  return { items: all(`${COUPON_SELECT} ${where}${order} LIMIT ? OFFSET ?`, [...params, limit, offset]), total, page, limit };
}

function products(query) {
  const r = region(query);
  const { limit, offset, page } = paging(query, 24);
  let where = `WHERE ${LIVE_PRODUCT}${inRegion('p', r)}`;
  const params = [];
  if (query.q) {
    where += ' AND (p.title LIKE ? OR s.name LIKE ?)';
    params.push(`%${query.q}%`, `%${query.q}%`);
  }
  if (query.category) {
    where += ' AND c.slug = ?';
    params.push(query.category);
  }
  if (query.store) {
    where += ' AND s.slug = ?';
    params.push(query.store);
  }
  const sorts = {
    newest: 'p.created_at DESC',
    price_asc: 'p.price ASC',
    price_desc: 'p.price DESC',
    discount: 'discount_pct DESC',
  };
  const order = sorts[query.sort] || 'p.is_featured DESC, p.created_at DESC';
  const total = get(
    `SELECT COUNT(*) n FROM products p JOIN stores s ON s.id = p.store_id AND s.is_active = 1
     LEFT JOIN categories c ON c.id = p.category_id ${where}`,
    params,
  ).n;
  return { items: all(`${PRODUCT_SELECT} ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, limit, offset]), total, page, limit };
}

function productDetail(slug, query) {
  const r = region(query);
  const product = get(`${PRODUCT_SELECT} WHERE p.slug = ? AND p.is_active = 1`, [slug]);
  if (!product) return notFound();
  return {
    product,
    coupons: all(`${COUPON_SELECT} WHERE cp.store_id = ? AND ${LIVE_COUPON}${inRegion('cp', r)}${couponOrder()} LIMIT 6`, [product.store_id]),
    related: all(
      `${PRODUCT_SELECT} WHERE ${LIVE_PRODUCT}${inRegion('p', r)} AND p.id != ? AND (p.category_id = ? OR p.store_id = ?)
       ORDER BY p.is_featured DESC, p.created_at DESC LIMIT 4`,
      [product.id, product.category_id, product.store_id],
    ),
  };
}

function search(query) {
  const r = region(query);
  const q = String(query.q || '').trim();
  if (!q) return { stores: [], coupons: [], products: [] };
  const like = `%${q}%`;
  return {
    stores: all(`${STORE_SELECT} WHERE s.is_active = 1${inRegion('s', r)} AND s.name LIKE ? ORDER BY s.name LIMIT 12`, [like]),
    coupons: all(
      `${COUPON_SELECT} WHERE ${LIVE_COUPON}${inRegion('cp', r)} AND (cp.title LIKE ? OR cp.description LIKE ? OR s.name LIKE ?)${couponOrder()} LIMIT 30`,
      [like, like, like],
    ),
    products: all(
      `${PRODUCT_SELECT} WHERE ${LIVE_PRODUCT}${inRegion('p', r)} AND (p.title LIKE ? OR p.description LIKE ? OR s.name LIKE ?) LIMIT 24`,
      [like, like, like],
    ),
  };
}

/** Autocomplete for the header search box. */
export function suggest(query) {
  const r = region(query);
  const q = String(query.q || '').trim();
  if (q.length < 2) return { stores: [], coupons: [] };
  const like = `%${q.replace(/[%_]/g, '')}%`;
  return {
    stores: all(
      `SELECT s.name, s.slug, s.logo_url FROM stores s WHERE s.is_active = 1${inRegion('s', r)} AND s.name LIKE ? ORDER BY s.is_featured DESC, s.name LIMIT 5`,
      [like],
    ),
    coupons: all(
      `SELECT cp.id, cp.title, s.name AS store_name, s.slug AS store_slug FROM coupons cp JOIN stores s ON s.id = cp.store_id AND s.is_active = 1
       WHERE ${LIVE_COUPON}${inRegion('cp', r)} AND (cp.title LIKE ? OR s.name LIKE ?) ORDER BY cp.is_featured DESC, cp.uses DESC LIMIT 5`,
      [like, like],
    ),
  };
}

/** Returns the real code for one live coupon. Called when a visitor clicks "Show code". */
export function revealCoupon(id) {
  const c = get(
    `SELECT cp.id, cp.title, cp.code, cp.usage_note, cp.verified_at, cp.is_verified,
            s.name AS store_name, s.slug AS store_slug, s.logo_url AS store_logo,
            (SELECT COUNT(*) FROM clicks k WHERE k.item_type = 'coupon' AND k.item_id = cp.id AND k.created_at >= date('now')) AS today_uses
     FROM coupons cp JOIN stores s ON s.id = cp.store_id AND s.is_active = 1
     WHERE cp.id = ? AND ${LIVE_COUPON}`,
    [id],
  );
  if (!c || !c.code) return null;
  return c;
}

const LIVE_EVENT = "e.is_active = 1 AND (e.ends_on IS NULL OR e.ends_on = '' OR e.ends_on >= date('now'))";

function eventsList(limit = 50) {
  return all(
    `SELECT e.id, e.name, e.slug, e.description, e.image_url, e.starts_on, e.ends_on,
       (SELECT COUNT(*) FROM coupons cp WHERE cp.event_id = e.id AND ${LIVE_COUPON}) AS coupon_count
     FROM events e WHERE ${LIVE_EVENT}
     ORDER BY CASE WHEN e.starts_on IS NULL OR e.starts_on = '' THEN 1 ELSE 0 END, e.starts_on LIMIT ?`,
    [limit],
  );
}

function eventDetail(slug, query) {
  const r = region(query);
  const event = get(
    `SELECT e.id, e.name, e.slug, e.description, e.image_url, e.starts_on, e.ends_on FROM events e WHERE e.slug = ? AND e.is_active = 1`,
    [slug],
  );
  if (!event) return notFound();
  return {
    event,
    coupons: all(`${COUPON_SELECT} WHERE cp.event_id = ? AND ${LIVE_COUPON}${inRegion('cp', r)}${couponOrder()} LIMIT 100`, [event.id]),
    others: eventsList(6).filter((e) => e.id !== event.id),
  };
}

const LIVE_ARTICLE = "a.is_active = 1 AND (a.published_at IS NULL OR a.published_at = '' OR a.published_at <= date('now'))";
const ARTICLE_CARD = 'a.id, a.title, a.slug, a.excerpt, a.image_url, a.tag, a.author, a.published_at, length(a.body) AS body_length';

function latestArticles(limit) {
  return all(`SELECT ${ARTICLE_CARD} FROM articles a WHERE ${LIVE_ARTICLE} ORDER BY a.published_at DESC, a.id DESC LIMIT ?`, [limit]);
}

function articlesList(query) {
  const { limit, offset, page } = paging(query, 9);
  let where = `WHERE ${LIVE_ARTICLE}`;
  const params = [];
  if (query.tag) {
    where += ' AND a.tag = ?';
    params.push(query.tag);
  }
  if (query.q) {
    where += ' AND (a.title LIKE ? OR a.excerpt LIKE ?)';
    params.push(`%${query.q}%`, `%${query.q}%`);
  }
  const total = get(`SELECT COUNT(*) n FROM articles a ${where}`, params).n;
  const items = all(`SELECT ${ARTICLE_CARD} FROM articles a ${where} ORDER BY a.published_at DESC, a.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const tags = all(`SELECT a.tag, COUNT(*) n FROM articles a WHERE ${LIVE_ARTICLE} AND a.tag IS NOT NULL AND a.tag != '' GROUP BY a.tag ORDER BY n DESC, a.tag`);
  return { items, total, page, limit, tags };
}

function articleDetail(slug) {
  const article = get(
    `SELECT a.id, a.title, a.slug, a.excerpt, a.body, a.image_url, a.tag, a.author, a.seo_title, a.seo_description, a.published_at, a.updated_at
     FROM articles a WHERE a.slug = ? AND ${LIVE_ARTICLE}`,
    [slug],
  );
  if (!article) return notFound();
  const related = all(
    `SELECT ${ARTICLE_CARD} FROM articles a WHERE ${LIVE_ARTICLE} AND a.id != ? ORDER BY (a.tag = ?) DESC, a.published_at DESC LIMIT 3`,
    [article.id, article.tag ?? ''],
  );
  return { article, related };
}

// Used by sitemap.xml
function sitemap() {
  return {
    articles: all(`SELECT a.slug, a.updated_at FROM articles a WHERE ${LIVE_ARTICLE}`),
    events: all(`SELECT e.slug, e.updated_at FROM events e WHERE ${LIVE_EVENT}`),
    stores: all('SELECT slug, updated_at FROM stores WHERE is_active = 1'),
    categories: all('SELECT slug, updated_at FROM categories WHERE is_active = 1'),
    products: all(`SELECT p.slug, p.updated_at FROM products p WHERE ${LIVE_PRODUCT}`),
  };
}

/** Newsletter sign-up. Returns { error } on validation problems. */
export function subscribe(body) {
  const email = String(body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: 'Please enter a valid email address' };
  if (!body?.consent) return { error: 'Please tick the consent box to subscribe' };
  exec('INSERT INTO subscribers (email, country, consent) VALUES (?, ?, 1) ON CONFLICT(email) DO NOTHING', [
    email,
    region({ country: body.country }),
  ]);
  return { ok: true };
}

/**
 * In-process version of the old public REST API: publicApi('/stores/foo', { country: 'UK' }).
 * Returns null when the item does not exist.
 */
export function publicApi(path, query = {}) {
  const [, name, slug] = path.split('/');
  switch (name) {
    case 'settings': return settings();
    case 'home': return home(query);
    case 'stores': return slug ? storeDetail(slug, query) : stores(query);
    case 'categories': return slug ? categoryDetail(slug, query) : categories(query);
    case 'coupons': return coupons(query);
    case 'products': return slug ? productDetail(slug, query) : products(query);
    case 'search': return search(query);
    case 'sitemap': return sitemap();
    case 'events': return slug ? eventDetail(slug, query) : eventsList();
    case 'articles': return slug ? articleDetail(slug) : articlesList(query);
    default: return null;
  }
}
