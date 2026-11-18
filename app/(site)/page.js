import Link from 'next/link';
import { api, getRegion, getSettings } from '@/lib/server';
import { REGIONS } from '@/lib/regions';
import { dateRange } from '@/lib/format';
import { CouponList, ProductGrid, StoreGrid } from '@/components/Grids';
import Newsletter from '@/components/Newsletter';
import SearchBox from '@/components/SearchBox';
import ArticleCard from '@/components/ArticleCard';
import Cover from '@/components/Cover';
import { eventEmoji } from '@/lib/art';

export default async function HomePage() {
  const region = await getRegion();
  const [data, settings] = await Promise.all([api('/home', { country: region }), getSettings()]);
  const r = REGIONS[region];

  return (
    <>
      <section className="hero">
        <div className="hero__deco" aria-hidden="true">
          <span>🛍️</span><span>🎁</span><span>💸</span><span>🏷️</span><span>✨</span><span>🎟️</span>
        </div>
        <div className="container hero__inner">
          <p className="eyebrow">{r.flag} Deals for shoppers in {r.name}</p>
          <h1>All {r.codes.toLowerCase()} at a glance</h1>
          <p className="hero__sub">{settings.site_tagline}. Checked by hand, updated every day.</p>
          <SearchBox region={region} className="hero__search hero__search--live" placeholder="Search for a shop or brand, e.g. “TechNova” or “fashion”" />
          {data.stores.length > 0 && (
            <div className="chips">
              <span className="chips__label">Popular shops:</span>
              {data.stores.slice(0, 8).map((s) => (
                <Link key={s.id} href={`/stores/${s.slug}`} className="chip">{s.name}</Link>
              ))}
            </div>
          )}
          <p className="hero__disclosure">We may earn a commission on purchases made through our links – at no extra cost to you.</p>
        </div>
      </section>

      <div className="container">
        <section className="section">
          <div className="section__head">
            <h2><span className="h-icon">🔥</span> Top coupons today</h2>
            <Link href="/coupons">See all coupons →</Link>
          </div>
          <CouponList coupons={data.featured_coupons.length ? data.featured_coupons : data.latest_coupons.slice(0, 6)} region={region} />
        </section>

        {data.categories.length > 0 && (
          <section className="section">
            <div className="section__head">
              <h2><span className="h-icon h-icon--blue">🗂️</span> Top categories</h2>
              <Link href="/categories">All categories →</Link>
            </div>
            <div className="cat-grid cat-grid--cards">
              {data.categories.slice(0, 8).map((c) => (
                <Link key={c.id} href={`/categories/${c.slug}`} className="cat-card cat-card--img">
                  <Cover src={c.image_url} seed={c.slug} emoji={c.icon || '🛍️'} />
                  <strong>{c.name}</strong>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <div className="section__head">
            <h2><span className="h-icon h-icon--green">🏬</span> Popular stores</h2>
            <Link href="/stores">All stores →</Link>
          </div>
          <StoreGrid stores={data.stores} />
        </section>

        {data.events.length > 0 && (
          <section className="section">
            <div className="section__head">
              <h2><span className="h-icon h-icon--pink">🎉</span> Current shopping events</h2>
              <Link href="/events">All events →</Link>
            </div>
            <div className="cat-grid">
              {data.events.map((e) => (
                <Link key={e.id} href={`/events/${e.slug}`} className="cat-card event-card">
                  <Cover src={e.image_url} seed={e.slug} emoji={eventEmoji(e.name)} />
                  <strong>{e.name}</strong>
                  <span className="muted small">{dateRange(e.starts_on, e.ends_on) || 'Dates to be announced'}</span>
                  <span className="muted small">{e.coupon_count} {e.coupon_count === 1 ? 'offer' : 'offers'}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <div className="section__head">
            <h2><span className="h-icon h-icon--orange">⚡</span> Trending deals</h2>
            <Link href="/deals">All deals →</Link>
          </div>
          <ProductGrid products={data.featured_products} region={region} />
        </section>

        <section className="section">
          <div className="section__head">
            <h2><span className="h-icon h-icon--blue">🆕</span> Just added</h2>
            <Link href="/coupons?sort=newest">More →</Link>
          </div>
          <CouponList coupons={data.latest_coupons.slice(0, 6)} region={region} />
        </section>

        {data.articles.length > 0 && (
          <section className="section">
            <div className="section__head">
              <h2><span className="h-icon h-icon--green">📰</span> From the blog</h2>
              <Link href="/blog">All articles →</Link>
            </div>
            <div className="article-grid">
              {data.articles.map((a) => <ArticleCard key={a.id} article={a} />)}
            </div>
          </section>
        )}

        <section className="section how">
          <h2><span className="h-icon h-icon--pink">🚀</span> Save in 3 steps</h2>
          <ol className="how__steps">
            <li><span className="how__icon">🔎</span><strong>Find your shop</strong><span>Search for a store or browse by category and open its coupon page.</span></li>
            <li><span className="how__icon">🎟️</span><strong>Show the code</strong><span>Click “Show code”: the shop opens in a new tab and your code appears here. Copy it.</span></li>
            <li><span className="how__icon">💸</span><strong>Paste at checkout</strong><span>Paste the code in the voucher field at the shop and enjoy the discount. It is always free.</span></li>
          </ol>
        </section>

        <section className="section seo-text">
          <h2><span className="h-icon h-icon--green">🛡️</span> How we keep codes working</h2>
          <p>
            {settings.site_name} lists discount codes, sale offers and printable coupons from shops in the UK, Germany, France and
            Italy. Offers show when they were last checked, expired coupons disappear automatically, and we only label an offer
            “verified” after a person has tested it.
          </p>
          <p>
            Our service is free. When you buy through a link on this site the shop may pay us a small commission. This never changes
            your price and it never decides which offers we show first: <Link href="/affiliate-disclosure">read how we earn money</Link>.
          </p>
        </section>

        <Newsletter region={region} />
      </div>
    </>
  );
}
