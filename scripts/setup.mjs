/**
 * One-command local setup:  npm run setup
 *  1. creates .env.local from .env.example (with a random JWT_SECRET) if it does not exist
 *  2. creates the local SQLite database (data/app.db) and its tables
 *  3. loads demo content: catalog, events, German demo shops, blog articles (skipped if already there)
 * Safe to run repeatedly: it never overwrites an existing .env.local and never wipes data.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env.local');

if (fs.existsSync(envFile)) {
  console.log('✓ .env.local already exists (left unchanged)');
} else {
  const example = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  const secret = crypto.randomBytes(32).toString('hex');
  const filled = example.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);
  fs.writeFileSync(envFile, filled);
  console.log('✓ Created .env.local with a random JWT_SECRET');
}

const flags = ['--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON'];
function run(script, args = []) {
  const res = spawnSync(process.execPath, [...flags, path.join(root, 'scripts', script), ...args], { stdio: 'inherit', cwd: root });
  if (res.status !== 0) {
    console.error(`✗ ${script} failed`);
    process.exit(res.status || 1);
  }
}

run('seed.mjs', ['--demo']); // creates data/app.db + tables; skips itself when stores already exist
run('seed-extras.mjs');
run('seed-articles.mjs');

console.log('\nAll set. Start the site with:  npm run dev');
console.log('Website   http://localhost:3000');
console.log('Admin     http://localhost:3000/admin   (login: see ADMIN_EMAIL / ADMIN_PASSWORD in .env.local)');
