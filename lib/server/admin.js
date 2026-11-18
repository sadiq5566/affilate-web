import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { all, get, exec, transaction, getSetting, setSetting } from './db.js';
import { config, REGIONS, CONVERSION_STATUSES } from './config.js';
import { coerce, slugify, uniqueSlug, paging, parseCsv, toCsv, HttpError } from './util.js';
import { authenticate, hashPassword, verifyPassword } from './auth.js';
import { overview } from './analytics.js';
import { recordConversion, normalizeStatus } from './tracking.js';

/**
 * Resource definitions drive generic list / get / create / update / delete endpoints.
 *  fields:  column → type (string | number | int | bool)
 *  filters: query param → SQL column (exact match)
 */
const TYPE_SQL = `COALESCE(NULLIF(cp.kind, ''), CASE WHEN cp.code IS NOT NULL AND cp.code != '' THEN 'code' ELSE 'sale' END)`;
const COUPON_KINDS = ['code', 'sale', 'print'];

const RESOURCES = {
  categories: {
    table: 'categories',
    alias: 'c',
    slugFrom: 'name',
    required: ['name'],
    fields: { name: 'string', slug: 'string', icon: 'string', image_url: 'string', description: 'string', sort_order: 'int', is_active: 'bool' },
    select: `SELECT c.*,
      (SELECT COUNT(*) FROM coupons WHERE category_id = c.id) AS coupon_count,
      (SELECT COUNT(*) FROM products WHERE category_id = c.id) AS product_count
      FROM categories c`,
    search: ['c.name'],
    filters: { is_active: 'c.is_active' },
    dateCol: 'c.created_at',
    special: {
      empty: (v, where) => v === '1' && where.push('(SELECT COUNT(*) FROM coupons WHERE category_id = c.id) = 0 AND (SELECT COUNT(*) FROM products WHERE category_id = c.id) = 0'),
    },
    sorts: { name: 'c.name COLLATE NOCASE', sort_order: 'c.sort_order', created_at: 'c.created_at', coupon_count: 'coupon_count', product_count: 'product_count' },
    order: 'c.sort_order, c.name',
    exportCols: [['name', 'name'], ['slug', 'slug'], ['icon', 'icon'], ['image_url', 'image_url'], ['description', 'description'], ['sort_order', 'sort_order'], ['is_active', 'is_active']],
    example: ['Fashion', 'fashion', '👗', '', 'Clothes and accessories', 0, 1],
  },
  stores: {
    table: 'stores',
    alias: 's',
    slugFrom: 'name',
    required: ['name'],
    fields: {
      name: 'string', slug: 'string', logo_url: 'string', website_url: 'string', description: 'string',
      affiliate_url: 'string', network: 'string', subid_param: 'string', commission_type: 'string',
      commission_value: 'number', country: 'string', category_id: 'int', is_featured: 'bool', is_active: 'bool',
      rating_avg: 'number', rating_count: 'int', last_checked_at: 'string', success_rate: 'int', editor_name: 'string',
      seo_title: 'string', seo_description: 'string', faq: 'string',
    },
    select: `SELECT s.*, c.name AS category_name,
      (SELECT COUNT(*) FROM coupons WHERE store_id = s.id) AS coupon_count,
      (SELECT COUNT(*) FROM products WHERE store_id = s.id) AS product_count,
      (SELECT COUNT(*) FROM clicks WHERE store_id = s.id) AS click_count
      FROM stores s LEFT JOIN categories c ON c.id = s.category_id`,
    search: ['s.name', 's.network'],
    filters: { country: 's.country', is_active: 's.is_active', is_featured: 's.is_featured', category_id: 's.category_id', network: 's.network', commission_type: 's.commission_type' },
    ranges: { commission: 's.commission_value', rating: 's.rating_avg' },
    dateCol: 's.created_at',
    special: {
      has_affiliate: (v, where) => where.push(v === '1' ? "s.affiliate_url IS NOT NULL AND s.affiliate_url != ''" : "(s.affiliate_url IS NULL OR s.affiliate_url = '')"),
      has_logo: (v, where) => where.push(v === '1' ? "s.logo_url IS NOT NULL AND s.logo_url != ''" : "(s.logo_url IS NULL OR s.logo_url = '')"),
      stale_days: (v, where, params) => {
        where.push("(s.last_checked_at IS NULL OR s.last_checked_at = '' OR s.last_checked_at < datetime('now', ?))");
        params.push(`-${Math.min(Math.max(parseInt(v, 10) || 7, 1), 365)} day`);
      },
      has_faq: (v, where) => where.push(v === '1' ? "s.faq IS NOT NULL AND s.faq != ''" : "(s.faq IS NULL OR s.faq = '')"),
      no_offers: (v, where) => v === '1' && where.push('(SELECT COUNT(*) FROM coupons WHERE store_id = s.id) = 0 AND (SELECT COUNT(*) FROM products WHERE store_id = s.id) = 0'),
    },
    sorts: { name: 's.name COLLATE NOCASE', created_at: 's.created_at', commission_value: 's.commission_value', coupon_count: 'coupon_count', product_count: 'product_count', click_count: 'click_count' },
    order: 's.name COLLATE NOCASE',
    bulk: { checked: "UPDATE stores SET last_checked_at = datetime('now'), updated_at = datetime('now') WHERE id IN ({ids})" },
    exportCols: [['name', 'name'], ['slug', 'slug'], ['category', 'category_name'], ['country', 'country'], ['network', 'network'], ['affiliate_url', 'affiliate_url'], ['subid_param', 'subid_param'], ['commission_type', 'commission_type'], ['commission_value', 'commission_value'], ['website_url', 'website_url'], ['logo_url', 'logo_url'], ['description', 'description'], ['rating_avg', 'rating_avg'], ['rating_count', 'rating_count'], ['last_checked_at', 'last_checked_at'], ['success_rate', 'success_rate'], ['editor_name', 'editor_name'], ['seo_title', 'seo_title'], ['seo_description', 'seo_description'], ['faq', 'faq'], ['is_featured', 'is_featured'], ['is_active', 'is_active']],
    example: ['TechNova', 'technova', 'Electronics', 'UK', 'Awin', 'https://track.example.com/technova', 'clickref', 'percent', 4, 'https://technova.example.com', '', 'Laptops and phones', '', '', '', '', '', '', '', 'How do I use a code? | Paste it in the promo box at checkout.', 1, 1],
  },
  products: {
    table: 'products',
    alias: 'p',
    slugFrom: 'title',
    required: ['title', 'store_id'],
    fields: {
      title: 'string', slug: 'string', description: 'string', image_url: 'string', store_id: 'int', category_id: 'int',
      price: 'number', old_price: 'number', currency: 'string', affiliate_url: 'string', country: 'string',
      is_featured: 'bool', is_active: 'bool', expires_at: 'string',
    },
    select: `SELECT p.*, s.name AS store_name, c.name AS category_name,
      (SELECT COUNT(*) FROM clicks WHERE item_type = 'product' AND item_id = p.id) AS click_count
      FROM products p LEFT JOIN stores s ON s.id = p.store_id LEFT JOIN categories c ON c.id = p.category_id`,
    search: ['p.title', 's.name'],
    filters: { store_id: 'p.store_id', category_id: 'p.category_id', country: 'p.country', is_active: 'p.is_active', is_featured: 'p.is_featured', currency: 'p.currency' },
    ranges: { price: 'p.price', old_price: 'p.old_price' },
    dateCol: 'p.created_at',
    special: {
      status: (v, where) => {
        if (v === 'expired') where.push("p.expires_at IS NOT NULL AND p.expires_at != '' AND p.expires_at < date('now')");
        if (v === 'live') where.push("(p.expires_at IS NULL OR p.expires_at = '' OR p.expires_at >= date('now'))");
      },
      has_discount: (v, where) => where.push(v === '1' ? 'p.old_price > p.price' : '(p.old_price IS NULL OR p.old_price <= p.price)'),
      has_image: (v, where) => where.push(v === '1' ? "p.image_url IS NOT NULL AND p.image_url != ''" : "(p.image_url IS NULL OR p.image_url = '')"),
      has_link: (v, where) => where.push(v === '1' ? "p.affiliate_url IS NOT NULL AND p.affiliate_url != ''" : "(p.affiliate_url IS NULL OR p.affiliate_url = '')"),
      no_clicks: (v, where) => v === '1' && where.push("(SELECT COUNT(*) FROM clicks WHERE item_type = 'product' AND item_id = p.id) = 0"),
    },
    sorts: { created_at: 'p.created_at', title: 'p.title COLLATE NOCASE', price: 'p.price', expires_at: 'p.expires_at', click_count: 'click_count' },
    order: 'p.created_at DESC, p.id DESC',
    exportCols: [['title', 'title'], ['store', 'store_name'], ['category', 'category_name'], ['price', 'price'], ['old_price', 'old_price'], ['currency', 'currency'], ['country', 'country'], ['affiliate_url', 'affiliate_url'], ['image_url', 'image_url'], ['description', 'description'], ['slug', 'slug'], ['expires_at', 'expires_at'], ['is_featured', 'is_featured'], ['is_active', 'is_active']],
    example: ['Wireless Headphones', 'TechNova', 'Electronics', 79.99, 129.99, 'GBP', 'UK', '', 'https://example.com/img.jpg', 'Noise cancelling', '', '2026-12-31', 1, 1],
  },
  coupons: {
    table: 'coupons',
    alias: 'cp',
    required: ['title', 'store_id'],
    fields: {
      title: 'string', description: 'string', code: 'string', discount_label: 'string', store_id: 'int', category_id: 'int',
      affiliate_url: 'string', country: 'string', is_featured: 'bool', is_verified: 'bool', is_exclusive: 'bool',
      is_active: 'bool', starts_at: 'string', expires_at: 'string',
      kind: 'string', usage_note: 'string', verified_at: 'string', event_id: 'int',
    },
    select: `SELECT cp.*, s.name AS store_name, c.name AS category_name, ev.name AS event_name, ${TYPE_SQL} AS type,
      (SELECT COUNT(*) FROM clicks WHERE item_type = 'coupon' AND item_id = cp.id) AS click_count,
      CASE WHEN cp.expires_at IS NOT NULL AND cp.expires_at != '' AND cp.expires_at < date('now') THEN 1 ELSE 0 END AS is_expired
      FROM coupons cp LEFT JOIN stores s ON s.id = cp.store_id LEFT JOIN categories c ON c.id = cp.category_id LEFT JOIN events ev ON ev.id = cp.event_id`,
    search: ['cp.title', 'cp.code', 's.name'],
    filters: { store_id: 'cp.store_id', category_id: 'cp.category_id', country: 'cp.country', is_active: 'cp.is_active', is_featured: 'cp.is_featured', is_verified: 'cp.is_verified', is_exclusive: 'cp.is_exclusive', event_id: 'cp.event_id' },
    ranges: { uses: 'cp.uses' },
    dateCol: 'cp.created_at',
    special: {
      kind: (v, where, params) => {
        where.push(`${TYPE_SQL} = ?`);
        params.push(v === 'deal' ? 'sale' : v);
      },
      stale_days: (v, where, params) => {
        where.push("(cp.verified_at IS NULL OR cp.verified_at = '' OR cp.verified_at < datetime('now', ?))");
        params.push(`-${Math.min(Math.max(parseInt(v, 10) || 7, 1), 365)} day`);
      },
      has_code: (v, where) => where.push(v === '1' ? "cp.code IS NOT NULL AND cp.code != ''" : "(cp.code IS NULL OR cp.code = '')"),
      expiring_days: (v, where, params) => {
        where.push("cp.expires_at IS NOT NULL AND cp.expires_at != '' AND cp.expires_at BETWEEN date('now') AND date('now', ?)");
        params.push(`+${Math.min(Math.max(parseInt(v, 10) || 7, 1), 365)} day`);
      },
      no_expiry: (v, where) => v === '1' && where.push("(cp.expires_at IS NULL OR cp.expires_at = '')"),
      has_link: (v, where) => where.push(v === '1' ? "cp.affiliate_url IS NOT NULL AND cp.affiliate_url != ''" : "(cp.affiliate_url IS NULL OR cp.affiliate_url = '')"),
      no_clicks: (v, where) => v === '1' && where.push("(SELECT COUNT(*) FROM clicks WHERE item_type = 'coupon' AND item_id = cp.id) = 0"),
    },
    sorts: { created_at: 'cp.created_at', verified_at: 'cp.verified_at', title: 'cp.title COLLATE NOCASE', expires_at: 'cp.expires_at', uses: 'cp.uses', click_count: 'click_count' },
    order: 'cp.created_at DESC, cp.id DESC',
    bulk: { verify: "UPDATE coupons SET is_verified = 1, verified_at = datetime('now'), updated_at = datetime('now') WHERE id IN ({ids})" },
    exportCols: [['title', 'title'], ['store', 'store_name'], ['category', 'category_name'], ['type', 'type'], ['code', 'code'], ['discount_label', 'discount_label'], ['description', 'description'], ['usage_note', 'usage_note'], ['affiliate_url', 'affiliate_url'], ['country', 'country'], ['event', 'event_name'], ['starts_at', 'starts_at'], ['expires_at', 'expires_at'], ['verified_at', 'verified_at'], ['is_featured', 'is_featured'], ['is_verified', 'is_verified'], ['is_exclusive', 'is_exclusive'], ['is_active', 'is_active']],
    example: ['10% off everything', 'TechNova', 'Electronics', 'code', 'SAVE10', '10%', 'Valid on all orders', 'Paste the code in the basket before paying', '', 'UK', '', '', '2026-12-31', '', 0, 1, 0, 1],
    extraFilter(q, where) {
      if (q.status === 'expired') where.push("cp.expires_at IS NOT NULL AND cp.expires_at != '' AND cp.expires_at < date('now')");
      if (q.status === 'live') where.push("(cp.expires_at IS NULL OR cp.expires_at = '' OR cp.expires_at >= date('now'))");
    },
  },
  events: {
    table: 'events',
    alias: 'e',
    slugFrom: 'name',
    required: ['name'],
    fields: { name: 'string', slug: 'string', description: 'string', image_url: 'string', starts_on: 'string', ends_on: 'string', is_active: 'bool' },
    select: `SELECT e.*,
      (SELECT COUNT(*) FROM coupons WHERE event_id = e.id) AS coupon_count,
      CASE WHEN e.ends_on IS NOT NULL AND e.ends_on != '' AND e.ends_on < date('now') THEN 'ended'
           WHEN e.starts_on IS NOT NULL AND e.starts_on != '' AND e.starts_on > date('now') THEN 'upcoming' ELSE 'live' END AS phase
      FROM events e`,
    search: ['e.name'],
    filters: { is_active: 'e.is_active' },
    dateCol: 'e.created_at',
    special: {
      phase: (v, where) => {
        if (v === 'ended') where.push("e.ends_on IS NOT NULL AND e.ends_on != '' AND e.ends_on < date('now')");
        if (v === 'upcoming') where.push("e.starts_on IS NOT NULL AND e.starts_on != '' AND e.starts_on > date('now')");
        if (v === 'live') where.push("(e.ends_on IS NULL OR e.ends_on = '' OR e.ends_on >= date('now')) AND (e.starts_on IS NULL OR e.starts_on = '' OR e.starts_on <= date('now'))");
      },
    },
    sorts: { name: 'e.name COLLATE NOCASE', starts_on: 'e.starts_on', ends_on: 'e.ends_on', coupon_count: 'coupon_count' },
    order: 'CASE WHEN e.starts_on IS NULL OR e.starts_on = \'\' THEN 1 ELSE 0 END, e.starts_on, e.name',
    exportCols: [['name', 'name'], ['slug', 'slug'], ['description', 'description'], ['image_url', 'image_url'], ['starts_on', 'starts_on'], ['ends_on', 'ends_on'], ['is_active', 'is_active']],
    example: ['Black Friday 2026', 'black-friday-2026', 'The biggest sales of the year', '', '2026-11-20', '2026-11-30', 1],
  },
  articles: {
    table: 'articles',
    alias: 'a',
    slugFrom: 'title',
    required: ['title'],
    fields: {
      title: 'string', slug: 'string', excerpt: 'string', body: 'string', image_url: 'string', tag: 'string', author: 'string',
      seo_title: 'string', seo_description: 'string', is_active: 'bool', published_at: 'string',
    },
    select: "SELECT a.*, length(a.body) AS body_length, CASE WHEN a.published_at > date('now') THEN 1 ELSE 0 END AS is_scheduled FROM articles a",
    search: ['a.title', 'a.excerpt', 'a.tag', 'a.author'],
    filters: { is_active: 'a.is_active', tag: 'a.tag', author: 'a.author' },
    dateCol: 'a.published_at',
    special: {
      status: (v, where) => {
        if (v === 'scheduled') where.push("a.published_at > date('now')");
        if (v === 'published') where.push("a.is_active = 1 AND (a.published_at IS NULL OR a.published_at <= date('now'))");
      },
      has_image: (v, where) => where.push(v === '1' ? "a.image_url IS NOT NULL AND a.image_url != ''" : "(a.image_url IS NULL OR a.image_url = '')"),
      short: (v, where) => v === '1' && where.push('length(a.body) < 1200'),
    },
    sorts: { published_at: 'a.published_at', title: 'a.title COLLATE NOCASE', body_length: 'length(a.body)', created_at: 'a.created_at' },
    order: 'a.published_at DESC, a.id DESC',
    exportCols: [['title', 'title'], ['slug', 'slug'], ['tag', 'tag'], ['author', 'author'], ['published_at', 'published_at'], ['excerpt', 'excerpt'], ['body', 'body'], ['image_url', 'image_url'], ['seo_title', 'seo_title'], ['seo_description', 'seo_description'], ['is_active', 'is_active']],
    example: ['How to use a discount code', 'how-to-use-a-discount-code', 'Guides', 'Editor', '2026-11-01', 'A short summary', '## Step 1\nBody text in Markdown.', '', '', '', 1],
  },
  conversions: {
    table: 'conversions',
    alias: 'cv',
    fields: {
      click_id: 'string', store_id: 'int', order_ref: 'string', sale_amount: 'number', commission: 'number',
      currency: 'string', status: 'string', network: 'string', note: 'string', converted_at: 'string', country: 'string',
    },
    select: `SELECT cv.*, s.name AS store_name FROM conversions cv LEFT JOIN stores s ON s.id = cv.store_id`,
    search: ['cv.order_ref', 'cv.click_id', 's.name', 'cv.note'],
    filters: { status: 'cv.status', store_id: 'cv.store_id', country: 'cv.country', source: 'cv.source', currency: 'cv.currency', network: 'cv.network' },
    ranges: { commission: 'cv.commission', sale_amount: 'cv.sale_amount' },
    special: {
      has_click: (v, where) => where.push(v === '1' ? "cv.click_id IS NOT NULL AND cv.click_id != ''" : "(cv.click_id IS NULL OR cv.click_id = '')"),
    },
    exportCols: [['date', 'converted_at'], ['store', 'store_name'], ['order_ref', 'order_ref'], ['click_id', 'click_id'], ['sale_amount', 'sale_amount'], ['commission', 'commission'], ['currency', 'currency'], ['status', 'status'], ['network', 'network'], ['country', 'country'], ['note', 'note']],
    example: ['2026-10-01', 'TechNova', 'ORD-1001', 129.99, 5.2, 'GBP', 'approved', '', 'Awin', 'UK', ''],
    sorts: { converted_at: 'cv.converted_at', commission: 'cv.commission', sale_amount: 'cv.sale_amount', status: 'cv.status', store: 's.name COLLATE NOCASE' },
    dateCol: 'cv.converted_at',
    order: 'cv.converted_at DESC, cv.id DESC',
  },
  clicks: {
    table: 'clicks',
    alias: 'ck',
    readOnly: true,
    fields: {},
    select: `SELECT ck.*, s.name AS store_name, COALESCE(p.title, cp.title, s2.name) AS item_title,
      (SELECT COUNT(*) FROM conversions WHERE click_id = ck.click_id) AS converted
      FROM clicks ck
      LEFT JOIN stores s ON s.id = ck.store_id
      LEFT JOIN products p ON ck.item_type = 'product' AND p.id = ck.item_id
      LEFT JOIN coupons cp ON ck.item_type = 'coupon' AND cp.id = ck.item_id
      LEFT JOIN stores s2 ON ck.item_type = 'store' AND s2.id = ck.item_id`,
    search: ['ck.click_id', 's.name', 'ck.page'],
    filters: { store_id: 'ck.store_id', country: 'ck.country', item_type: 'ck.item_type', item_id: 'ck.item_id' },
    special: {
      converted: (v, where) => where.push(`(SELECT COUNT(*) FROM conversions WHERE click_id = ck.click_id) ${v === '1' ? '>' : '='} 0`),
      has_referrer: (v, where) => where.push(v === '1' ? "ck.referrer IS NOT NULL AND ck.referrer != ''" : "(ck.referrer IS NULL OR ck.referrer = '')"),
    },
    sorts: { created_at: 'ck.created_at', store: 's.name COLLATE NOCASE' },
    dateCol: 'ck.created_at',
    order: 'ck.created_at DESC, ck.id DESC',
    exportCols: [['created_at', 'created_at'], ['click_id', 'click_id'], ['item_type', 'item_type'], ['item_id', 'item_id'], ['store', 'store_name'], ['country', 'country'], ['page', 'page'], ['referrer', 'referrer']],
    example: ['2026-10-01 12:00:00', '', 'coupon', 1, 'TechNova', 'UK', '/coupons', ''],
  },
  subscribers: {
    table: 'subscribers',
    alias: 'sb',
    readOnly: true,
    fields: {},
    select: 'SELECT sb.* FROM subscribers sb',
    search: ['sb.email'],
    filters: { country: 'sb.country', consent: 'sb.consent' },
    dateCol: 'sb.created_at',
    sorts: { created_at: 'sb.created_at', email: 'sb.email' },
    order: 'sb.created_at DESC',
    exportCols: [['email', 'email'], ['country', 'country'], ['consent', 'consent'], ['created_at', 'created_at']],
    example: ['reader@example.com', 'UK', 1, ''],
  },
};

function resource(name) {
  const def = Object.hasOwn(RESOURCES, name) ? RESOURCES[name] : null;
  if (!def) throw new HttpError(404, 'Unknown resource');
  return def;
}

function buildWhere(def, q) {
  const where = [];
  const params = [];
  if (q.q && def.search?.length) {
    where.push(`(${def.search.map((c) => `${c} LIKE ?`).join(' OR ')})`);
    def.search.forEach(() => params.push(`%${q.q}%`));
  }
  for (const [param, col] of Object.entries(def.filters || {})) {
    if (q[param] !== undefined && q[param] !== '') {
      where.push(`${col} = ?`);
      params.push(q[param]);
    }
  }
  if (def.dateCol && q.from) {
    where.push(`${def.dateCol} >= ?`);
    params.push(`${q.from} 00:00:00`);
  }
  if (def.dateCol && q.to) {
    where.push(`${def.dateCol} <= ?`);
    params.push(`${q.to} 23:59:59`);
  }
  for (const [param, col] of Object.entries(def.ranges || {})) {
    for (const [suffix, op] of [['min', '>='], ['max', '<=']]) {
      const raw = q[`${param}_${suffix}`];
      if (raw !== undefined && raw !== '' && Number.isFinite(Number(raw))) {
        where.push(`${col} ${op} ?`);
        params.push(Number(raw));
      }
    }
  }
  for (const [param, fn] of Object.entries(def.special || {})) {
    if (q[param] !== undefined && q[param] !== '') fn(String(q[param]), where, params);
  }
  def.extraFilter?.(q, where, params);
  return { sql: where.length ? ` WHERE ${where.join(' AND ')}` : '', params };
}

function orderBy(def, q) {
  const col = def.sorts && Object.hasOwn(def.sorts, q.sort) ? def.sorts[q.sort] : null;
  if (!col) return def.order;
  return `${col} ${q.dir === 'asc' ? 'ASC' : 'DESC'}, ${def.alias}.id DESC`;
}

function readBody(def, body, isCreate) {
  const data = {};
  for (const [field, type] of Object.entries(def.fields)) {
    const v = coerce(type, body?.[field]);
    if (v !== undefined) data[field] = v;
  }
  for (const f of def.required || []) {
    const missing = data[f] == null || data[f] === '';
    if ((isCreate && missing) || (!isCreate && f in data && missing)) throw new HttpError(400, `"${f.replace('_id', '')}" is required`);
  }
  if ('country' in data) data.country = data.country ? data.country.toUpperCase() : 'ALL';
  if ('currency' in data && data.currency) data.currency = data.currency.toUpperCase();
  if ('status' in data && def.table === 'conversions') data.status = normalizeStatus(data.status);
  if ('kind' in data && data.kind) {
    const k = data.kind.toLowerCase();
    const kind = k === 'deal' ? 'sale' : k === 'printable' ? 'print' : k;
    if (!COUPON_KINDS.includes(kind)) throw new HttpError(400, 'Type must be code, sale or print');
    data.kind = kind;
  }
  return data;
}

const json = (data, status = 200) => NextResponse.json(data, { status });

const csv = (text, filename) =>
  new NextResponse(text, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });

// ----- settings --------------------------------------------------------------

const SETTING_KEYS = ['site_name', 'site_tagline', 'contact_email', 'default_region', 'base_currency', 'fx_rates'];

function ensurePostbackToken() {
  let token = getSetting('postback_token');
  if (!token) {
    token = crypto.randomBytes(16).toString('hex');
    setSetting('postback_token', token);
  }
  return token;
}

function readSettings() {
  const out = Object.fromEntries(SETTING_KEYS.map((k) => [k, getSetting(k, '')]));
  out.postback_token = ensurePostbackToken();
  out.postback_url = `${config.siteUrl}/api/postback?token=${out.postback_token}&click_id={subid}&order_ref={order_id}&sale_amount={amount}&commission={commission}&currency={currency}&status={status}&network={network}`;
  out.tracking_url_example = `${config.siteUrl}/go/coupon/<id>`;
  return out;
}

function saveSettings(body) {
  for (const k of SETTING_KEYS) {
    if (body?.[k] === undefined) continue;
    let v = body[k];
    if (k === 'fx_rates') {
      try {
        v = JSON.stringify(typeof v === 'string' ? JSON.parse(v) : v);
      } catch {
        throw new HttpError(400, 'Exchange rates must be valid JSON, e.g. {"GBP": 1.17}');
      }
    }
    setSetting(k, v);
  }
}

// ----- uploads ---------------------------------------------------------------

const IMAGE_TYPES = /^image\/(png|jpe?g|webp|gif|svg\+xml|avif)$/;
const MAX_UPLOAD = 5 * 1024 * 1024;

async function saveUpload(request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string' || !IMAGE_TYPES.test(file.type)) {
    throw new HttpError(400, 'Please upload an image (png, jpg, webp, gif, svg, avif – max 5MB)');
  }
  if (file.size > MAX_UPLOAD) throw new HttpError(400, 'File is too large (max 5MB)');
  const ext = path.extname(file.name || '').toLowerCase().replace(/[^.a-z0-9]/g, '') || '.jpg';
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  const dir = path.join(config.dataDir, 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return { url: `/uploads/${filename}` };
}

// ----- conversions import ----------------------------------------------------

function importConversions(body) {
  const rows = parseCsv(String(body?.csv || ''));
  if (!rows.length) throw new HttpError(400, 'CSV is empty. First row must contain headers.');
  const stores = all('SELECT id, name, slug FROM stores');
  const findStore = (v) => {
    const s = String(v || '').trim().toLowerCase();
    return s ? stores.find((x) => x.name.toLowerCase() === s || x.slug === s || String(x.id) === s)?.id : undefined;
  };
  const result = { created: 0, updated: 0, errors: [] };
  transaction(() => {
    rows.forEach((r, i) => {
      try {
        const out = recordConversion({
          click_id: r.click_id || r.subid || r.clickref,
          order_ref: r.order_ref || r.order_id || r.transaction_id,
          sale_amount: r.sale_amount || r.amount || r.sale,
          commission: r.commission,
          currency: r.currency,
          status: r.status,
          network: r.network || body?.network,
          note: r.note,
          converted_at: r.date || r.converted_at,
          store_id: findStore(r.store || r.store_id || r.advertiser),
          source: 'import',
        });
        out.updated ? result.updated++ : result.created++;
      } catch (e) {
        result.errors.push(`Row ${i + 2}: ${e.message}`);
      }
    });
  });
  return result;
}

// ----- generic CSV import / export ------------------------------------------

const IMPORT_ALIASES = {
  store: 'store_id', advertiser: 'store_id', category: 'category_id',
  link: 'affiliate_url', url: 'affiliate_url', image: 'image_url', logo: 'logo_url', website: 'website_url',
  discount: 'discount_label', expires: 'expires_at', ends: 'expires_at', starts: 'starts_at',
  region: 'country', visible: 'is_active', featured: 'is_featured',
};
const MAX_IMPORT_ROWS = 5000;
const nowSql = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const REFERENCE_KEYS = new Set([
  'store', 'store_slug', 'store_name', 'advertiser', 'store_id',
  'category', 'category_slug', 'category_name', 'category_id',
  'event', 'event_slug', 'event_id',
]);
const humanize = (v) => String(v).replace(/[-_]+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());

function findRef(list, value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (!v) return undefined;
  const slug = slugify(v);
  return list.find((x) => String(x.id) === v || x.name.toLowerCase() === v || x.slug === slug)?.id;
}

function findByName(list, value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (!v) return undefined;
  return list.find((x) => String(x.id) === v || x.name.toLowerCase() === v || x.slug === v)?.id;
}

function importResource(name, def, body) {
  const rows = parseCsv(String(body?.csv || ''));
  if (!rows.length) throw new HttpError(400, 'CSV is empty. The first row must contain column headers.');
  if (rows.length > MAX_IMPORT_ROWS) throw new HttpError(400, `Too many rows (max ${MAX_IMPORT_ROWS} per import).`);
  const stores = all('SELECT id, name, slug FROM stores');
  const categories = all('SELECT id, name, slug FROM categories');
  const events = all('SELECT id, name, slug FROM events');
  const createMissing = body?.create_missing !== false;
  const result = { created: 0, updated: 0, skipped: 0, created_stores: 0, created_categories: 0, created_events: 0, errors: [] };

  // Missing stores / categories / events named in the file are created on the fly (unless switched off).
  const ensure = (list, table, key, display, label, extra = {}, slugHint = '') => {
    const found = findRef(list, key);
    if (found) return found;
    if (!createMissing) throw new Error(`${label} "${key}" not found – create it first`);
    const nameText = String(display || humanize(key));
    const slug = uniqueSlug(table, slugHint || nameText);
    const cols = ['name', 'slug', ...Object.keys(extra)];
    const r = exec(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, [nameText, slug, ...Object.values(extra)]);
    const id = Number(r.lastInsertRowid);
    list.push({ id, name: nameText, slug });
    result[`created_${table}`]++;
    return id;
  };

  const upsert = (data, existingId) => {
    if (existingId) {
      const cols = Object.keys(data);
      if (cols.length) {
        exec(`UPDATE ${def.table} SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`, [...cols.map((c) => data[c]), existingId]);
      }
      result.updated++;
    } else {
      if (def.slugFrom) data.slug = uniqueSlug(def.table, data.slug || data[def.slugFrom]);
      if (def.table === 'coupons' && data.is_verified && !data.verified_at) data.verified_at = nowSql();
      const cols = Object.keys(data);
      exec(`INSERT INTO ${def.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, cols.map((c) => data[c]));
      result.created++;
    }
  };

  transaction(() => {
    rows.forEach((raw, i) => {
      try {
        const row = {};
        for (const [k, v] of Object.entries(raw)) {
          if (!REFERENCE_KEYS.has(k)) row[IMPORT_ALIASES[k] || k] = v;
        }
        if (name === 'coupons' && (raw.type || raw.coupon_type)) row.kind = raw.type || raw.coupon_type;

        if (name === 'subscribers') {
          const email = String(row.email || '').trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('invalid email');
          const consent = row.consent === undefined || row.consent === '' ? 1 : coerce('bool', row.consent);
          const country = String(row.country || '').toUpperCase();
          const r = exec('INSERT INTO subscribers (email, country, consent) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING', [email, REGIONS[country] ? country : null, consent]);
          if (r.changes) result.created++;
          else result.skipped++;
          return;
        }

        if (name === 'clicks') {
          const storeId = findByName(stores, raw.store ?? raw.store_id);
          const type = String(row.item_type || '').toLowerCase();
          if (!['coupon', 'product', 'store'].includes(type)) throw new Error('item_type must be coupon, product or store');
          const r = exec(
            `INSERT INTO clicks (click_id, item_type, item_id, store_id, country, page, referrer, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now'))) ON CONFLICT(click_id) DO NOTHING`,
            [String(row.click_id || '').trim() || crypto.randomBytes(10).toString('hex'), type, coerce('int', row.item_id), storeId ?? null,
              String(row.country || '').toUpperCase().slice(0, 3) || null, row.page || null, row.referrer || null, row.created_at || null],
          );
          if (r.changes) result.created++;
          else result.skipped++;
          return;
        }

        const region = String(row.country || '').toUpperCase();
        if (name === 'products' || name === 'coupons') {
          const key = raw.store_slug || raw.store_name || raw.store || raw.advertiser || raw.store_id;
          if (key) row.store_id = ensure(stores, 'stores', key, raw.store_name || raw.store || raw.advertiser, 'store', { country: REGIONS[region] ? region : 'ALL' }, raw.store_slug);
        }
        if (name === 'products' || name === 'coupons' || name === 'stores') {
          const key = raw.category_slug || raw.category || raw.category_name || raw.category_id;
          if (key) row.category_id = ensure(categories, 'categories', key, raw.category_name || raw.category, 'category', {}, raw.category_slug);
        }
        if (name === 'coupons') {
          const key = raw.event || raw.event_slug || raw.event_id;
          if (key) row.event_id = ensure(events, 'events', key, raw.event, 'event', {}, raw.event_slug);
        }

        const data = readBody(def, row, true);
        // Empty cells never overwrite existing values (and fall back to column defaults on new rows).
        for (const k of Object.keys(data)) if (data[k] == null) delete data[k];
        let existing;
        if (name === 'categories' || name === 'stores' || name === 'events') {
          const slug = data.slug || null;
          existing = (slug && get(`SELECT id FROM ${def.table} WHERE slug = ?`, [slug]))
            || get(`SELECT id FROM ${def.table} WHERE name = ? COLLATE NOCASE`, [data.name]);
        } else if (name === 'articles') {
          existing = (data.slug && get('SELECT id FROM articles WHERE slug = ?', [data.slug]))
            || get('SELECT id FROM articles WHERE title = ? COLLATE NOCASE', [data.title]);
        } else if (name === 'products') {
          existing = (data.slug && get('SELECT id FROM products WHERE slug = ?', [data.slug]))
            || get('SELECT id FROM products WHERE title = ? COLLATE NOCASE AND store_id = ?', [data.title, data.store_id]);
        } else if (name === 'coupons') {
          existing = get("SELECT id FROM coupons WHERE title = ? COLLATE NOCASE AND store_id = ? AND COALESCE(code, '') = COALESCE(?, '')", [data.title, data.store_id, data.code ?? null]);
        }
        upsert(data, existing?.id);
      } catch (e) {
        result.errors.push(`Row ${i + 2}: ${e.message}`);
      }
    });
  });
  return result;
}

function exportResource(def, query, filename, template = false) {
  const cols = def.exportCols;
  let rows = [];
  if (template) rows = [Object.fromEntries(cols.map(([h], i) => [h, def.example?.[i] ?? '']))];
  else {
    const { sql, params } = buildWhere(def, query);
    rows = all(`${def.select}${sql} ORDER BY ${orderBy(def, query)} LIMIT 50000`, params)
      .map((r) => Object.fromEntries(cols.map(([h, key]) => [h, r[key]])));
  }
  return csv(toCsv(rows, cols.map(([h]) => h)), filename);
}

// ----- router ----------------------------------------------------------------

/**
 * Handles every /api/admin/* request.  `segments` is the path after /api/admin, e.g. ['stores', '12'].
 * Throws HttpError for expected failures; see errorResponse().
 */
export async function handleAdmin(request, segments) {
  const user = authenticate(request);
  const method = request.method;
  const query = Object.fromEntries(request.nextUrl.searchParams);
  const [a, b] = segments;
  const isUpload = a === 'upload';
  const body = (method === 'POST' || method === 'PUT') && !isUpload ? await request.json().catch(() => ({})) : {};

  // account
  if (a === 'me' && !b && method === 'GET') return json(user);
  if (a === 'password' && !b && method === 'POST') {
    const { current_password, new_password } = body || {};
    const row = get('SELECT * FROM users WHERE id = ?', [user.id]);
    if (!verifyPassword(String(current_password || ''), row.password_hash)) throw new HttpError(400, 'Current password is wrong');
    if (String(new_password || '').length < 8) throw new HttpError(400, 'New password must be at least 8 characters');
    exec('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(new_password), row.id]);
    return json({ ok: true });
  }

  // analytics + dropdown options
  if (a === 'analytics' && b === 'overview' && method === 'GET') return json(overview(query));
  if (a === 'options' && !b && method === 'GET') {
    return json({
      stores: all('SELECT id, name, network, country FROM stores ORDER BY name COLLATE NOCASE'),
      categories: all('SELECT id, name FROM categories ORDER BY sort_order, name'),
      events: all('SELECT id, name FROM events ORDER BY starts_on, name'),
      regions: REGIONS,
      statuses: CONVERSION_STATUSES,
    });
  }

  // settings
  if (a === 'settings' && !b && method === 'GET') return json(readSettings());
  if (a === 'settings' && !b && method === 'PUT') {
    saveSettings(body);
    return json({ ok: true });
  }
  if (a === 'settings' && b === 'regenerate-token' && method === 'POST') {
    setSetting('postback_token', crypto.randomBytes(16).toString('hex'));
    return json({ ok: true });
  }

  if (isUpload && !b && method === 'POST') return json(await saveUpload(request));

  // conversions / subscribers extras
  if (a === 'conversions' && b === 'import' && method === 'POST') return json(importConversions(body));
  if (a === 'conversions' && !b && method === 'POST') {
    const out = recordConversion({ ...body, source: 'manual' });
    return json(get('SELECT * FROM conversions WHERE id = ?', [out.id]), 201);
  }

  // generic CRUD
  if (!a || segments.length > 2) throw new HttpError(404, 'Not found');
  const def = resource(a);

  if (b === 'export' && method === 'GET' && def.exportCols) {
    return exportResource(def, query, `${a}${query.template ? '-template' : ''}.csv`, query.template === '1');
  }
  if (b === 'import' && method === 'POST') {
    if (!def.exportCols) throw new HttpError(405, 'Import is not available for this resource');
    return json(importResource(a, def, body));
  }

  if (method === 'GET' && !b) {
    const { limit, offset, page } = paging(query);
    const { sql, params } = buildWhere(def, query);
    const total = get(`SELECT COUNT(*) n FROM (${def.select}${sql})`, params).n;
    const items = all(`${def.select}${sql} ORDER BY ${orderBy(def, query)} LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return json({ items, total, page, limit });
  }

  if (method === 'GET') {
    const row = get(`${def.select} WHERE ${def.alias}.id = ?`, [b]);
    if (!row) throw new HttpError(404, 'Not found');
    return json(row);
  }

  if (method === 'POST' && b === 'bulk') {
    const ids = (body?.ids || []).map(Number).filter(Boolean);
    const action = body?.action;
    if (!ids.length) throw new HttpError(400, 'Nothing selected');
    const marks = ids.map(() => '?').join(',');
    if (action === 'delete') exec(`DELETE FROM ${def.table} WHERE id IN (${marks})`, ids);
    else if (!def.readOnly && (action === 'activate' || action === 'deactivate') && 'is_active' in def.fields)
      exec(`UPDATE ${def.table} SET is_active = ? WHERE id IN (${marks})`, [action === 'activate' ? 1 : 0, ...ids]);
    else if (def.bulk && Object.hasOwn(def.bulk, action)) exec(def.bulk[action].replace('{ids}', marks), ids);
    else if (def.table === 'conversions' && CONVERSION_STATUSES.includes(action))
      exec(`UPDATE conversions SET status = ?, updated_at = datetime('now') WHERE id IN (${marks})`, [action, ...ids]);
    else throw new HttpError(400, 'Unknown bulk action');
    return json({ ok: true, count: ids.length });
  }

  if (method === 'POST' && !b) {
    if (def.readOnly) throw new HttpError(405, 'Read-only resource');
    const data = readBody(def, body, true);
    if (def.slugFrom) data.slug = uniqueSlug(def.table, data.slug || data[def.slugFrom]);
    if (def.table === 'coupons' && data.is_verified && !data.verified_at) data.verified_at = nowSql();
    const cols = Object.keys(data);
    const r = exec(
      `INSERT INTO ${def.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => data[c]),
    );
    return json(get(`${def.select} WHERE ${def.alias}.id = ?`, [Number(r.lastInsertRowid)]), 201);
  }

  if (method === 'PUT' && b) {
    if (def.readOnly) throw new HttpError(405, 'Read-only resource');
    const id = Number(b);
    if (!get(`SELECT id FROM ${def.table} WHERE id = ?`, [id])) throw new HttpError(404, 'Not found');
    const data = readBody(def, body, false);
    if (def.slugFrom && 'slug' in data) data.slug = uniqueSlug(def.table, data.slug || data[def.slugFrom] || 'item', id);
    const cols = Object.keys(data);
    if (cols.length) {
      exec(
        `UPDATE ${def.table} SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`,
        [...cols.map((c) => data[c]), id],
      );
    }
    return json(get(`${def.select} WHERE ${def.alias}.id = ?`, [id]));
  }

  if (method === 'DELETE' && b) {
    exec(`DELETE FROM ${def.table} WHERE id = ?`, [b]);
    return json({ ok: true });
  }

  throw new HttpError(405, 'Method not allowed');
}

/** Turns any thrown error into the JSON error shape the dashboard expects. */
export function errorResponse(err) {
  let status = err.status || 500;
  let message = err.message || 'Server error';
  if (/UNIQUE constraint failed/.test(message)) [status, message] = [400, 'An item with the same unique value already exists'];
  else if (/FOREIGN KEY constraint failed/.test(message)) [status, message] = [400, 'Linked store/category does not exist'];
  if (status >= 500) {
    console.error(err);
    message = 'Server error';
  }
  return NextResponse.json({ error: message }, { status });
}
