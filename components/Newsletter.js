'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Newsletter({ region }) {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setState({ status: 'done', message: 'Thanks! You are subscribed to our best deals.' });
      setEmail('');
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  }

  return (
    <section className="newsletter">
      <div>
        <h2>Never miss a deal</h2>
        <p>Get the best verified codes in your inbox once a week. No spam, unsubscribe anytime.</p>
      </div>
      {state.status === 'done' ? (
        <p className="newsletter__done">{state.message}</p>
      ) : (
        <form onSubmit={submit} className="newsletter__form">
          <input type="text" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
          <div className="newsletter__row">
            <input type="email" required placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
            <button className="btn btn--accent" disabled={state.status === 'loading'}>
              {state.status === 'loading' ? 'Subscribing…' : 'Subscribe'}
            </button>
          </div>
          <label className="small consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
            I agree to receive deal emails and accept the <Link href="/privacy">privacy policy</Link>.
          </label>
          {state.status === 'error' && <p className="error small">{state.message}</p>}
        </form>
      )}
    </section>
  );
}
