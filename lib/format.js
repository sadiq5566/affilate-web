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

const toDate = (ts) => {
  if (!ts) return null;
  const s = String(ts);
  // SQLite stores UTC as "YYYY-MM-DD HH:MM:SS"; plain dates are treated as local midday.
  const d = s.length <= 10 ? new Date(`${s}T12:00:00`) : new Date(`${s.replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "Checked 2h ago", "Checked today", "Checked 3 days ago". Returns '' when never checked. */
export function checkedAgo(ts) {
  const d = toDate(ts);
  if (!d) return '';
  const hours = (Date.now() - d.getTime()) / 3600000;
  if (hours < 1) return 'Checked just now';
  if (hours < 24 && String(ts).length > 10) return `Checked ${Math.floor(hours)}h ago`;
  const days = Math.floor(hours / 24);
  if (days <= 0) return 'Checked today';
  if (days === 1) return 'Checked yesterday';
  if (days < 60) return `Checked ${days} days ago`;
  return `Checked ${d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
}

export function isToday(ts) {
  const d = toDate(ts);
  return Boolean(d) && d.toDateString() === new Date().toDateString();
}

export function formatDate(ts, locale = 'en-GB') {
  const d = toDate(ts);
  return d ? d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

export function dateRange(from, to, locale = 'en-GB') {
  if (from && to) return `${formatDate(from, locale)} – ${formatDate(to, locale)}`;
  if (from) return `From ${formatDate(from, locale)}`;
  if (to) return `Until ${formatDate(to, locale)}`;
  return '';
}
