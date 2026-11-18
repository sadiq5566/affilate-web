import Link from 'next/link';
import { api } from '@/lib/server';
import { dateRange } from '@/lib/format';
import Cover from '@/components/Cover';
import { eventEmoji } from '@/lib/art';

export const metadata = {
  title: 'Shopping events & seasonal sales',
  description: 'Black Friday, Cyber Monday and other shopping events: all the best codes in one place.',
  alternates: { canonical: '/events' },
};

export default async function EventsPage() {
  const events = await api('/events');
  return (
    <div className="container page">
      <h1>Shopping events</h1>
      <p className="lead">Seasonal sales with the best codes, collected in one place.</p>
      {events.length === 0 ? (
        <p className="empty">No events are running right now – check back soon.</p>
      ) : (
        <div className="cat-grid">
          {events.map((e) => (
            <Link key={e.id} href={`/events/${e.slug}`} className="cat-card event-card">
              <Cover src={e.image_url} seed={e.slug} emoji={eventEmoji(e.name)} />
              <strong>{e.name}</strong>
              <span className="muted small">{dateRange(e.starts_on, e.ends_on) || 'Dates to be announced'}</span>
              <span className="muted small">{e.coupon_count} {e.coupon_count === 1 ? 'offer' : 'offers'}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
