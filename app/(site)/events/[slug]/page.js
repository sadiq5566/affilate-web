import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, getRegion, SITE_URL } from '@/lib/server';
import { dateRange } from '@/lib/format';
import { CouponList } from '@/components/Grids';
import JsonLd from '@/components/JsonLd';
import Cover from '@/components/Cover';
import { eventEmoji } from '@/lib/art';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await api(`/events/${slug}`);
  if (!data) return { title: 'Event not found' };
  return {
    title: `${data.event.name} – codes & deals`,
    description: data.event.description || `All ${data.event.name} offers in one place.`,
    alternates: { canonical: `/events/${slug}` },
  };
}

export default async function EventPage({ params }) {
  const { slug } = await params;
  const region = await getRegion();
  const data = await api(`/events/${slug}`, { country: region });
  if (!data) notFound();
  const { event, coupons, others } = data;
  return (
    <div className="container page">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Events', item: `${SITE_URL}/events` },
            { '@type': 'ListItem', position: 3, name: event.name, item: `${SITE_URL}/events/${slug}` },
          ],
        }}
      />
      <nav className="crumbs small"><Link href="/">Home</Link> / <Link href="/events">Events</Link> / {event.name}</nav>
      <header className="banner">
        <Cover src={event.image_url} seed={event.slug} emoji={eventEmoji(event.name)} loading="eager" />
        <div className="banner__text">
          <span className="banner__chip">🎉 Shopping event</span>
          <h1>{event.name}</h1>
          {dateRange(event.starts_on, event.ends_on) && <p>📅 {dateRange(event.starts_on, event.ends_on)}</p>}
          {event.description && <p>{event.description}</p>}
        </div>
      </header>
      <CouponList coupons={coupons} region={region} empty="No offers for this event yet – check back soon." />
      {others.length > 0 && (
        <section className="section">
          <h2>More shopping events</h2>
          <div className="chips chips--dark">
            {others.map((e) => <Link key={e.id} href={`/events/${e.slug}`} className="chip">{e.name}</Link>)}
          </div>
        </section>
      )}
    </div>
  );
}
