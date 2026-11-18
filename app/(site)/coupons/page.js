import Link from 'next/link';
import { api, getRegion, monthYear } from '@/lib/server';
import { REGIONS } from '@/lib/regions';
import { CouponList } from '@/components/Grids';
import Pagination from '@/components/Pagination';

const SORTS = [['', 'Recommended'], ['newest', 'Newest'], ['popular', 'Most used'], ['expiring', 'Ending soon']];

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const filtered = Object.keys(sp).some((k) => sp[k]);
  return {
    title: `All ${REGIONS[await getRegion()].codes} – ${monthYear()}`,
    description: 'Every verified discount code and deal, updated daily.',
    alternates: { canonical: '/coupons' },
    // Filtered / paginated views are for visitors, not for search engines.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function CouponsPage({ searchParams }) {
  const sp = await searchParams;
  const region = await getRegion();
  const page = Number(sp.page) || 1;
  const params = {
    type: sp.type || '', sort: sp.sort || '', q: sp.q || '',
    store: sp.store || '', category: sp.category || '',
    exclusive: sp.exclusive === '1' ? '1' : '', verified: sp.verified === '1' ? '1' : '',
  };
  const [data, stores, categories] = await Promise.all([
    api('/coupons', { country: region, page, ...params }),
    api('/stores', { country: region }),
    api('/categories', { country: region }),
  ]);

  const link = (patch) => {
    const q = new URLSearchParams(Object.entries({ ...params, ...patch }).filter(([, v]) => v));
    return `/coupons${q.size ? `?${q}` : ''}`;
  };
  const hasFilters = Boolean(params.q || params.store || params.category || params.exclusive || params.verified);

  return (
    <div className="container page">
      <h1>Discount codes & deals</h1>
      <p className="lead">{data.total} live offers for {monthYear()}.</p>

      {/* Plain GET form: works without JavaScript and keeps every filter in the URL. */}
      <form action="/coupons" method="get" className="filterbar">
        {params.type && <input type="hidden" name="type" value={params.type} />}
        {params.sort && <input type="hidden" name="sort" value={params.sort} />}
        <input type="search" name="q" defaultValue={params.q} placeholder="Search offers or stores…" aria-label="Search offers" />
        <select name="store" defaultValue={params.store} aria-label="Store">
          <option value="">All stores</option>
          {stores.map((s) => <option key={s.id} value={s.slug}>{s.name}</option>)}
        </select>
        <select name="category" defaultValue={params.category} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>)}
        </select>
        <label className="check"><input type="checkbox" name="verified" value="1" defaultChecked={Boolean(params.verified)} /> Verified</label>
        <label className="check"><input type="checkbox" name="exclusive" value="1" defaultChecked={Boolean(params.exclusive)} /> Exclusive</label>
        <button className="btn btn--primary">Filter</button>
        {hasFilters && <Link href={link({ q: '', store: '', category: '', exclusive: '', verified: '' })} className="small">Clear filters</Link>}
      </form>

      <div className="toolbar">
        <div className="tabs">
          <Link href={link({ type: '' })} className={!params.type ? 'active' : ''}>All</Link>
          <Link href={link({ type: 'code' })} className={params.type === 'code' ? 'active' : ''}>Codes</Link>
          <Link href={link({ type: 'sale' })} className={params.type === 'sale' ? 'active' : ''}>Sale</Link>
          <Link href={link({ type: 'print' })} className={params.type === 'print' ? 'active' : ''}>Printable</Link>
        </div>
        <div className="tabs">
          {SORTS.map(([v, label]) => (
            <Link key={v} href={link({ sort: v })} className={params.sort === v ? 'active' : ''}>{label}</Link>
          ))}
        </div>
      </div>
      <CouponList coupons={data.items} region={region} empty="No offers match these filters." />
      <Pagination page={page} total={data.total} limit={data.limit} basePath="/coupons" params={params} />
    </div>
  );
}
