import crypto from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { all, get, exec, transaction, getSetting, setSetting } from '../db.js';
import { config, REGIONS, CONVERSION_STATUSES } from '../config.js';
import { coerce, uniqueSlug, paging, parseCsv, toCsv, HttpError } from '../util.js';
import { requireAuth, hashPassword, verifyPassword } from '../auth.js';
import { overview } from '../analytics.js';
import { recordConversion, normalizeStatus } from '../tracking.js';

const router = Router();
router.use(requireAuth);

/**
 * Resource definitions drive generic list / get / create / update / delete endpoints.
 *  fields:  column → type (string | number | int | bool)
 *  filters: query param → SQL column (exact match)
 */
const RESOURCES = {
  categories: {
    table: 'categories',
    alias: 'c',
    slugFrom: 'name',
    required: ['name'],
    fields: { name: 'string', slug: 'string', icon: 'string', description: 'string', sort_order: 'int', is_active: 'bool' },
    select: `SELECT c.*,
      (SELECT COUNT(*) FROM coupons WHERE category_id = c.id) AS coupon_count,
      (SELECT COUNT(*) FROM products WHERE category_id = c.id) AS product_count
      FROM categories c`,
    search: ['c.name'],
    filters: { is_active: 'c.is_active' },
    order: 'c.sort_order, c.name',
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
    },
    select: `SELECT s.*, c.name AS category_name,
      (SELECT COUNT(*) FROM coupons WHERE store_id = s.id) AS coupon_count,
      (SELECT COUNT(*) FROM products WHERE store_id = s.id) AS product_count,
      (SELECT COUNT(*) FROM clicks WHERE store_id = s.id) AS click_count
      FROM stores s LEFT JOIN categories c ON c.id = s.category_id`,
    search: ['s.name', 's.network'],
    filters: { country: 's.country', is_active: 's.is_active', category_id: 's.category_id', network: 's.network' },
    order: 's.name COLLATE NOCASE',
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
    filters: { store_id: 'p.store_id', category_id: 'p.category_id', country: 'p.country', is_active: 'p.is_active', is_featured: 'p.is_featured' },
    order: 'p.created_at DESC, p.id DESC',
  },
  coupons: {
    table: 'coupons',
    alias: 'cp',
    required: ['title', 'store_id'],
    fields: {
      title: 'string', description: 'string', code: 'string', discount_label: 'string', store_id: 'int', category_id: 'int',
      affiliate_url: 'string', country: 'string', is_featured: 'bool', is_verified: 'bool', is_exclusive: 'bool',
      is_active: 'bool', starts_at: 'string', expires_at: 'string',
    },
    select: `SELECT cp.*, s.name AS store_name, c.name AS category_name,
      (SELECT COUNT(*) FROM clicks WHERE item_type = 'coupon' AND item_id = cp.id) AS click_count,
      CASE WHEN cp.expires_at IS NOT NULL AND cp.expires_at != '' AND cp.expires_at < date('now') THEN 1 ELSE 0 END AS is_expired
      FROM coupons cp LEFT JOIN stores s ON s.id = cp.store_id LEFT JOIN categories c ON c.id = cp.category_id`,
    search: ['cp.title', 'cp.code', 's.name'],
    filters: { store_id: 'cp.store_id', category_id: 'cp.category_id', country: 'cp.country', is_active: 'cp.is_active', is_featured: 'cp.is_featured' },
    order: 'cp.created_at DESC, cp.id DESC',
    extraFilter(q, where, params) {
      if (q.status === 'expired') where.push("cp.expires_at IS NOT NULL AND cp.expires_at != '' AND cp.expires_at < date('now')");
      if (q.status === 'live') where.push("(cp.expires_at IS NULL OR cp.expires_at = '' OR cp.expires_at >= date('now'))");
    },
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
    filters: { status: 'cv.status', store_id: 'cv.store_id', country: 'cv.country', source: 'cv.source' },
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
    filters: { store_id: 'ck.store_id', country: 'ck.country', item_type: 'ck.item_type' },
    dateCol: 'ck.created_at',
    order: 'ck.created_at DESC, ck.id DESC',
  },
  subscribers: {
    table: 'subscribers',
    alias: 'sb',
    readOnly: true,
    fields: {},
    select: 'SELECT sb.* FROM subscribers sb',
    search: ['sb.email'],
    filters: { country: 'sb.country' },
    order: 'sb.created_at DESC',
  },
};

function resource(req) {
  const def = RESOURCES[req.params.resource];
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
  def.extraFilter?.(q, where, params);
  return { sql: where.length ? ` WHERE ${where.join(' AND ')}` : '', params };
}

function readBody(def, body, isCreate) {
  const data = {};
  for (const [field, type] of Object.entries(def.fields)) {
    const v = coerce(type, body?.[field]);
    if (v !== undefined) data[field] = v;
  }
  if (isCreate) {
    for (const f of def.required || []) {
      if (data[f] == null || data[f] === '') throw new HttpError(400, `"${f.replace('_id', '')}" is required`);
    }
  } else {
    for (const f of def.required || []) {
      if (f in data && (data[f] == null || data[f] === '')) throw new HttpError(400, `"${f.replace('_id', '')}" is required`);
    }
  }
  if ('country' in data) data.country = data.country ? data.country.toUpperCase() : 'ALL';
  if ('currency' in data && data.currency) data.currency = data.currency.toUpperCase();
  if ('status' in data && def.table === 'conversions') data.status = normalizeStatus(data.status);
  return data;
}

// ----- auth / account --------------------------------------------------------

router.get('/me', (req, res) => res.json(req.user));

router.post('/password', (req, res) => {
  const { current_password, new_password } = req.body || {};
  const user = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!verifyPassword(String(current_password || ''), user.password_hash)) throw new HttpError(400, 'Current password is wrong');
  if (String(new_password || '').length < 8) throw new HttpError(400, 'New password must be at least 8 characters');
  exec('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(new_password), user.id]);
  res.json({ ok: true });
});

// ----- analytics -------------------------------------------------------------

router.get('/analytics/overview', (req, res) => res.json(overview(req.query)));

// ----- dropdown options ------------------------------------------------------

router.get('/options', (req, res) => {
  res.json({
    stores: all('SELECT id, name, network, country FROM stores ORDER BY name COLLATE NOCASE'),
    categories: all('SELECT id, name FROM categories ORDER BY sort_order, name'),
    regions: REGIONS,
    statuses: CONVERSION_STATUSES,
  });
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

router.get('/settings', (req, res) => {
  const out = Object.fromEntries(SETTING_KEYS.map((k) => [k, getSetting(k, '')]));
  out.postback_token = ensurePostbackToken();
  out.postback_url = `${config.apiPublicUrl}/api/postback?token=${out.postback_token}&click_id={subid}&order_ref={order_id}&sale_amount={amount}&commission={commission}&currency={currency}&status={status}&network={network}`;
  out.tracking_url_example = `${config.apiPublicUrl}/go/coupon/<id>`;
  res.json(out);
});

router.put('/settings', (req, res) => {
  for (const k of SETTING_KEYS) {
    if (req.body?.[k] === undefined) continue;
    let v = req.body[k];
    if (k === 'fx_rates') {
      try {
        v = JSON.stringify(typeof v === 'string' ? JSON.parse(v) : v);
      } catch {
        throw new HttpError(400, 'Exchange rates must be valid JSON, e.g. {"GBP": 1.17}');
      }
    }
    setSetting(k, v);
  }
  res.json({ ok: true });
});

router.post('/settings/regenerate-token', (req, res) => {
  setSetting('postback_token', crypto.randomBytes(16).toString('hex'));
  res.json({ ok: true });
});

// ----- uploads ---------------------------------------------------------------

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(config.dataDir, 'uploads'),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.jpg';
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(png|jpe?g|webp|gif|svg\+xml|avif)$/.test(file.mimetype)),
});

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) throw new HttpError(400, 'Please upload an image (png, jpg, webp, gif, svg, avif – max 5MB)');
  res.json({ url: `${config.apiPublicUrl}/uploads/${req.file.filename}` });
});

// ----- conversions extras ----------------------------------------------------

router.post('/conversions/import', (req, res) => {
  const rows = parseCsv(String(req.body?.csv || ''));
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
          network: r.network || req.body?.network,
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
  res.json(result);
});

router.post('/conversions', (req, res) => {
  const out = recordConversion({ ...req.body, source: 'manual' });
  res.status(201).json(get('SELECT * FROM conversions WHERE id = ?', [out.id]));
});

router.get('/subscribers/export', (req, res) => {
  const rows = all('SELECT email, country, consent, created_at FROM subscribers ORDER BY created_at DESC');
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="subscribers.csv"');
  res.send(toCsv(rows, ['email', 'country', 'consent', 'created_at']));
});

router.get('/conversions/export', (req, res) => {
  const def = RESOURCES.conversions;
  const { sql, params } = buildWhere(def, req.query);
  const rows = all(`${def.select}${sql} ORDER BY ${def.order}`, params);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="conversions.csv"');
  res.send(toCsv(rows, ['converted_at', 'store_name', 'order_ref', 'click_id', 'sale_amount', 'commission', 'currency', 'status', 'network', 'country', 'source', 'note']));
});

// ----- generic CRUD ----------------------------------------------------------

router.get('/:resource', (req, res) => {
  const def = resource(req);
  const { limit, offset, page } = paging(req.query);
  const { sql, params } = buildWhere(def, req.query);
  const total = get(`SELECT COUNT(*) n FROM (${def.select}${sql})`, params).n;
  const items = all(`${def.select}${sql} ORDER BY ${def.order} LIMIT ? OFFSET ?`, [...params, limit, offset]);
  res.json({ items, total, page, limit });
});

router.get('/:resource/:id', (req, res) => {
  const def = resource(req);
  const row = get(`${def.select} WHERE ${def.alias}.id = ?`, [req.params.id]);
  if (!row) throw new HttpError(404, 'Not found');
  res.json(row);
});

router.post('/:resource', (req, res) => {
  const def = resource(req);
  if (def.readOnly) throw new HttpError(405, 'Read-only resource');
  const data = readBody(def, req.body, true);
  if (def.slugFrom) data.slug = uniqueSlug(def.table, data.slug || data[def.slugFrom]);
  const cols = Object.keys(data);
  const r = exec(
    `INSERT INTO ${def.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    cols.map((c) => data[c]),
  );
  res.status(201).json(get(`${def.select} WHERE ${def.alias}.id = ?`, [Number(r.lastInsertRowid)]));
});

router.put('/:resource/:id', (req, res) => {
  const def = resource(req);
  if (def.readOnly) throw new HttpError(405, 'Read-only resource');
  const id = Number(req.params.id);
  if (!get(`SELECT id FROM ${def.table} WHERE id = ?`, [id])) throw new HttpError(404, 'Not found');
  const data = readBody(def, req.body, false);
  if (def.slugFrom && 'slug' in data) data.slug = uniqueSlug(def.table, data.slug || data[def.slugFrom] || 'item', id);
  const cols = Object.keys(data);
  if (cols.length) {
    exec(
      `UPDATE ${def.table} SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`,
      [...cols.map((c) => data[c]), id],
    );
  }
  res.json(get(`${def.select} WHERE ${def.alias}.id = ?`, [id]));
});

router.post('/:resource/bulk', (req, res) => {
  const def = resource(req);
  const ids = (req.body?.ids || []).map(Number).filter(Boolean);
  const action = req.body?.action;
  if (!ids.length) throw new HttpError(400, 'Nothing selected');
  const marks = ids.map(() => '?').join(',');
  if (action === 'delete') exec(`DELETE FROM ${def.table} WHERE id IN (${marks})`, ids);
  else if (!def.readOnly && (action === 'activate' || action === 'deactivate') && 'is_active' in def.fields)
    exec(`UPDATE ${def.table} SET is_active = ? WHERE id IN (${marks})`, [action === 'activate' ? 1 : 0, ...ids]);
  else if (def.table === 'conversions' && CONVERSION_STATUSES.includes(action))
    exec(`UPDATE conversions SET status = ?, updated_at = datetime('now') WHERE id IN (${marks})`, [action, ...ids]);
  else throw new HttpError(400, 'Unknown bulk action');
  res.json({ ok: true, count: ids.length });
});

router.delete('/:resource/:id', (req, res) => {
  const def = resource(req);
  exec(`DELETE FROM ${def.table} WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
});

export default router;
