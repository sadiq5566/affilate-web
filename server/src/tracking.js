import crypto from 'node:crypto';
import { get, exec, getSetting } from './db.js';
import { config } from './config.js';
import { coerce } from './util.js';

const ITEM_TABLES = { product: 'products', coupon: 'coupons', store: 'stores' };

function ipHash(ip) {
  // Store only a salted hash of the IP (GDPR friendly) – enough for de-duplication.
  const salt = getSetting('jwt_secret') || config.jwtSecret || 'salt';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

// Builds the final outbound URL: replaces {click_id} placeholder and/or appends the
// store's sub-id parameter so the affiliate network reports the click id back to us.
export function buildOutboundUrl(rawUrl, store, clickId) {
  let url = String(rawUrl);
  if (url.includes('{click_id}')) return url.replaceAll('{click_id}', encodeURIComponent(clickId));
  if (store?.subid_param) {
    try {
      const u = new URL(url);
      u.searchParams.set(store.subid_param, clickId);
      return u.toString();
    } catch {
      return url;
    }
  }
  return url;
}

export function handleOutboundClick(req, res) {
  const type = req.params.type;
  const id = Number(req.params.id);
  const table = ITEM_TABLES[type];
  if (!table || !id) return res.redirect(302, config.siteUrl);

  const item = get(`SELECT * FROM ${table} WHERE id = ? AND is_active = 1`, [id]);
  if (!item) return res.redirect(302, config.siteUrl);

  const storeId = type === 'store' ? item.id : item.store_id;
  const store = get('SELECT * FROM stores WHERE id = ?', [storeId]);
  const target = item.affiliate_url || store?.affiliate_url || store?.website_url;
  if (!target) return res.redirect(302, config.siteUrl);

  const clickId = crypto.randomBytes(10).toString('hex');
  const country = String(req.query.country || '').toUpperCase().slice(0, 3) || null;
  const ua = String(req.get('user-agent') || '');
  const isBot = /bot|crawl|spider|slurp|preview|facebookexternalhit/i.test(ua);

  if (!isBot) {
    exec(
      `INSERT INTO clicks (click_id, item_type, item_id, store_id, country, page, referrer, user_agent, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clickId,
        type,
        id,
        storeId,
        country,
        String(req.query.page || '').slice(0, 300) || null,
        String(req.get('referer') || '').slice(0, 300) || null,
        ua.slice(0, 300),
        ipHash(req.ip),
      ],
    );
    if (type === 'coupon') exec('UPDATE coupons SET uses = uses + 1 WHERE id = ?', [id]);
  }

  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Cache-Control', 'no-store');
  res.redirect(302, buildOutboundUrl(target, store, clickId));
}

const STATUS_MAP = {
  pending: 'pending', open: 'pending', new: 'pending', 'on hold': 'pending',
  approved: 'approved', confirmed: 'approved', validated: 'approved', locked: 'approved', accepted: 'approved',
  rejected: 'rejected', declined: 'rejected', cancelled: 'rejected', canceled: 'rejected', reversed: 'rejected',
  paid: 'paid',
};

export function normalizeStatus(s) {
  return STATUS_MAP[String(s || '').trim().toLowerCase()] || 'pending';
}

/**
 * Create or update a conversion (sale / lead).
 * If the same order_ref (+network) already exists it is updated, so networks can
 * send status updates (pending → approved → paid) through the same postback.
 */
export function recordConversion(input) {
  const data = {
    click_id: coerce('string', input.click_id),
    order_ref: coerce('string', input.order_ref),
    sale_amount: coerce('number', input.sale_amount) ?? 0,
    commission: coerce('number', input.commission),
    currency: (coerce('string', input.currency) || 'EUR').toUpperCase().slice(0, 3),
    status: normalizeStatus(input.status),
    network: coerce('string', input.network),
    source: input.source || 'manual',
    note: coerce('string', input.note),
    converted_at: coerce('string', input.converted_at),
    store_id: coerce('int', input.store_id),
    item_type: coerce('string', input.item_type),
    item_id: coerce('int', input.item_id),
    country: coerce('string', input.country),
  };

  if (data.click_id) {
    const click = get('SELECT * FROM clicks WHERE click_id = ?', [data.click_id]);
    if (click) {
      data.store_id ??= click.store_id;
      data.item_type ??= click.item_type;
      data.item_id ??= click.item_id;
      data.country ??= click.country;
    }
  }

  // Estimate commission from the store's rate when the network didn't send one.
  if (data.commission == null) {
    const store = data.store_id ? get('SELECT * FROM stores WHERE id = ?', [data.store_id]) : null;
    if (store?.commission_value != null) {
      data.commission = store.commission_type === 'fixed'
        ? store.commission_value
        : Math.round(data.sale_amount * store.commission_value) / 100;
    } else data.commission = 0;
  }

  if (data.converted_at && /^\d{4}-\d{2}-\d{2}$/.test(data.converted_at)) data.converted_at += ' 12:00:00';

  const existing = data.order_ref
    ? get('SELECT id FROM conversions WHERE order_ref = ? AND COALESCE(network, \'\') = COALESCE(?, \'\')', [
        data.order_ref,
        data.network,
      ])
    : null;

  if (existing) {
    exec(
      `UPDATE conversions SET sale_amount = ?, commission = ?, currency = ?, status = ?, note = COALESCE(?, note),
        store_id = COALESCE(?, store_id), click_id = COALESCE(?, click_id), updated_at = datetime('now')
       WHERE id = ?`,
      [data.sale_amount, data.commission, data.currency, data.status, data.note, data.store_id, data.click_id, existing.id],
    );
    return { id: existing.id, updated: true };
  }

  const r = exec(
    `INSERT INTO conversions (click_id, store_id, item_type, item_id, country, order_ref, sale_amount, commission,
       currency, status, network, source, note, converted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`,
    [
      data.click_id, data.store_id, data.item_type, data.item_id, data.country, data.order_ref, data.sale_amount,
      data.commission, data.currency, data.status, data.network, data.source, data.note, data.converted_at,
    ],
  );
  return { id: Number(r.lastInsertRowid), updated: false };
}
