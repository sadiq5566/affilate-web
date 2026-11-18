// `codes` is the keyword used in store page titles / H1 ("Zalando Rabattcode & Gutscheine – November 2026").
export const REGIONS = {
  UK: { name: 'United Kingdom', short: 'UK', flag: '🇬🇧', currency: 'GBP', locale: 'en-GB', codes: 'Discount Codes & Vouchers' },
  DE: { name: 'Germany', short: 'DE', flag: '🇩🇪', currency: 'EUR', locale: 'de-DE', codes: 'Rabattcode & Gutscheine' },
  FR: { name: 'France', short: 'FR', flag: '🇫🇷', currency: 'EUR', locale: 'fr-FR', codes: 'Codes Promo & Bons de réduction' },
  IT: { name: 'Italy', short: 'IT', flag: '🇮🇹', currency: 'EUR', locale: 'it-IT', codes: 'Codici Sconto & Coupon' },
};

export function goUrl(type, id, region, page) {
  const params = new URLSearchParams();
  if (region) params.set('country', region);
  if (page) params.set('page', page);
  return `/go/${type}/${id}?${params}`;
}
