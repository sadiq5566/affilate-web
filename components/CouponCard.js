'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import StoreLogo from './StoreLogo';
import CouponModal from './CouponModal';
import { goUrl } from '@/lib/regions';
import { checkedAgo, expiryText, isEndingSoon } from '@/lib/format';

const KIND_LABEL = { code: 'Code', sale: 'Sale', print: 'Printable' };

/**
 * One coupon. Three kinds:
 *  code  – "Show code": shop opens in a new tab, this tab shows the code pop-up (code is fetched from the reveal API)
 *  sale  – plain link to the offer, no code
 *  print – plain link to the printable offer
 */
export default function CouponCard({ coupon, region, showStore = true, autoOpen = false }) {
  const [open, setOpen] = useState(false);
  const originalPath = useRef('');
  const kind = coupon.type === 'print' ? 'print' : coupon.has_code ? 'code' : 'sale';
  const href = goUrl('coupon', coupon.id, region);
  const popular = coupon.today_uses >= 5; // only shown when it is true
  const modalPath = `/stores/${coupon.store_slug}/${coupon.id}`;

  function show({ fromClick }) {
    originalPath.current = fromClick ? window.location.pathname + window.location.search : `/stores/${coupon.store_slug}`;
    if (fromClick) window.history.pushState({ coupon: coupon.id }, '', modalPath); // shareable URL
    setOpen(true);
  }

  function close() {
    setOpen(false);
    // Put the address bar back where the visitor started.
    if (window.location.pathname === modalPath) window.history.replaceState(null, '', originalPath.current || `/stores/${coupon.store_slug}`);
  }

  function reveal(e) {
    if (kind !== 'code') return; // plain link for sale / printable offers
    e.preventDefault();
    window.open(goUrl('coupon', coupon.id, region, window.location.pathname), '_blank', 'noopener');
    show({ fromClick: true });
  }

  // Opened from the shareable coupon URL.
  useEffect(() => {
    if (autoOpen && kind === 'code') show({ fromClick: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser back button closes the pop-up.
  useEffect(() => {
    if (!open) return;
    const onPop = () => setOpen(false);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [open]);

  const checked = coupon.verified_at ? checkedAgo(coupon.verified_at) : '';

  return (
    <article className={`coupon coupon--${kind} ${popular ? 'coupon--hot' : ''}`} id={`coupon-${coupon.id}`}>
      <div className="coupon__badge">
        <span className="coupon__value">{coupon.discount_label || (kind === 'code' ? 'CODE' : kind === 'print' ? 'PRINT' : 'SALE')}</span>
        <span className="coupon__kind">{KIND_LABEL[kind]}</span>
      </div>
      <div className="coupon__body">
        {showStore && (
          <Link href={`/stores/${coupon.store_slug}`} className="coupon__store">
            <StoreLogo name={coupon.store_name} src={coupon.store_logo} size={22} />
            {coupon.store_name}
          </Link>
        )}
        <h3 className="coupon__title">{coupon.title}</h3>
        <div className="coupon__meta">
          {coupon.is_verified ? <span className="tag tag--ok">✓ Verified</span> : null}
          {coupon.is_exclusive ? <span className="tag tag--accent">Exclusive</span> : null}
          {checked && <span className="muted" suppressHydrationWarning>{checked}</span>}
          <span className={isEndingSoon(coupon.expires_at) ? 'muted urgent' : 'muted'} suppressHydrationWarning>{expiryText(coupon.expires_at)}</span>
          {coupon.uses > 0 && <span className="muted">· used {coupon.uses}×</span>}
        </div>
        {coupon.description && (
          <details className="coupon__terms">
            <summary>More information</summary>
            <p>{coupon.description}</p>
          </details>
        )}
      </div>
      <div className="coupon__action">
        <a
          href={href}
          target="_blank"
          rel="sponsored nofollow noopener"
          onClick={reveal}
          className={kind === 'code' ? 'btn btn--code' : 'btn btn--primary'}
        >
          {kind === 'code' ? (
            <>
              <span>Show code</span>
              <span className="btn--code__peek" aria-hidden="true">{coupon.code_peek}</span>
            </>
          ) : kind === 'print' ? (
            'View printable offer'
          ) : (
            'Go to deal'
          )}
        </a>
        {popular && <span className="hot">🔥 Popular today</span>}
      </div>

      {open && <CouponModal coupon={coupon} region={region} href={href} onClose={close} />}
    </article>
  );
}
