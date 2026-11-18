'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Simple GDPR / UK-GDPR consent banner. The choice is stored in a cookie so analytics
// scripts you add later can check `cookie_consent=all` before loading.
export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!document.cookie.includes('cookie_consent='));
  }, []);

  function choose(value) {
    document.cookie = `cookie_consent=${value}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
    setShow(false);
  }

  if (!show) return null;
  return (
    <div className="cookie" role="dialog" aria-label="Cookie consent">
      <p>
        We use essential cookies to remember your country and, with your permission, analytics cookies to improve the site.
        Shops you visit through our links may set their own cookies to track affiliate referrals.{' '}
        <Link href="/privacy">Read more</Link>
      </p>
      <div className="cookie__actions">
        <button className="btn btn--ghost" onClick={() => choose('essential')}>Essential only</button>
        <button className="btn btn--primary" onClick={() => choose('all')}>Accept all</button>
      </div>
    </div>
  );
}
