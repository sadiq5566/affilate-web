import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

fs.mkdirSync(path.join(config.dataDir, 'uploads'), { recursive: true });

export const db = new DatabaseSync(path.join(config.dataDir, 'app.db'));

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  description TEXT,
  affiliate_url TEXT,
  network TEXT,
  subid_param TEXT,
  commission_type TEXT DEFAULT 'percent',
  commission_value REAL,
  country TEXT DEFAULT 'ALL',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  is_featured INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  price REAL,
  old_price REAL,
  currency TEXT DEFAULT 'GBP',
  affiliate_url TEXT,
  country TEXT DEFAULT 'ALL',
  is_featured INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  code TEXT,
  discount_label TEXT,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  affiliate_url TEXT,
  country TEXT DEFAULT 'ALL',
  is_featured INTEGER DEFAULT 0,
  is_verified INTEGER DEFAULT 1,
  is_exclusive INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  starts_at TEXT,
  expires_at TEXT,
  uses INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY,
  click_id TEXT UNIQUE NOT NULL,
  item_type TEXT NOT NULL,
  item_id INTEGER,
  store_id INTEGER,
  country TEXT,
  page TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clicks_created ON clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_clicks_store ON clicks(store_id);

CREATE TABLE IF NOT EXISTS conversions (
  id INTEGER PRIMARY KEY,
  click_id TEXT,
  store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
  item_type TEXT,
  item_id INTEGER,
  country TEXT,
  order_ref TEXT,
  sale_amount REAL DEFAULT 0,
  commission REAL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending',
  network TEXT,
  source TEXT DEFAULT 'manual',
  note TEXT,
  converted_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_conv_date ON conversions(converted_at);
CREATE INDEX IF NOT EXISTS idx_conv_order ON conversions(order_ref);

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  country TEXT,
  consent INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// node:sqlite rejects undefined/booleans – normalise bound values.
function clean(v) {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}

function run(method, sql, params) {
  const stmt = db.prepare(sql);
  if (Array.isArray(params)) return stmt[method](...params.map(clean));
  const obj = {};
  for (const [k, v] of Object.entries(params)) obj[k] = clean(v);
  return stmt[method](obj);
}

export const all = (sql, params = []) => run('all', sql, params);
export const get = (sql, params = []) => run('get', sql, params);
export const exec = (sql, params = []) => run('run', sql, params);

export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function getSetting(key, fallback = null) {
  const row = get('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  exec(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value == null ? null : String(value)],
  );
}
