import Link from 'next/link';
import { api, getRegion, getSettings } from '@/lib/server';
import { REGIONS } from '@/lib/regions';
import { CouponList, ProductGrid, StoreGrid } from '@/components/Grids';
import Newsletter from '@/components/Newsletter';

export default async function HomePage() {
  const region = await getRegion();
  const [data, settings] = await Promise.all([api('/home', { country: region }), getSettings()]);
  const r = REGIONS[region];

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <p className="eyebrow">{r.flag} Deals for shoppers in {r.name}</p>
          <h1>Save more at the shops you love</h1>
          <p className="hero__sub">{settings.site_tagline}. Hand-checked codes, updated every day.</p>
          <form action="/search" className="hero__search" role="search">
            <input type="search" name="q" placeholder="Try “fashion”, “TechNova” or “free delivery”" aria-label="Search" />
            <button className="btn btn--accent">Search</button>
          </form>
          <div className="chips">
            {data.categories.map((c) => (
              <Link key={c.id} href={`/categories/${c.slug}`} className="chip">
                <span aria-hidden="true">{c.icon}</span> {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="container">
        <section className="section">
          <div className="section__head">
            <h2>Top coupons today</h2>
            <Link href="/coupons">See all coupons →</Link>
          </div>
          <CouponList coupons={data.featured_coupons.length ? data.featured_coupons : data.latest_coupons.slice(0, 6)} region={region} />
        </section>

        <section className="section">
          <div className="section__head">
            <h2>Popular stores</h2>
            <Link href="/stores">All stores →</Link>
          </div>
          <StoreGrid stores={data.stores} />
        </section>

        <section className="section">
          <div className="section__head">
            <h2>Trending deals</h2>
            <Link href="/deals">All deals →</Link>
          </div>
          <ProductGrid products={data.featured_products} region={region} />
        </section>

        <section className="section">
          <div className="section__head">
            <h2>Just added</h2>
            <Link href="/coupons?sort=newest">More →</Link>
          </div>
          <CouponList coupons={data.latest_coupons.slice(0, 6)} region={region} />
        </section>

        <section className="section how">
          <h2>How it works</h2>
          <ol className="how__steps">
            <li><strong>Find a code</strong><span>Browse thousands of verified coupons and deals by store or category.</span></li>
            <li><strong>Shop as usual</strong><span>Click “Get Code”, copy it and you go straight to the store.</span></li>
            <li><strong>Save at checkout</strong><span>Paste the code at checkout and enjoy the discount – it&apos;s always free.</span></li>
          </ol>
        </section>

        <Newsletter region={region} />
      </div>
    </>
  );
}
