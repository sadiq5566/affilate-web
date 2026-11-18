import { api, getRegion } from '@/lib/server';
import { CouponList, ProductGrid, StoreGrid } from '@/components/Grids';

export const metadata = { title: 'Search', robots: { index: false } };

export default async function SearchPage({ searchParams }) {
  const { q = '' } = await searchParams;
  const region = await getRegion();
  const data = await api('/search', { q, country: region });
  const count = data.stores.length + data.coupons.length + data.products.length;
  return (
    <div className="container page">
      <h1>{q ? <>Results for “{q}”</> : 'Search'}</h1>
      <form action="/search" className="hero__search hero__search--page" role="search">
        <input type="search" name="q" defaultValue={q} placeholder="Search stores, coupons, deals…" aria-label="Search" />
        <button className="btn btn--primary">Search</button>
      </form>
      {q && count === 0 && <p className="empty">Nothing found. Try a store name or a category like “fashion”.</p>}
      {data.stores.length > 0 && (
        <section className="section"><h2>Stores</h2><StoreGrid stores={data.stores} /></section>
      )}
      {data.coupons.length > 0 && (
        <section className="section"><h2>Coupons</h2><CouponList coupons={data.coupons} region={region} /></section>
      )}
      {data.products.length > 0 && (
        <section className="section"><h2>Deals</h2><ProductGrid products={data.products} region={region} /></section>
      )}
    </div>
  );
}
