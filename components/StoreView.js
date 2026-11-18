import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, getRegion, monthYear, SITE_URL } from '@/lib/server';
import { goUrl, REGIONS } from '@/lib/regions';
import { formatDate } from '@/lib/format';
import StoreLogo from '@/components/StoreLogo';
import JsonLd from '@/components/JsonLd';
import Cover from '@/components/Cover';
import { CouponList, ProductGrid, StoreGrid } from '@/components/Grids';

const TABS = [['', 'All'], ['code', 'Codes'], ['sale', 'Sale'], ['print', 'Printable']];

/** Used when a store has no FAQ of its own. Generic but true for every store. */
const defaultFaq = (name) => [
  { q: `How do I use a ${name} discount code?`, a: `Click “Show code”, copy the code, add your items to the basket on ${name} and paste it into the voucher or promo field at checkout.` },
  { q: `Why does my ${name} code not work?`, a: 'Codes can expire, be limited to certain products, require a minimum order value or only work once per customer. Check the terms under “More information” and try another code.' },
  { q: `Do I pay extra when I use ${name} offers from this site?`, a: `No. Using our links costs you nothing. We may earn a small commission from ${name} when you buy, which keeps this site free.` },
];

export async function generateStoreMetadata(slug, { canonical = true } = {}) {
  const [data, region] = await Promise.all([api(`/stores/${slug}`), getRegion()]);
  if (!data) return { title: 'Store not found' };
  const { store } = data;
  const r = REGIONS[region];
  const title = store.seo_title || `${store.name} ${r.codes} – ${monthYear(r.locale)}`;
  return {
    title,
    description:
      store.seo_description ||
      `${store.coupon_count} verified ${store.name} offers for ${monthYear(r.locale)}. ${store.description || ''}`.trim(),
    alternates: canonical ? { canonical: `/stores/${slug}` } : undefined,
  };
}

function Stars({ value }) {
  const full = Math.round(value);
  return <span className="stars" aria-hidden="true">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>;
}

export default async function StoreView({ slug, type = '', couponId }) {
  const region = await getRegion();
  const data = await api(`/stores/${slug}`, { country: region });
  if (!data) notFound();
  const { store, products, related } = data;
  const r = REGIONS[region];
  const all = data.coupons;
  const counts = { '': all.length, code: 0, sale: 0, print: 0 };
  for (const c of all) counts[c.type] = (counts[c.type] || 0) + 1;
  const activeType = TABS.some(([v]) => v === type) ? type : '';
  const coupons = activeType ? all.filter((c) => c.type === activeType) : all;
  const faq = store.faq?.length ? store.faq : defaultFaq(store.name);
  const heading = `${store.name} ${r.codes} – ${monthYear(r.locale)}`;
  const hasRating = store.rating_avg > 0 && store.rating_count > 0;
  const longText = (store.description || '').length > 220;
  const tabHref = (v) => (v ? `/stores/${slug}?coupon_type=${v}` : `/stores/${slug}`);

  return (
    <div className="container page">
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: 'Stores', item: `${SITE_URL}/stores` },
              { '@type': 'ListItem', position: 3, name: store.name, item: `${SITE_URL}/stores/${slug}` },
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: heading,
            url: `${SITE_URL}/stores/${slug}`,
            about: {
              '@type': 'Store',
              name: store.name,
              url: store.website_url || undefined,
              // Only real, admin-entered ratings are ever published as structured data.
              ...(hasRating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: store.rating_avg, reviewCount: store.rating_count, bestRating: 5 } } : {}),
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          },
        ]}
      />
      <nav className="crumbs small"><Link href="/">Home</Link> / <Link href="/stores">Stores</Link> / {store.name}</nav>

      <div className="store-banner" aria-hidden="true">
        <Cover seed={store.slug} emoji="🏷️" loading="eager" />
      </div>
      <header className="store-head store-head--pro">
        <StoreLogo name={store.name} src={store.logo_url} size={96} />
        <div className="store-head__text">
          {hasRating && (
            <p className="store-rating">
              <Stars value={store.rating_avg} /> <strong>Ø {Number(store.rating_avg).toFixed(1)}</strong>
              <span className="muted"> ({store.rating_count} reviews)</span>
            </p>
          )}
          <h1>{heading}</h1>
          <p className="store-badges">
            {store.last_checked_at && <span className="tag tag--ok">✓ Manually checked</span>}
            <span className="tag">Update: {monthYear(r.locale)}</span>
          </p>
          {store.description && (
            longText ? (
              <details className="readmore">
                <summary>{store.description.slice(0, 200)}… <span className="link">Read more</span></summary>
                <p>{store.description}</p>
              </details>
            ) : (
              <p>{store.description}</p>
            )
          )}
          <p className="small muted">We may earn a commission on purchases made through our links – it costs you nothing. <Link href="/affiliate-disclosure">Details</Link></p>
        </div>
        <div className="store-head__cta">
          <a className="btn btn--accent" href="#offers">Best deal ↓</a>
          <a className="btn btn--primary" href={goUrl('store', store.id, region)} target="_blank" rel="sponsored nofollow noopener">
            Visit shop →
          </a>
        </div>
      </header>

      <ul className="statbar">
        <li><strong>{all.length}</strong> active offers</li>
        <li><strong>{counts.code}</strong> codes</li>
        {store.last_checked_at && <li>Last checked <strong>{formatDate(store.last_checked_at, r.locale)}</strong></li>}
        <li><strong>100%</strong> free to use</li>
      </ul>

      <div className="layout-2" id="offers">
        <div>
          <div className="tabs">
            {TABS.map(([v, label]) => (
              <Link key={v || 'all'} href={tabHref(v)} className={activeType === v ? 'active' : ''}>
                {label} ({counts[v] || 0})
              </Link>
            ))}
          </div>
          {all.length === 0 && REGIONS[store.country] && store.country !== region && (
            <p className="note">
              {store.name} offers are available for shoppers in {REGIONS[store.country].flag} {REGIONS[store.country].name}.
              Switch your country at the top of the page to see them.
            </p>
          )}
          <CouponList
            coupons={coupons}
            region={region}
            showStore={false}
            autoOpenId={couponId}
            empty={`No ${store.name} offers right now – check back soon.`}
          />

          {products.length > 0 && (
            <section className="section">
              <h2>{store.name} product deals</h2>
              <ProductGrid products={products} region={region} />
            </section>
          )}

          <section className="section faq">
            <h2>Frequently asked questions about {store.name}</h2>
            {faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </section>
        </div>

        <aside className="sidebar">
          <div className="card">
            <h3>About {store.name}</h3>
            <p className="small">{store.description || `Find the latest ${store.name} offers here.`}</p>
            {(store.editor_name || store.last_checked_at || store.success_rate != null || hasRating) && (
              <ul className="facts small">
                {store.editor_name && <li>✍️ Checked by <strong>{store.editor_name}</strong></li>}
                {store.last_checked_at && <li>🕒 Last checked: <strong>{formatDate(store.last_checked_at, r.locale)}</strong></li>}
                {store.success_rate != null && <li>✅ Success rate: <strong>{store.success_rate}%</strong></li>}
                {hasRating && <li>⭐ User rating: <strong>{Number(store.rating_avg).toFixed(1)}/5</strong> ({store.rating_count})</li>}
              </ul>
            )}
            <h4>How to use a {store.name} code</h4>
            <ol className="small">
              <li>Click “Show code” and copy the code.</li>
              <li>Add items to your basket on {store.name}.</li>
              <li>Paste the code in the promo box at checkout.</li>
            </ol>
          </div>
          {related.length > 0 && (
            <div className="card">
              <h3>Similar stores</h3>
              <StoreGrid stores={related} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
