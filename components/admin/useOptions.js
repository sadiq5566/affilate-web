import { useEffect, useState } from 'react';
import { admin } from './api.js';

let cache = null;

/** Stores / categories / regions for dropdowns. Call refreshOptions() after editing stores or categories. */
export function refreshOptions() {
  cache = admin('/options');
  return cache;
}

export function useOptions() {
  const [opts, setOpts] = useState({ stores: [], categories: [], events: [], regions: {}, statuses: [] });
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
    eventOptions: (opts.events || []).map((e) => ({ value: e.id, label: e.name })),
    regionOptions: [{ value: 'ALL', label: '🇪🇺 All regions' }, ...Object.entries(opts.regions).map(([k, r]) => ({ value: k, label: `${k} – ${r.name}` }))],
  };
}

export const CURRENCIES = [
  { value: 'EUR', label: 'EUR €' },
  { value: 'GBP', label: 'GBP £' },
  { value: 'USD', label: 'USD $' },
];

export const YES_NO = [{ value: 1, label: 'Yes' }, { value: 0, label: 'No' }];
export const ACTIVE_OPTIONS = [{ value: 1, label: 'Active' }, { value: 0, label: 'Hidden' }];
export const HAS = [{ value: 1, label: 'Has' }, { value: 0, label: 'Missing' }];
export const sortOptions = (...pairs) => pairs.map(([value, label]) => ({ value, label }));
