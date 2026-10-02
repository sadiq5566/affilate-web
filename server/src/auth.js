import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { get, exec, getSetting, setSetting } from './db.js';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// Use JWT_SECRET from env, otherwise generate one once and persist it in the DB.
function jwtSecret() {
  if (config.jwtSecret) return config.jwtSecret;
  let secret = getSetting('jwt_secret');
  if (!secret) {
    secret = crypto.randomBytes(48).toString('hex');
    setSetting('jwt_secret', secret);
  }
  return secret;
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, jwtSecret(), { expiresIn: '7d' });
}

export function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, jwtSecret());
    const user = get('SELECT id, email, name FROM users WHERE id = ?', [payload.sub]);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

export function ensureAdminUser() {
  const count = get('SELECT COUNT(*) AS n FROM users').n;
  if (count > 0) return;
  exec('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)', [
    config.adminEmail.toLowerCase(),
    hashPassword(config.adminPassword),
    'Admin',
  ]);
  console.log(`[auth] Created admin user ${config.adminEmail} (change the password from Dashboard → Settings)`);
}
