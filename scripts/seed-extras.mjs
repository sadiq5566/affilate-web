/**
 * Adds demo content for the newer features to an existing database (safe to run more than once):
 * events (Black Friday…), German demo shops, sale / printable coupons, usage notes, "last checked" times and a store FAQ.
 *   node scripts/seed-extras.mjs
 * Everything here is fictional demo data. Delete it from the admin panel before going live.
 */
import './_env.mjs';
import { all, get, exec, transaction } from '../lib/server/db.js';
import { uniqueSlug } from '../lib/server/util.js';

const hoursAgo = (h) => new Date(Date.now() - h * 3600e3).toISOString().slice(0, 19).replace('T', ' ');
const inDays = (d) => new Date(Date.now() + d * 86400e3).toISOString().slice(0, 10);

transaction(() => {
  // ---- events
  const events = [
    ['Black Friday 2026', 'The biggest sales of the year: early deals and the best codes in one place.', inDays(-3), inDays(10)],
    ['Cyber Monday 2026', 'Online-only offers on tech, fashion and home.', inDays(10), inDays(11)],
    ['Christmas Sales', 'Gift ideas and festive discounts.', inDays(20), inDays(45)],
  ];
  const eventIds = [];
  for (const [name, description, starts_on, ends_on] of events) {
    const ex = get('SELECT id FROM events WHERE name = ?', [name]);
    if (ex) { eventIds.push(ex.id); continue; }
    const r = exec('INSERT INTO events (name, slug, description, starts_on, ends_on) VALUES (?, ?, ?, ?, ?)', [name, uniqueSlug('events', name), description, starts_on, ends_on]);
    eventIds.push(Number(r.lastInsertRowid));
  }

  // ---- German demo shops + offers
  const cat = (name) => get('SELECT id FROM categories WHERE name = ?', [name])?.id ?? null;
  const shops = [
    { name: 'Berliner Mode', cat: 'Fashion', network: 'Awin', coupons: [
      ['20% Rabatt auf die neue Kollektion', 'code', 'BERLIN20', '20%', 'Gültig auf alle Artikel ab 50 €.'],
      ['Gratis Versand ab 40 €', 'sale', null, 'GRATIS VERSAND', 'Kein Code nötig.'],
    ] },
    { name: 'TechHaus', cat: 'Electronics', network: 'CJ', coupons: [
      ['10 € Rabatt auf Ihre erste Bestellung', 'code', 'HAUS10', '10 €', 'Mindestbestellwert 60 €.'],
      ['Gutschein zum Ausdrucken: 5 % im Laden', 'print', null, '5%', 'Ausdrucken und an der Kasse vorzeigen.'],
    ] },
  ];
  for (const sh of shops) {
    let store = get('SELECT id FROM stores WHERE name = ?', [sh.name]);
    if (!store) {
      const r = exec(
        `INSERT INTO stores (name, slug, description, affiliate_url, network, subid_param, commission_type, commission_value, country, category_id, is_featured)
         VALUES (?, ?, ?, ?, ?, ?, 'percent', 6, 'DE', ?, 1)`,
        [sh.name, uniqueSlug('stores', sh.name), `${sh.name} – Demo-Shop für Deutschland (fiktiv).`, `https://example.com/${encodeURIComponent(sh.name)}`, sh.network, sh.network === 'Awin' ? 'clickref' : 'sid', cat(sh.cat)],
      );
      store = { id: Number(r.lastInsertRowid) };
    }
    for (const [title, kind, code, label, note] of sh.coupons) {
      if (get('SELECT id FROM coupons WHERE title = ? AND store_id = ?', [title, store.id])) continue;
      exec(
        `INSERT INTO coupons (title, description, code, kind, discount_label, store_id, category_id, country, is_verified, verified_at, expires_at, usage_note, event_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'DE', 1, ?, ?, ?, ?)`,
        [title, note, code, kind, label, store.id, cat(sh.cat), hoursAgo(3), inDays(30), code ? 'Code im Warenkorb im Feld „Gutscheincode“ eingeben.' : null, eventIds[0]],
      );
    }
  }

  // ---- upgrade a few existing demo coupons so every type / badge is visible
  const live = all("SELECT id, code FROM coupons WHERE country != 'DE' ORDER BY id");
  live.forEach((c, i) => {
    if (i % 3 === 0) exec('UPDATE coupons SET event_id = ? WHERE id = ?', [eventIds[0], c.id]);
    if (i % 2 === 0 && c.code) exec("UPDATE coupons SET verified_at = ?, usage_note = 'Paste the code in the promo box in your basket before you pay.' WHERE id = ? AND verified_at IS NULL", [hoursAgo(1 + (i % 20)), c.id]);
    if (i === 4 && !c.code) exec("UPDATE coupons SET kind = 'print' WHERE id = ?", [c.id]);
  });

  // ---- one fully filled store (trust box + FAQ). Rating stays empty on purpose: only real reviews belong there.
  exec(
    `UPDATE stores SET editor_name = COALESCE(editor_name, 'Demo Editor'), last_checked_at = COALESCE(last_checked_at, ?),
       faq = COALESCE(faq, ?) WHERE name = 'TechNova'`,
    [hoursAgo(5), 'Does TechNova ship across the UK? | Yes, standard delivery is available UK-wide (demo text).\nCan I combine two codes? | Usually only one code can be used per order.'],
  );
});

console.log('Demo extras added: events, DE shops, sale/printable coupons, usage notes, store FAQ.');
