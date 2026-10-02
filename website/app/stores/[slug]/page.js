import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, getRegion, monthYear } from '@/lib/server';
import { goUrl, REGIONS } from '@/lib/regions';
import StoreLogo from '@/components/StoreLogo';
import { CouponList, ProductGrid, StoreGrid } from '@/components/Grids';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await api(`/stores/${slug}`);
  if (!data) return { title: 'Store not found' };
  const { store } = data;
  return {
    title: `${store.name} Discount Codes & Vouchers – ${monthYear()}`,
    description: `${store.coupon_count} verified ${store.name} discount codes and deals for ${monthYear()}. ${store.description || ''}`.trim(),
    alternates: { canonical: `/stores/${slug}` },
  };
}

export default async function StorePage({ params, searchParams }) {
  const { slug } = await params;
  const { type } = await searchParams;
  const region = await getRegion();
  const data = await api(`/stores/${slug}`, { country: region });
  if (!data) notFound();
  const { store, products, related } = data;
  const coupons = data.coupons.filter((c) => !type || c.type === type);
  const codeCount = data.coupons.filter((c) => c.type === 'code').length;

  return (
    <div className="container page">
      <nav className="crumbs small"><Link href="/">Home</Link> / <Link href="/stores">Stores</Link> / {store.name}</nav>
      <div className="store-head">
        <StoreLogo name={store.name} src={store.logo_url} size={96} />
        <div className="store-head__text">
          <h1>{store.name} Discount Codes</h1>
          <p className="muted">
            {data.coupons.length} offers · {codeCount} codes · updated {monthYear()}
          </p>
          {store.description && <p>{store.description}</p>}
        </div>
        <a className="btn btn--primary" href={goUrl('store', store.id, region)} target="_blank" rel="sponsored nofollow noopener">
          Visit store →
        </a>
      </div>

      <div className="layout-2">
        <div>
          <div className="tabs">
            <Link href={`/stores/${slug}`} className={!type ? 'active' : ''}>All ({data.coupons.length})</Link>
            <Link href={`/stores/${slug}?type=code`} className={type === 'code' ? 'active' : ''}>Codes ({codeCount})</Link>
            <Link href={`/stores/${slug}?type=deal`} className={type === 'deal' ? 'active' : ''}>Deals ({data.coupons.length - codeCount})</Link>
          </div>
          {data.coupons.length === 0 && REGIONS[store.country] && store.country !== region && (
            <p className="note">
              {store.name} offers are available for shoppers in {REGIONS[store.country].flag} {REGIONS[store.country].name}.
              Switch your country at the top of the page to see them.
            </p>
          )}
          <CouponList coupons={coupons} region={region} showStore={false} empty={`No ${store.name} offers right now – check back soon.`} />

          {products.length > 0 && (
            <section className="section">
              <h2>{store.name} product deals</h2>
              <ProductGrid products={products} region={region} />
            </section>
          )}
        </div>

        <aside className="sidebar">
          <div className="card">
            <h3>About {store.name}</h3>
            <p className="small">{store.description || `Find the latest ${store.name} offers here.`}</p>
            <h4>How to use a {store.name} code</h4>
            <ol className="small">
              <li>Click “Get Code” and copy the code.</li>
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
