import Link from 'next/link';
import { api, getRegion } from '@/lib/server';
import { ProductGrid } from '@/components/Grids';
import Pagination from '@/components/Pagination';

export const metadata = {
  title: 'Product deals & price drops',
  description: 'Hand-picked product deals with the biggest discounts from top European stores.',
};

const SORTS = [['', 'Featured'], ['discount', 'Biggest discount'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['newest', 'Newest']];

export default async function DealsPage({ searchParams }) {
  const sp = await searchParams;
  const region = await getRegion();
  const page = Number(sp.page) || 1;
  const params = { category: sp.category || '', sort: sp.sort || '', q: sp.q || '' };
  const [data, categories] = await Promise.all([
    api('/products', { country: region, page, ...params }),
    api('/categories', { country: region }),
  ]);
  const link = (patch) => {
    const q = new URLSearchParams(Object.entries({ ...params, ...patch }).filter(([, v]) => v));
    return `/deals${q.size ? `?${q}` : ''}`;
  };

  return (
    <div className="container page">
      <h1>Product deals</h1>
      <p className="lead">{data.total} discounted products right now.</p>
      <div className="chips chips--dark">
        <Link href={link({ category: '' })} className={`chip ${!params.category ? 'chip--active' : ''}`}>All</Link>
        {categories.filter((c) => c.product_count > 0).map((c) => (
          <Link key={c.id} href={link({ category: c.slug })} className={`chip ${params.category === c.slug ? 'chip--active' : ''}`}>
            {c.icon} {c.name}
          </Link>
        ))}
      </div>
      <div className="toolbar">
        <div className="tabs">
          {SORTS.map(([v, label]) => (
            <Link key={v} href={link({ sort: v })} className={params.sort === v ? 'active' : ''}>{label}</Link>
          ))}
        </div>
      </div>
      <ProductGrid products={data.items} region={region} />
      <Pagination page={page} total={data.total} limit={data.limit} basePath="/deals" params={params} />
    </div>
  );
}
