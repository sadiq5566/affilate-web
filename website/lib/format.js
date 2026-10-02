export function money(amount, currency = 'EUR') {
  if (amount == null) return '';
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function expiryText(date) {
  if (!date) return 'No expiry date';
  const end = new Date(`${date}T23:59:59`);
  const days = Math.ceil((end - new Date()) / 86400000);
  if (days <= 0) return 'Ends today';
  if (days === 1) return 'Ends tomorrow';
  if (days <= 7) return `Ends in ${days} days`;
  return `Expires ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function isEndingSoon(date) {
  if (!date) return false;
  return (new Date(`${date}T23:59:59`) - new Date()) / 86400000 <= 3;
}
