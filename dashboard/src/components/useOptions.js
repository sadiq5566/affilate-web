import { useEffect, useState } from 'react';
import { admin } from '../api.js';

let cache = null;

/** Stores / categories / regions for dropdowns. Call refreshOptions() after editing stores or categories. */
export function refreshOptions() {
  cache = admin('/options');
  return cache;
}

export function useOptions() {
  const [opts, setOpts] = useState({ stores: [], categories: [], regions: {}, statuses: [] });
  useEffect(() => {
    let alive = true;
    (cache || refreshOptions()).then((o) => alive && setOpts(o)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return {
    ...opts,
    storeOptions: opts.stores.map((s) => ({ value: s.id, label: s.name })),
    categoryOptions: opts.categories.map((c) => ({ value: c.id, label: c.name })),
    regionOptions: [{ value: 'ALL', label: '🇪🇺 All regions' }, ...Object.entries(opts.regions).map(([k, r]) => ({ value: k, label: `${k} – ${r.name}` }))],
  };
}

export const CURRENCIES = [
  { value: 'EUR', label: 'EUR €' },
  { value: 'GBP', label: 'GBP £' },
  { value: 'USD', label: 'USD $' },
];
