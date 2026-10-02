'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StoreLogo from './StoreLogo';
import { goUrl } from '@/lib/regions';
import { expiryText, isEndingSoon } from '@/lib/format';

export default function CouponCard({ coupon, region, showStore = true }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isCode = coupon.type === 'code';
  const href = goUrl('coupon', coupon.id, region);

  function reveal(e) {
    if (!isCode) return; // plain link for deals
    e.preventDefault();
    window.open(goUrl('coupon', coupon.id, region, window.location.pathname), '_blank', 'noopener');
    setOpen(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked – user can still select the code */
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <article className="coupon">
      <div className="coupon__badge">
        <span className="coupon__value">{coupon.discount_label || (isCode ? 'CODE' : 'DEAL')}</span>
        <span className="coupon__kind">{isCode ? 'Code' : 'Deal'}</span>
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
          <span className={isEndingSoon(coupon.expires_at) ? 'muted urgent' : 'muted'}>{expiryText(coupon.expires_at)}</span>
          {coupon.uses > 0 && <span className="muted">· {coupon.uses} used</span>}
        </div>
        {coupon.description && (
          <details className="coupon__terms">
            <summary>Terms</summary>
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
          className={isCode ? 'btn btn--code' : 'btn btn--primary'}
        >
          {isCode ? (
            <>
              <span>Get Code</span>
              <span className="btn--code__peek" aria-hidden="true">{coupon.code.slice(-3)}</span>
            </>
          ) : (
            'Get Deal'
          )}
        </a>
      </div>

      {open && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Your discount code" onClick={() => setOpen(false)}>
          <div className="modal__box" onClick={(e) => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setOpen(false)} aria-label="Close">×</button>
            <StoreLogo name={coupon.store_name} src={coupon.store_logo} size={64} />
            <h3>{coupon.title}</h3>
            <p className="muted">Copy this code and paste it at checkout on {coupon.store_name}.</p>
            <div className="code-box">
              <code>{coupon.code}</code>
              <button className="btn btn--primary" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
            </div>
            <a className="btn btn--ghost" href={href} target="_blank" rel="sponsored nofollow noopener">
              Go to {coupon.store_name} →
            </a>
            {coupon.description && <p className="small muted">{coupon.description}</p>}
          </div>
        </div>
      )}
    </article>
  );
}
