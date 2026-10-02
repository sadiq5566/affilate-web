import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { config } from './config.js';
import { get, getSetting } from './db.js';
import { ensureAdminUser, signToken, verifyPassword } from './auth.js';
import { handleOutboundClick, recordConversion } from './tracking.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';

ensureAdminUser();

const app = express();
app.set('trust proxy', true);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.corsOrigins, credentials: false }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.json({ ok: true }));

// Uploaded images
app.use('/uploads', express.static(path.join(config.dataDir, 'uploads'), { maxAge: '30d' }));

// Outbound affiliate redirect + click tracking: /go/coupon/12, /go/product/5, /go/store/3
app.get('/go/:type/:id', handleOutboundClick);

// Public website API
app.use('/api/public', publicRoutes);

// Affiliate network postback (S2S) – records sales / leads automatically.
// Configure the URL from Dashboard → Settings in your network (Awin, CJ, Impact, Rakuten, Tradedoubler...).
app.all('/api/postback', (req, res) => {
  const p = { ...req.query, ...(req.body || {}) };
  if (!p.token || p.token !== getSetting('postback_token')) return res.status(403).json({ error: 'Invalid token' });
  const result = recordConversion({ ...p, source: 'postback' });
  res.json({ ok: true, ...result });
});

// Admin auth
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
app.post('/api/auth/login', loginLimiter, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const user = get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !verifyPassword(String(req.body?.password || ''), user.password_hash)) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  res.json({ token: signToken(user), user: { id: user.id, email: user.email, name: user.name } });
});

app.use('/api/admin', adminRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Server error';
  if (/UNIQUE constraint failed/.test(message)) [status, message] = [400, 'An item with the same unique value already exists'];
  else if (/FOREIGN KEY constraint failed/.test(message)) [status, message] = [400, 'Linked store/category does not exist'];
  else if (err.code === 'LIMIT_FILE_SIZE') [status, message] = [400, 'File is too large (max 5MB)'];
  if (status >= 500) {
    console.error(err);
    message = 'Server error';
  }
  res.status(status).json({ error: message });
});

app.listen(config.port, () => {
  console.log(`[api] running on http://localhost:${config.port}`);
});
