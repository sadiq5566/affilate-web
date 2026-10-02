import ResourcePage, { ActiveBadge, Badge } from '../components/ResourcePage.jsx';
import { useOptions } from '../components/useOptions.js';
import { date, num } from '../format.js';

export default function Coupons() {
  const o = useOptions();
  const fields = [
    { name: 'title', label: 'Offer title', required: true, full: true, placeholder: 'e.g. 20% off your first order' },
    { name: 'store_id', label: 'Store', type: 'select', required: true, options: o.storeOptions },
    { name: 'category_id', label: 'Category', type: 'select', options: o.categoryOptions },
    { name: 'code', label: 'Coupon code', placeholder: 'Leave empty for a deal (no code)' },
    { name: 'discount_label', label: 'Discount label', placeholder: '20% OFF · £10 OFF · FREE DELIVERY' },
    { name: 'country', label: 'Show in region', type: 'select', required: true, options: o.regionOptions },
    { name: 'affiliate_url', label: 'Affiliate / landing link', type: 'url', help: 'Optional – defaults to the store affiliate link' },
    { name: 'starts_at', label: 'Starts', type: 'date' },
    { name: 'expires_at', label: 'Expires', type: 'date', help: 'Expired coupons are hidden automatically' },
    { name: 'description', label: 'Terms & conditions', type: 'textarea', full: true },
    { name: 'is_verified', label: 'Verified', type: 'bool' },
    { name: 'is_exclusive', label: 'Exclusive', type: 'bool' },
    { name: 'is_featured', label: 'Featured on homepage', type: 'bool' },
    { name: 'is_active', label: 'Visible on website', type: 'bool' },
  ];
  const columns = [
    {
      key: 'title',
      label: 'Offer',
      render: (r) => (
        <div>
          <strong>{r.title}</strong>
          <span className="muted small block">{r.store_name}</span>
        </div>
      ),
    },
    { key: 'code', label: 'Code', render: (r) => (r.code ? <code className="code">{r.code}</code> : <Badge>Deal</Badge>) },
    { key: 'discount_label', label: 'Discount' },
    { key: 'country', label: 'Region', render: (r) => <Badge>{r.country}</Badge> },
    { key: 'expires_at', label: 'Expires', render: (r) => (r.is_expired ? <Badge tone="danger">Expired {date(r.expires_at)}</Badge> : date(r.expires_at)) },
    { key: 'click_count', label: 'Clicks', className: 'num', render: (r) => num(r.click_count) },
    {
      key: 'is_active',
      label: 'Status',
      render: (r) => (
        <>
          <ActiveBadge value={r.is_active} /> {r.is_featured ? <Badge tone="accent">Featured</Badge> : null}{' '}
          {r.is_exclusive ? <Badge tone="info">Exclusive</Badge> : null}
        </>
      ),
    },
  ];
  return (
    <ResourcePage
      resource="coupons"
      singular="Coupon"
      columns={columns}
      fields={fields}
      defaults={{ is_active: 1, is_verified: 1, country: 'UK' }}
      filters={[
        { name: 'store_id', label: 'Store', options: o.storeOptions },
        { name: 'country', label: 'Region', options: o.regionOptions },
        { name: 'status', label: 'Expiry', options: [{ value: 'live', label: 'Live' }, { value: 'expired', label: 'Expired' }] },
        { name: 'is_active', label: 'Status', options: [{ value: 1, label: 'Active' }, { value: 0, label: 'Hidden' }] },
      ]}
    />
  );
}
