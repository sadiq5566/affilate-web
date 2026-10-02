'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MobileNav({ items }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mobile-nav">
      <button className="mobile-nav__toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">
        {open ? '✕' : '☰'}
      </button>
      {open && (
        <div className="mobile-nav__panel" onClick={() => setOpen(false)}>
          <form action="/search" role="search">
            <input type="search" name="q" placeholder="Search…" aria-label="Search" />
          </form>
          {items.map(([href, label]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
