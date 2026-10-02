import { Router } from 'express';
import { all, get, exec, getSetting } from '../db.js';
import { REGIONS } from '../config.js';
import { paging } from '../util.js';

const router = Router();

function region(req) {
  const r = String(req.query.country || '').toUpperCase();
  return REGIONS[r] ? r : null;
}

// region is whitelisted against REGIONS, so it is safe to inline.
const inRegion = (alias, r) => (r ? ` AND (${alias}.country IS NULL OR ${alias}.country IN ('ALL', '${r}'))` : '');

const LIVE_COUPON = `cp.is_active = 1
  AND (cp.expires_at IS NULL OR cp.expires_at = '' OR cp.expires_at >= date('now'))
  AND (cp.starts_at IS NULL OR cp.starts_at = '' OR cp.starts_at <= date('now'))`;

const LIVE_PRODUCT = `p.is_active = 1 AND (p.expires_at IS NULL OR p.expires_at = '' OR p.expires_at >= date('now'))`;

const COUPON_SELECT = `
  SELECT cp.id, cp.title, cp.description, cp.code, cp.discount_label, cp.is_featured, cp.is_verified,
         cp.is_exclusive, cp.expires_at, cp.uses, cp.country, cp.store_id, cp.category_id,
         s.name AS store_name, s.slug AS store_slug, s.logo_url AS store_logo,
         CASE WHEN cp.code IS NOT NULL AND cp.code != '' THEN 'code' ELSE 'deal' END AS type
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

router.get('/settings', (req, res) => {
  res.json({
    site_name: getSetting('site_name', 'DealHaven'),
    site_tagline: getSetting('site_tagline', 'Verified discount codes & deals'),
    contact_email: getSetting('contact_email', ''),
    default_region: getSetting('default_region', 'UK'),
    regions: REGIONS,
  });
});

router.get('/home', (req, res) => {
  const r = region(req);
  res.json({
    featured_coupons: all(`${COUPON_SELECT} WHERE ${LIVE_COUPON}${inRegion('cp', r)} AND cp.is_featured = 1${couponOrder()} LIMIT 9`),
    latest_coupons: all(`${COUPON_SELECT} WHERE ${LIVE_COUPON}${inRegion('cp', r)} ORDER BY cp.created_at DESC LIMIT 12`),
    featured_products: all(
      `${PRODUCT_SELECT} WHERE ${LIVE_PRODUCT}${inRegion('p', r)} ORDER BY p.is_featured DESC, p.created_at DESC LIMIT 8`,
    ),
    stores: all(
      `${STORE_SELECT} WHERE s.is_active = 1${inRegion('s', r)} ORDER BY s.is_featured DESC, coupon_count DESC LIMIT 12`,
    ),
    categories: all('SELECT id, name, slug, icon FROM categories WHERE is_active = 1 ORDER BY sort_order, name'),
  });
});

router.get('/stores', (req, res) => {
  const r = region(req);
  res.json(all(`${STORE_SELECT} WHERE s.is_active = 1${inRegion('s', r)} ORDER BY s.name COLLATE NOCASE`));
});

router.get('/stores/:slug', (req, res) => {
  const r = region(req);
  const store = get(`${STORE_SELECT} WHERE s.slug = ? AND s.is_active = 1`, [req.params.slug]);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  const s = get('SELECT website_url, commission_value FROM stores WHERE id = ?', [store.id]);
  res.json({
    store: { ...store, website_url: s.website_url },
    coupons: all(`${COUPON_SELECT} WHERE cp.store_id = ? AND ${LIVE_COUPON}${inRegion('cp', r)}${couponOrder()}`, [store.id]),
    products: all(`${PRODUCT_SELECT} WHERE p.store_id = ? AND ${LIVE_PRODUCT}${inRegion('p', r)} ORDER BY p.is_featured DESC, p.created_at DESC`, [store.id]),
    related: all(
      `${STORE_SELECT} WHERE s.is_active = 1 AND s.id != ? AND s.category_id IS ? ${inRegion('s', r)} ORDER BY s.is_featured DESC LIMIT 6`,
      [store.id, store.category_id],
    ),
  });
});

router.get('/categories', (req, res) => {
  const r = region(req);
  res.json(
    all(
      `SELECT c.id, c.name, c.slug, c.icon, c.description,
        (SELECT COUNT(*) FROM coupons cp WHERE cp.category_id = c.id AND ${LIVE_COUPON}${inRegion('cp', r)}) AS coupon_count,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND ${LIVE_PRODUCT}${inRegion('p', r)}) AS product_count
       FROM categories c WHERE c.is_active = 1 ORDER BY c.sort_order, c.name`,
    ),
  );
});

router.get('/categories/:slug', (req, res) => {
  const r = region(req);
  const category = get('SELECT id, name, slug, icon, description FROM categories WHERE slug = ? AND is_active = 1', [req.params.slug]);
  if (!category) return res.status(404).json({ error: 'Category not found' });
  res.json({
    category,
    coupons: all(`${COUPON_SELECT} WHERE cp.category_id = ? AND ${LIVE_COUPON}${inRegion('cp', r)}${couponOrder()} LIMIT 60`, [category.id]),
    products: all(`${PRODUCT_SELECT} WHERE p.category_id = ? AND ${LIVE_PRODUCT}${inRegion('p', r)} ORDER BY p.is_featured DESC, p.created_at DESC LIMIT 60`, [category.id]),
    stores: all(`${STORE_SELECT} WHERE s.is_active = 1 AND s.category_id = ?${inRegion('s', r)} ORDER BY s.name LIMIT 24`, [category.id]),
  });
});

router.get('/coupons', (req, res) => {
  const r = region(req);
  const { limit, offset, page } = paging(req.query, 24);
  let where = `WHERE ${LIVE_COUPON}${inRegion('cp', r)}`;
  const params = [];
  if (req.query.type === 'code') where += " AND cp.code IS NOT NULL AND cp.code != ''";
  if (req.query.type === 'deal') where += " AND (cp.code IS NULL OR cp.code = '')";
  if (req.query.q) {
    where += ' AND (cp.title LIKE ? OR s.name LIKE ?)';
    params.push(`%${req.query.q}%`, `%${req.query.q}%`);
  }
  const total = get(`SELECT COUNT(*) n FROM coupons cp JOIN stores s ON s.id = cp.store_id AND s.is_active = 1 ${where}`, params).n;
  const order = req.query.sort === 'expiring'
    ? " ORDER BY CASE WHEN cp.expires_at IS NULL OR cp.expires_at = '' THEN 1 ELSE 0 END, cp.expires_at"
    : req.query.sort === 'popular' ? ' ORDER BY cp.uses DESC' : couponOrder();
  res.json({ items: all(`${COUPON_SELECT} ${where}${order} LIMIT ? OFFSET ?`, [...params, limit, offset]), total, page, limit });
});

router.get('/products', (req, res) => {
  const r = region(req);
  const { limit, offset, page } = paging(req.query, 24);
  let where = `WHERE ${LIVE_PRODUCT}${inRegion('p', r)}`;
  const params = [];
  if (req.query.q) {
    where += ' AND (p.title LIKE ? OR s.name LIKE ?)';
    params.push(`%${req.query.q}%`, `%${req.query.q}%`);
  }
  if (req.query.category) {
    where += ' AND c.slug = ?';
    params.push(req.query.category);
  }
  if (req.query.store) {
    where += ' AND s.slug = ?';
    params.push(req.query.store);
  }
  const sorts = {
    newest: 'p.created_at DESC',
    price_asc: 'p.price ASC',
    price_desc: 'p.price DESC',
    discount: 'discount_pct DESC',
  };
  const order = sorts[req.query.sort] || 'p.is_featured DESC, p.created_at DESC';
  const total = get(
    `SELECT COUNT(*) n FROM products p JOIN stores s ON s.id = p.store_id AND s.is_active = 1
     LEFT JOIN categories c ON c.id = p.category_id ${where}`,
    params,
  ).n;
  res.json({ items: all(`${PRODUCT_SELECT} ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, limit, offset]), total, page, limit });
});

router.get('/products/:slug', (req, res) => {
  const r = region(req);
  const product = get(`${PRODUCT_SELECT} WHERE p.slug = ? AND p.is_active = 1`, [req.params.slug]);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({
    product,
    coupons: all(`${COUPON_SELECT} WHERE cp.store_id = ? AND ${LIVE_COUPON}${inRegion('cp', r)}${couponOrder()} LIMIT 6`, [product.store_id]),
    related: all(
      `${PRODUCT_SELECT} WHERE ${LIVE_PRODUCT}${inRegion('p', r)} AND p.id != ? AND (p.category_id = ? OR p.store_id = ?)
       ORDER BY p.is_featured DESC, p.created_at DESC LIMIT 4`,
      [product.id, product.category_id, product.store_id],
    ),
  });
});

router.get('/search', (req, res) => {
  const r = region(req);
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ stores: [], coupons: [], products: [] });
  const like = `%${q}%`;
  res.json({
    stores: all(`${STORE_SELECT} WHERE s.is_active = 1${inRegion('s', r)} AND s.name LIKE ? ORDER BY s.name LIMIT 12`, [like]),
    coupons: all(
      `${COUPON_SELECT} WHERE ${LIVE_COUPON}${inRegion('cp', r)} AND (cp.title LIKE ? OR cp.description LIKE ? OR s.name LIKE ?)${couponOrder()} LIMIT 30`,
      [like, like, like],
    ),
    products: all(
      `${PRODUCT_SELECT} WHERE ${LIVE_PRODUCT}${inRegion('p', r)} AND (p.title LIKE ? OR p.description LIKE ? OR s.name LIKE ?) LIMIT 24`,
      [like, like, like],
    ),
  });
});

// Used by the website's sitemap.xml
router.get('/sitemap', (req, res) => {
  res.json({
    stores: all('SELECT slug, updated_at FROM stores WHERE is_active = 1'),
    categories: all('SELECT slug, updated_at FROM categories WHERE is_active = 1'),
    products: all(`SELECT p.slug, p.updated_at FROM products p WHERE ${LIVE_PRODUCT}`),
  });
});

router.post('/subscribe', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address' });
  if (!req.body?.consent) return res.status(400).json({ error: 'Please tick the consent box to subscribe' });
  exec('INSERT INTO subscribers (email, country, consent) VALUES (?, ?, 1) ON CONFLICT(email) DO NOTHING', [
    email,
    region({ query: { country: req.body.country } }),
  ]);
  res.json({ ok: true });
});

export default router;
