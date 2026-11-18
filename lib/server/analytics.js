import { all, get, getSetting } from './db.js';

function fxRates() {
  try {
    return { EUR: 1, ...JSON.parse(getSetting('fx_rates', '{}')) };
  } catch {
    return { EUR: 1 };
  }
}

function dayList(from, to) {
  const days = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end && days.length < 1000) {
    days.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

export function normalizeRange(query) {
  const today = new Date().toISOString().slice(0, 10);
  const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  const to = isDate(query.to) ? query.to : today;
  let from = query.from;
  if (!isDate(from)) {
    const d = new Date(`${to}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 29);
    from = d.toISOString().slice(0, 10);
  }
  return { from, to, start: `${from} 00:00:00`, end: `${to} 23:59:59` };
}

/** Everything the dashboard overview needs, with money converted to the base currency. */
export function overview(query) {
  const { from, to, start, end } = normalizeRange(query);
  const rates = fxRates();
  const base = getSetting('base_currency', 'EUR');
  // rates are "1 unit of X = n EUR"; convert to base currency
  const toBase = (amount, cur) => {
    const eur = (amount || 0) * (rates[cur] ?? 1);
    return eur / (rates[base] ?? 1);
  };
  const round = (n) => Math.round(n * 100) / 100;

  const clicksTotal = get('SELECT COUNT(*) n FROM clicks WHERE created_at BETWEEN ? AND ?', [start, end]).n;

  const convRows = all(
    `SELECT status, currency, COUNT(*) n, SUM(sale_amount) sales, SUM(commission) commission
     FROM conversions WHERE converted_at BETWEEN ? AND ? GROUP BY status, currency`,
    [start, end],
  );
  const byStatus = { pending: 0, approved: 0, rejected: 0, paid: 0 };
  const countByStatus = { pending: 0, approved: 0, rejected: 0, paid: 0 };
  let sales = 0;
  let commission = 0;
  let conversions = 0;
  for (const r of convRows) {
    const c = toBase(r.commission, r.currency);
    byStatus[r.status] = (byStatus[r.status] || 0) + c;
    countByStatus[r.status] = (countByStatus[r.status] || 0) + r.n;
    if (r.status !== 'rejected') {
      sales += toBase(r.sales, r.currency);
      commission += c;
      conversions += r.n;
    }
  }

  // Previous period of the same length, for trend arrows.
  const days = dayList(from, to);
  const prevEndD = new Date(`${from}T00:00:00Z`);
  prevEndD.setUTCDate(prevEndD.getUTCDate() - 1);
  const prevStartD = new Date(prevEndD);
  prevStartD.setUTCDate(prevStartD.getUTCDate() - (days.length - 1));
  const pStart = `${prevStartD.toISOString().slice(0, 10)} 00:00:00`;
  const pEnd = `${prevEndD.toISOString().slice(0, 10)} 23:59:59`;
  const prevClicks = get('SELECT COUNT(*) n FROM clicks WHERE created_at BETWEEN ? AND ?', [pStart, pEnd]).n;
  const prevConv = all(
    `SELECT currency, COUNT(*) n, SUM(sale_amount) sales, SUM(commission) commission FROM conversions
     WHERE converted_at BETWEEN ? AND ? AND status != 'rejected' GROUP BY currency`,
    [pStart, pEnd],
  );
  const previous = prevConv.reduce(
    (acc, r) => ({
      clicks: acc.clicks,
      conversions: acc.conversions + r.n,
      sales: acc.sales + toBase(r.sales, r.currency),
      commission: acc.commission + toBase(r.commission, r.currency),
    }),
    { clicks: prevClicks, conversions: 0, sales: 0, commission: 0 },
  );

  // Daily time series
  const clickDays = all(
    `SELECT substr(created_at, 1, 10) d, COUNT(*) n FROM clicks WHERE created_at BETWEEN ? AND ? GROUP BY d`,
    [start, end],
  );
  const convDays = all(
    `SELECT substr(converted_at, 1, 10) d, currency, COUNT(*) n, SUM(commission) commission, SUM(sale_amount) sales
     FROM conversions WHERE converted_at BETWEEN ? AND ? AND status != 'rejected' GROUP BY d, currency`,
    [start, end],
  );
  const series = Object.fromEntries(days.map((d) => [d, { date: d, clicks: 0, conversions: 0, commission: 0, sales: 0 }]));
  for (const r of clickDays) if (series[r.d]) series[r.d].clicks = r.n;
  for (const r of convDays) {
    if (!series[r.d]) continue;
    series[r.d].conversions += r.n;
    series[r.d].commission += toBase(r.commission, r.currency);
    series[r.d].sales += toBase(r.sales, r.currency);
  }

  // Top stores
  const storeClicks = all(
    `SELECT store_id, COUNT(*) n FROM clicks WHERE created_at BETWEEN ? AND ? GROUP BY store_id`,
    [start, end],
  );
  const storeConv = all(
    `SELECT store_id, currency, COUNT(*) n, SUM(commission) commission, SUM(sale_amount) sales FROM conversions
     WHERE converted_at BETWEEN ? AND ? AND status != 'rejected' GROUP BY store_id, currency`,
    [start, end],
  );
  const storeNames = Object.fromEntries(all('SELECT id, name FROM stores').map((s) => [s.id, s.name]));
  const stores = {};
  const storeRow = (id) =>
    (stores[id] ??= { store_id: id, name: storeNames[id] || 'Unknown / deleted', clicks: 0, conversions: 0, commission: 0, sales: 0 });
  for (const r of storeClicks) storeRow(r.store_id).clicks += r.n;
  for (const r of storeConv) {
    const s = storeRow(r.store_id);
    s.conversions += r.n;
    s.commission += toBase(r.commission, r.currency);
    s.sales += toBase(r.sales, r.currency);
  }

  // Top clicked items
  const topItems = all(
    `SELECT c.item_type, c.item_id, COUNT(*) clicks,
       COALESCE(p.title, cp.title, s.name) AS title, st.name AS store_name
     FROM clicks c
     LEFT JOIN products p ON c.item_type = 'product' AND p.id = c.item_id
     LEFT JOIN coupons cp ON c.item_type = 'coupon' AND cp.id = c.item_id
     LEFT JOIN stores s ON c.item_type = 'store' AND s.id = c.item_id
     LEFT JOIN stores st ON st.id = c.store_id
     WHERE c.created_at BETWEEN ? AND ?
     GROUP BY c.item_type, c.item_id ORDER BY clicks DESC LIMIT 10`,
    [start, end],
  );

  // By country
  const countryClicks = all(
    `SELECT COALESCE(country, '—') country, COUNT(*) n FROM clicks WHERE created_at BETWEEN ? AND ? GROUP BY 1`,
    [start, end],
  );
  const countryConv = all(
    `SELECT COALESCE(country, '—') country, currency, COUNT(*) n, SUM(commission) commission FROM conversions
     WHERE converted_at BETWEEN ? AND ? AND status != 'rejected' GROUP BY 1, currency`,
    [start, end],
  );
  const countries = {};
  const cRow = (c) => (countries[c] ??= { country: c, clicks: 0, conversions: 0, commission: 0 });
  for (const r of countryClicks) cRow(r.country).clicks += r.n;
  for (const r of countryConv) {
    const c = cRow(r.country);
    c.conversions += r.n;
    c.commission += toBase(r.commission, r.currency);
  }

  const roundRow = (r) => ({ ...r, commission: round(r.commission), sales: r.sales == null ? undefined : round(r.sales) });

  return {
    range: { from, to },
    currency: base,
    kpis: {
      clicks: clicksTotal,
      conversions,
      sales: round(sales),
      commission: round(commission),
      conversion_rate: clicksTotal ? round((conversions / clicksTotal) * 100) : 0,
      epc: clicksTotal ? round(commission / clicksTotal) : 0,
      pending: round(byStatus.pending),
      approved: round(byStatus.approved),
      paid: round(byStatus.paid),
      rejected: round(byStatus.rejected),
    },
    previous: { ...previous, sales: round(previous.sales), commission: round(previous.commission) },
    status_counts: countByStatus,
    series: Object.values(series).map(roundRow),
    top_stores: Object.values(stores)
      .map(roundRow)
      .sort((a, b) => b.commission - a.commission || b.clicks - a.clicks)
      .slice(0, 10),
    top_items: topItems,
    countries: Object.values(countries).map(roundRow).sort((a, b) => b.clicks - a.clicks),
    catalog: {
      stores: get('SELECT COUNT(*) n FROM stores WHERE is_active = 1').n,
      products: get('SELECT COUNT(*) n FROM products WHERE is_active = 1').n,
      coupons: get(
        "SELECT COUNT(*) n FROM coupons WHERE is_active = 1 AND (expires_at IS NULL OR expires_at = '' OR expires_at >= date('now'))",
      ).n,
      subscribers: get('SELECT COUNT(*) n FROM subscribers').n,
      expiring_soon: get(
        "SELECT COUNT(*) n FROM coupons WHERE is_active = 1 AND expires_at BETWEEN date('now') AND date('now', '+7 day')",
      ).n,
    },
  };
}
