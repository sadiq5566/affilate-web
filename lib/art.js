// Helpers for generated cover art (see app/art/route.js).
export const TAG_EMOJI = {
  Guides: '📘',
  'Saving tips': '💰',
  'Shopping safety': '🛡️',
  Seasonal: '🎁',
  Transparency: '🔍',
};

export const tagEmoji = (tag) => TAG_EMOJI[tag] || '📰';

export function eventEmoji(name = '') {
  const n = name.toLowerCase();
  if (n.includes('black')) return '🖤';
  if (n.includes('cyber')) return '💻';
  if (n.includes('christmas') || n.includes('weihnacht') || n.includes('noel') || n.includes('natale')) return '🎄';
  if (n.includes('single')) return '🛍️';
  if (n.includes('summer') || n.includes('sommer')) return '☀️';
  if (n.includes('easter') || n.includes('ostern')) return '🐣';
  if (n.includes('valentin')) return '💝';
  if (n.includes('back to school')) return '🎒';
  return '🎉';
}

export const coverSrc = (seed, emoji = '✨') => `/art?${new URLSearchParams({ s: String(seed), e: emoji })}`;
