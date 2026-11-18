import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { get, exec, getSetting, setSetting } from './db.js';
import { HttpError } from './util.js';

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

/** Returns the logged-in admin for a Request (Bearer token) or throws a 401. */
export function authenticate(request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Not authenticated');
  let payload;
  try {
    payload = jwt.verify(token, jwtSecret());
  } catch {
    throw new HttpError(401, 'Session expired, please log in again');
  }
  const user = get('SELECT id, email, name FROM users WHERE id = ?', [payload.sub]);
  if (!user) throw new HttpError(401, 'User no longer exists');
  return user;
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
