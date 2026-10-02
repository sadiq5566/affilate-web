import Link from 'next/link';
import { api, getRegion, monthYear } from '@/lib/server';
import { CouponList } from '@/components/Grids';
import Pagination from '@/components/Pagination';

export const metadata = {
  title: `All Discount Codes & Vouchers – ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
  description: 'Every verified discount code and deal, updated daily.',
};

const SORTS = [['', 'Recommended'], ['newest', 'Newest'], ['popular', 'Most used'], ['expiring', 'Ending soon']];

export default async function CouponsPage({ searchParams }) {
  const sp = await searchParams;
  const region = await getRegion();
  const page = Number(sp.page) || 1;
  const params = { type: sp.type || '', sort: sp.sort || '', q: sp.q || '' };
  const data = await api('/coupons', { country: region, page, ...params });

  const link = (patch) => {
    const q = new URLSearchParams(Object.entries({ ...params, ...patch }).filter(([, v]) => v));
    return `/coupons${q.size ? `?${q}` : ''}`;
  };

  return (
    <div className="container page">
      <h1>Discount codes & deals</h1>
      <p className="lead">{data.total} live offers for {monthYear()}.</p>
      <div className="toolbar">
        <div className="tabs">
          <Link href={link({ type: '' })} className={!params.type ? 'active' : ''}>All</Link>
          <Link href={link({ type: 'code' })} className={params.type === 'code' ? 'active' : ''}>Codes</Link>
          <Link href={link({ type: 'deal' })} className={params.type === 'deal' ? 'active' : ''}>Deals</Link>
        </div>
        <div className="tabs">
          {SORTS.map(([v, label]) => (
            <Link key={v} href={link({ sort: v })} className={params.sort === v ? 'active' : ''}>{label}</Link>
          ))}
        </div>
      </div>
      <CouponList coupons={data.items} region={region} />
      <Pagination page={page} total={data.total} limit={data.limit} basePath="/coupons" params={params} />
    </div>
  );
}
