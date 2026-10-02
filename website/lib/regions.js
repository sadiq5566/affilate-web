export const REGIONS = {
  UK: { name: 'United Kingdom', short: 'UK', flag: '🇬🇧', currency: 'GBP' },
  FR: { name: 'France', short: 'FR', flag: '🇫🇷', currency: 'EUR' },
  IT: { name: 'Italy', short: 'IT', flag: '🇮🇹', currency: 'EUR' },
};

export function goUrl(type, id, region, page) {
  const params = new URLSearchParams();
  if (region) params.set('country', region);
  if (page) params.set('page', page);
  return `/go/${type}/${id}?${params}`;
}
