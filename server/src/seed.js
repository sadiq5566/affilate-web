/**
 * Seeds the database with demo categories, stores, coupons and products.
 *   node src/seed.js          → catalog only
 *   node src/seed.js --demo   → catalog + 60 days of fake clicks/conversions (to see the dashboard)
 *   add --force to wipe existing catalog/analytics first
 */
import crypto from 'node:crypto';
import { db, all, get, exec, transaction, getSetting, setSetting } from './db.js';
import { ensureAdminUser } from './auth.js';
import { uniqueSlug } from './util.js';

const args = process.argv.slice(2);
const DEMO = args.includes('--demo');
const FORCE = args.includes('--force');

ensureAdminUser();

const defaults = {
  site_name: 'DealHaven',
  site_tagline: 'Verified discount codes & deals across the UK, France and Italy',
  contact_email: 'hello@example.com',
  default_region: 'UK',
  base_currency: 'EUR',
  fx_rates: JSON.stringify({ GBP: 1.17, USD: 0.92 }),
};
for (const [k, v] of Object.entries(defaults)) if (getSetting(k) == null) setSetting(k, v);

const existing = get('SELECT COUNT(*) n FROM stores').n;
if (existing && !FORCE) {
  console.log(`Database already has ${existing} stores – skipping seed. Use --force to wipe and re-seed.`);
  process.exit(0);
}

if (FORCE) {
  db.exec('DELETE FROM conversions; DELETE FROM clicks; DELETE FROM coupons; DELETE FROM products; DELETE FROM stores; DELETE FROM categories;');
}

const categories = [
  ['Fashion', '👗'], ['Electronics', '💻'], ['Home & Garden', '🏡'], ['Beauty', '💄'],
  ['Travel', '✈️'], ['Food & Drink', '🍕'], ['Sports & Fitness', '🏃'], ['Kids & Toys', '🧸'],
];

// Fictional demo merchants – replace with your real affiliate programmes from the dashboard.
const stores = [
  { name: 'TechNova', cat: 'Electronics', country: 'UK', network: 'Awin', rate: 4, cur: 'GBP', desc: 'Laptops, phones, audio and smart home gear at UK prices.' },
  { name: 'Northbrook Fashion', cat: 'Fashion', country: 'UK', network: 'Awin', rate: 8, cur: 'GBP', desc: 'British high-street fashion for men and women.' },
  { name: 'Hearth & Home', cat: 'Home & Garden', country: 'UK', network: 'CJ', rate: 6, cur: 'GBP', desc: 'Furniture, bedding and garden essentials delivered UK-wide.' },
  { name: 'GlowLab Beauty', cat: 'Beauty', country: 'UK', network: 'Impact', rate: 10, cur: 'GBP', desc: 'Skincare, make-up and fragrance from top brands.' },
  { name: 'Maison Belle', cat: 'Fashion', country: 'FR', network: 'Awin', rate: 7, cur: 'EUR', desc: 'Parisian ready-to-wear and accessories.' },
  { name: 'Voyage Azur', cat: 'Travel', country: 'FR', network: 'Tradedoubler', rate: 12, type: 'fixed', cur: 'EUR', desc: 'Holiday packages and hotel deals across the Mediterranean.' },
  { name: 'Le Panier Gourmet', cat: 'Food & Drink', country: 'FR', network: 'Awin', rate: 5, cur: 'EUR', desc: 'French delicacies, wine and gift hampers.' },
  { name: 'ModaRoma', cat: 'Fashion', country: 'IT', network: 'Awin', rate: 9, cur: 'EUR', desc: 'Italian designer fashion, shoes and leather goods.' },
  { name: 'Casa Bella Italia', cat: 'Home & Garden', country: 'IT', network: 'Rakuten', rate: 6, cur: 'EUR', desc: 'Italian kitchenware, décor and outdoor living.' },
  { name: 'Sport Vivo', cat: 'Sports & Fitness', country: 'IT', network: 'Awin', rate: 7, cur: 'EUR', desc: 'Running, cycling and gym equipment.' },
  { name: 'KidsWorld Toys', cat: 'Kids & Toys', country: 'ALL', network: 'CJ', rate: 5, cur: 'EUR', desc: 'Toys, games and learning kits shipped across Europe.' },
  { name: 'FitPeak', cat: 'Sports & Fitness', country: 'ALL', network: 'Impact', rate: 8, cur: 'EUR', desc: 'Activewear and supplements with EU-wide delivery.' },
];

const SUBID = { Awin: 'clickref', CJ: 'sid', Impact: 'subId1', Rakuten: 'u1', Tradedoubler: 'epi' };

const productNames = {
  Electronics: ['Wireless Noise-Cancelling Headphones', '14" Ultrabook Laptop 16GB', 'Smart Watch Series 5', '4K Streaming Stick'],
  Fashion: ['Wool Blend Overcoat', 'Leather Chelsea Boots', 'Slim Fit Denim Jeans', 'Silk Scarf Collection'],
  'Home & Garden': ['Memory Foam Pillow Set', 'Cast Iron Casserole Dish', 'Rattan Garden Lounge Set', 'Linen Duvet Cover'],
  Beauty: ['Vitamin C Serum 30ml', 'Hydrating Night Cream', 'Eau de Parfum 50ml', 'Pro Make-up Brush Kit'],
  Travel: ['3 Nights in Nice – Hotel + Flight', 'Weekend in Marseille', '7-Day Corsica Escape', 'City Break Lyon'],
  'Food & Drink': ['Bordeaux Wine Trio', 'Christmas Gourmet Hamper', 'Artisan Cheese Box', 'Macaron Gift Tin'],
  'Sports & Fitness': ['Carbon Running Shoes', 'Adjustable Dumbbell Set', 'Yoga Mat Pro 6mm', 'Road Bike Helmet'],
  'Kids & Toys': ['STEM Robot Building Kit', 'Wooden Train Set', 'Family Board Game Bundle', 'Plush Bear XL'],
};

const couponTemplates = [
  { t: '{p}% off your first order', code: 'WELCOME{p}', label: '{p}% OFF', feat: 1 },
  { t: 'Free delivery on orders over {c}50', code: null, label: 'FREE DELIVERY' },
  { t: 'Extra {p}% off sale items', code: 'SALE{p}', label: '{p}% OFF', excl: 1 },
  { t: 'Up to 50% off in the seasonal sale', code: null, label: 'UP TO 50%', feat: 1 },
  { t: '{c}10 off when you spend {c}75', code: 'SAVE10', label: '{c}10 OFF' },
];

const today = new Date();
const dateOffset = (days) => {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

transaction(() => {
  const catIds = {};
  categories.forEach(([name, icon], i) => {
    const r = exec('INSERT INTO categories (name, slug, icon, sort_order) VALUES (?, ?, ?, ?)', [name, uniqueSlug('categories', name), icon, i]);
    catIds[name] = Number(r.lastInsertRowid);
  });

  for (const [si, s] of stores.entries()) {
    const slug = uniqueSlug('stores', s.name);
    const site = `https://example.com/${slug}`;
    const r = exec(
      `INSERT INTO stores (name, slug, website_url, description, affiliate_url, network, subid_param, commission_type,
        commission_value, country, category_id, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.name, slug, site, s.desc, `${site}?utm_source=affiliate&aff_id=DEMO`, s.network, SUBID[s.network],
        s.type || 'percent', s.rate, s.country, catIds[s.cat], si % 2 === 0 ? 1 : 0],
    );
    const storeId = Number(r.lastInsertRowid);
    const sym = s.cur === 'GBP' ? '£' : '€';

    couponTemplates.forEach((tpl, i) => {
      const p = pick([10, 15, 20, 25]);
      const fill = (str) => str?.replaceAll('{p}', p).replaceAll('{c}', sym);
      exec(
        `INSERT INTO coupons (title, description, code, discount_label, store_id, category_id, country, is_featured,
          is_exclusive, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [fill(tpl.t), `Valid on selected ${s.cat.toLowerCase()} items at ${s.name}. Cannot be combined with other offers.`,
          fill(tpl.code), fill(tpl.label), storeId, catIds[s.cat], s.country, tpl.feat && si < 8 ? 1 : 0, tpl.excl || 0,
          i === 1 ? null : dateOffset(rand(3, 60))],
      );
    });

    productNames[s.cat].slice(0, 3).forEach((title, i) => {
      const price = rand(19, 399) + 0.99;
      const old = Math.random() > 0.25 ? Math.round(price * (1 + rand(15, 45) / 100)) + 0.99 : null;
      exec(
        `INSERT INTO products (title, slug, description, image_url, store_id, category_id, price, old_price, currency,
          country, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, uniqueSlug('products', `${s.name} ${title}`),
          `${title} from ${s.name}. Limited-time price – check the store for current stock and delivery options.`,
          `https://picsum.photos/seed/${slug}-${i}/640/480`, storeId, catIds[s.cat], price, old, s.cur, s.country, i === 0 ? 1 : 0],
      );
    });
  }
});

console.log(`Seeded ${stores.length} stores, ${categories.length} categories, coupons and products.`);

if (DEMO) {
  const items = [
    ...all('SELECT id, store_id, country, \'coupon\' AS type FROM coupons'),
    ...all('SELECT id, store_id, country, \'product\' AS type FROM products'),
  ];
  const storeMap = Object.fromEntries(all('SELECT * FROM stores').map((s) => [s.id, s]));
  const regions = ['UK', 'FR', 'IT'];
  let clicks = 0;
  let convs = 0;
  transaction(() => {
    for (let day = 59; day >= 0; day--) {
      const n = rand(25, 70) + Math.round((60 - day) * 0.8);
      for (let i = 0; i < n; i++) {
        const it = pick(items);
        const country = it.country === 'ALL' ? pick(regions) : it.country;
        const ts = `${dateOffset(-day)} ${String(rand(7, 23)).padStart(2, '0')}:${String(rand(0, 59)).padStart(2, '0')}:00`;
        const clickId = crypto.randomBytes(10).toString('hex');
        exec(
          'INSERT INTO clicks (click_id, item_type, item_id, store_id, country, page, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [clickId, it.type, it.id, it.store_id, country, '/', ts],
        );
        clicks++;
        if (Math.random() < 0.045) {
          const store = storeMap[it.store_id];
          const sale = rand(25, 320) + rand(0, 99) / 100;
          const commission = store.commission_type === 'fixed' ? store.commission_value : Math.round(sale * store.commission_value) / 100;
          const status = day > 35 ? pick(['paid', 'paid', 'approved', 'rejected']) : day > 14 ? pick(['approved', 'approved', 'pending', 'rejected']) : 'pending';
          exec(
            `INSERT INTO conversions (click_id, store_id, item_type, item_id, country, order_ref, sale_amount, commission, currency,
              status, network, source, converted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'postback', ?)`,
            [clickId, it.store_id, it.type, it.id, country, `ORD-${rand(100000, 999999)}`, sale, commission,
              country === 'UK' ? 'GBP' : 'EUR', status, store.network, ts],
          );
          convs++;
        }
      }
    }
  });
  console.log(`Demo analytics: ${clicks} clicks, ${convs} conversions over the last 60 days.`);
}
