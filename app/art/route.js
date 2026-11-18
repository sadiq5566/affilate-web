import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Generated cover art: /art?s=<seed>&e=<emoji>  ->  colourful SVG (same seed = same picture).
// Used whenever an article, event, category or product has no uploaded image.
const PALETTES = [
  ['#7c3aed', '#ec4899', '#fbbf24'], // violet → pink
  ['#f97316', '#ef4444', '#fde047'], // orange → red
  ['#0ea5e9', '#6366f1', '#a5f3fc'], // sky → indigo
  ['#10b981', '#06b6d4', '#fef08a'], // emerald → cyan
  ['#d946ef', '#7c3aed', '#fbcfe8'], // fuchsia → violet
  ['#f43f5e', '#f59e0b', '#fff1f2'], // rose → amber
  ['#2563eb', '#0891b2', '#bfdbfe'], // blue → teal
  ['#84cc16', '#16a34a', '#ecfccb'], // lime → green
];

function hash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

const esc = (s) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]);

function rand(seedNum, i) {
  const x = Math.sin(seedNum * 9301 + i * 49297) * 233280;
  return x - Math.floor(x);
}

export function GET(request) {
  const q = request.nextUrl.searchParams;
  const seed = (q.get('s') || 'x').slice(0, 80);
  // Only a short run of characters is accepted as the emoji, and it is XML-escaped.
  const emoji = esc(Array.from(q.get('e') || '✨').slice(0, 4).join(''));
  const h = hash(seed);
  const [c1, c2, c3] = PALETTES[h % PALETTES.length];
  const angle = 20 + (h % 50);

  const W = 1200;
  const H = 675;
  const blobs = Array.from({ length: 4 }, (_, i) => {
    const cx = Math.round(rand(h, i) * W);
    const cy = Math.round(rand(h, i + 9) * H);
    const r = 120 + Math.round(rand(h, i + 4) * 220);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" opacity="${(0.07 + rand(h, i + 2) * 0.1).toFixed(2)}"/>`;
  }).join('');
  const sparkles = Array.from({ length: 9 }, (_, i) => {
    const x = Math.round(rand(h, i + 20) * W);
    const y = Math.round(rand(h, i + 30) * H);
    const s = 8 + Math.round(rand(h, i + 40) * 16);
    return `<path d="M${x} ${y - s}L${x + s * 0.3} ${y - s * 0.3}L${x + s} ${y}L${x + s * 0.3} ${y + s * 0.3}L${x} ${y + s}L${x - s * 0.3} ${y + s * 0.3}L${x - s} ${y}L${x - s * 0.3} ${y - s * 0.3}Z" fill="${c3}" opacity="0.85"/>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="g" gradientTransform="rotate(${angle})"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
<pattern id="p" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="36" height="36" fill="none"/><rect width="3" height="36" fill="#fff" opacity="0.06"/></pattern>
<radialGradient id="glow"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>
<rect width="${W}" height="${H}" fill="url(#p)"/>
${blobs}
<circle cx="${W / 2}" cy="${H / 2}" r="290" fill="url(#glow)"/>
<rect x="${W / 2 - 190}" y="${H / 2 - 190}" width="380" height="380" rx="96" fill="#fff" opacity="0.2" transform="rotate(${(h % 14) - 7} ${W / 2} ${H / 2})"/>
${sparkles}
<text x="${W / 2}" y="${H / 2 + 100}" font-size="300" text-anchor="middle" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${emoji}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
