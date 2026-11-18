'use client';

import { useEffect, useState } from 'react';
import StoreLogo from './StoreLogo';
import { goUrl } from '@/lib/regions';
import { isToday } from '@/lib/format';

const DEFAULT_NOTE = 'Add your items to the basket, paste the code in the voucher / promo field at checkout and the discount is applied before you pay.';

/** The "Show code" pop-up. The real code is fetched from the reveal API, so it is never part of the page HTML. */
export default function CouponModal({ coupon, region, href, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/coupons/${coupon.id}/reveal`, { method: 'POST' })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Could not load the code');
        if (alive) setData(json);
      })
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [coupon.id]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  async function copy() {
    if (!data?.code) return false;
    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return true;
    } catch {
      return false; // clipboard blocked – the code is selectable on screen
    }
  }

  async function copyAndContinue() {
    await copy();
    window.open(goUrl('coupon', coupon.id, region, window.location.pathname), '_blank', 'noopener');
  }

  const checkedToday = isToday(data?.verified_at ?? coupon.verified_at);
  const usedToday = data?.today_uses ?? coupon.today_uses ?? 0;

  return (
    <div className="modal modal--sheet" role="dialog" aria-modal="true" aria-label="Your discount code" onClick={onClose}>
      <div className="modal__box" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose} aria-label="Close">×</button>
        <StoreLogo name={coupon.store_name} src={coupon.store_logo} size={64} />
        {checkedToday && <span className="tag tag--ok" suppressHydrationWarning>✓ Checked today</span>}
        <h3>{coupon.title}</h3>
        {usedToday >= 3 && <p className="small muted">{usedToday} shoppers opened this offer today</p>}

        <p className="small muted">YOUR CODE</p>
        <div className="code-box">
          {data ? <code>{data.code}</code> : error ? <code className="error small">{error}</code> : <code className="code-box__loading" aria-busy="true">••••••</code>}
          <button className="btn btn--primary" onClick={copy} disabled={!data}>{copied ? 'Copied ✓' : 'Copy code'}</button>
        </div>

        <div className="modal__buttons">
          <button className="btn btn--accent" onClick={copyAndContinue} disabled={!data}>Copy &amp; continue to shop →</button>
          <a className="btn btn--ghost" href={href} target="_blank" rel="sponsored nofollow noopener">Go to {coupon.store_name}</a>
        </div>

        <div className="modal__note">
          <strong>How to redeem</strong>
          <p>{data?.usage_note || coupon.usage_note || DEFAULT_NOTE}</p>
        </div>

        <ModalNewsletter region={region} />
      </div>
    </div>
  );
}

function ModalNewsletter({ region }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState('');
  const [state, setState] = useState({ status: 'idle', message: '' });

  async function submit(e) {
    e.preventDefault();
    setState({ status: 'loading', message: '' });
    try {
      const res = await fetch('/api/public/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent, country: region, website: trap }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Something went wrong');
      setState({ status: 'done', message: 'Thanks! You are subscribed.' });
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  }

  if (state.status === 'done') return <p className="small modal__news">{state.message}</p>;
  return (
    <form className="modal__news" onSubmit={submit}>
      <strong>Never miss a deal</strong>
      <input type="text" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
      <div className="modal__news-row">
        <input type="email" required placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
        <button className="btn btn--primary" disabled={state.status === 'loading'}>Subscribe</button>
      </div>
      <label className="small consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
        I agree to receive deal emails (privacy policy applies).
      </label>
      {state.status === 'error' && <p className="error small">{state.message}</p>}
    </form>
  );
}
