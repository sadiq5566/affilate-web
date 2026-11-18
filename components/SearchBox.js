'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/** Header search with live suggestions (stores + coupons), debounced. Works as a normal form without JavaScript. */
export default function SearchBox({ region, className = 'header__search', placeholder = 'Search stores, coupons, deals…' }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      return undefined;
    }
    const controller = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/public/search?${new URLSearchParams({ q: term, country: region || '' })}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((json) => {
          setResults(json);
          setOpen(true);
        })
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q, region]);

  useEffect(() => {
    const onDoc = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const empty = results && !results.stores.length && !results.coupons.length;

  return (
    <form action="/search" className={className} role="search" ref={box} onSubmit={() => setOpen(false)}>
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results && setOpen(true)}
        placeholder={placeholder}
        aria-label="Search"
        autoComplete="off"
      />
      {open && results && (
        <div className="suggest" role="listbox">
          {empty && <p className="suggest__empty">No matches for “{q.trim()}”</p>}
          {results.stores.length > 0 && <p className="suggest__head">Stores</p>}
          {results.stores.map((s) => (
            <Link key={s.slug} href={`/stores/${s.slug}`} onClick={() => setOpen(false)} className="suggest__item">
              <strong>{s.name}</strong>
            </Link>
          ))}
          {results.coupons.length > 0 && <p className="suggest__head">Offers</p>}
          {results.coupons.map((c) => (
            <Link key={c.id} href={`/stores/${c.store_slug}`} onClick={() => setOpen(false)} className="suggest__item">
              <span>{c.title}</span>
              <span className="muted small">{c.store_name}</span>
            </Link>
          ))}
          <button type="button" className="suggest__all" onClick={() => { setOpen(false); router.push(`/search?q=${encodeURIComponent(q.trim())}`); }}>
            See all results for “{q.trim()}” →
          </button>
        </div>
      )}
    </form>
  );
}
