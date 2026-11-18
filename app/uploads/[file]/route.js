import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { config } from '@/lib/server/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif',
};

// Serves images uploaded from the admin panel (stored in data/uploads).
export async function GET(_request, { params }) {
  const { file } = await params;
  const name = path.basename(file);
  const type = TYPES[path.extname(name).toLowerCase()];
  const full = path.join(config.dataDir, 'uploads', name);
  if (!type || name !== file || !fs.existsSync(full)) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(fs.readFileSync(full), {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=2592000, immutable',
      // Uploaded SVGs must never run scripts.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
