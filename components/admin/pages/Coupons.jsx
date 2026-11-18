import ResourcePage, { ActiveBadge, Badge } from '../ResourcePage.jsx';
import { ACTIVE_OPTIONS, HAS, YES_NO, sortOptions, useOptions } from '../useOptions.js';
import { date, num } from '../format.js';

export default function Coupons() {
  const o = useOptions();
  const fields = [
    { name: 'title', label: 'Offer title', required: true, full: true, placeholder: 'e.g. 20% off your first order' },
    { name: 'store_id', label: 'Store', type: 'select', required: true, options: o.storeOptions },
    { name: 'category_id', label: 'Category', type: 'select', options: o.categoryOptions },
    { name: 'kind', label: 'Type', type: 'select', options: [{ value: 'code', label: 'Code (reveal on click)' }, { value: 'sale', label: 'Sale / deal (no code)' }, { value: 'print', label: 'Printable' }], help: 'Empty = automatic: code if a code is entered, otherwise sale' },
    { name: 'code', label: 'Coupon code', placeholder: 'Leave empty for a sale / deal' },
    { name: 'discount_label', label: 'Discount label', placeholder: '20% OFF · £10 OFF · FREE DELIVERY' },
    { name: 'country', label: 'Show in region', type: 'select', required: true, options: o.regionOptions },
    { name: 'affiliate_url', label: 'Affiliate / landing link', type: 'url', help: 'Optional – defaults to the store affiliate link' },
    { name: 'starts_at', label: 'Starts', type: 'date' },
    { name: 'expires_at', label: 'Expires', type: 'date', help: 'Expired coupons are hidden automatically' },
    { name: 'event_id', label: 'Shopping event', type: 'select', options: o.eventOptions, help: 'e.g. Black Friday – lists this offer on the event page' },
    { name: 'verified_at', label: 'Last checked on', type: 'date', help: 'Shown as "checked X ago". Only fill in after you really tested the coupon.' },
    { name: 'description', label: 'Terms & conditions', type: 'textarea', full: true },
    { name: 'usage_note', label: 'How to redeem', type: 'textarea', full: true, help: 'Shown in the code pop-up. Default text is used when empty.' },
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
    { key: 'code', label: 'Code', render: (r) => (r.code ? <code className="code">{r.code}</code> : <Badge>{r.type === 'print' ? 'Printable' : 'Sale'}</Badge>) },
    { key: 'verified_at', label: 'Checked', render: (r) => (r.verified_at ? date(r.verified_at) : <span className="muted">never</span>) },
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
      bulkActions={[['verify', '✓ Mark verified now'], ['activate', 'Activate'], ['deactivate', 'Deactivate'], ['delete', 'Delete']]}
      filters={[
        { name: 'store_id', label: 'Store', options: o.storeOptions },
        { name: 'category_id', label: 'Category', options: o.categoryOptions },
        { name: 'country', label: 'Region', options: o.regionOptions },
        { name: 'status', label: 'Expiry', options: [{ value: 'live', label: 'Live' }, { value: 'expired', label: 'Expired' }] },
        { name: 'expiring_days', label: 'Expiring within', options: [{ value: 3, label: '3 days' }, { value: 7, label: '7 days' }, { value: 14, label: '14 days' }, { value: 30, label: '30 days' }] },
        { name: 'no_expiry', label: 'No end date', options: [{ value: 1, label: 'Only these' }] },
        { name: 'kind', label: 'Type', options: [{ value: 'code', label: 'Code' }, { value: 'sale', label: 'Sale / deal' }, { value: 'print', label: 'Printable' }] },
        { name: 'has_code', label: 'Has a code', options: HAS },
        { name: 'event_id', label: 'Event', options: o.eventOptions },
        { name: 'stale_days', label: 'Not checked for', options: [{ value: 1, label: '1+ day' }, { value: 3, label: '3+ days' }, { value: 7, label: '7+ days' }, { value: 30, label: '30+ days' }] },
        { name: 'is_active', label: 'Visibility', options: ACTIVE_OPTIONS },
        { name: 'is_featured', label: 'Featured', options: YES_NO },
        { name: 'is_verified', label: 'Verified', options: YES_NO },
        { name: 'is_exclusive', label: 'Exclusive', options: YES_NO },
        { name: 'has_link', label: 'Own affiliate link', options: HAS },
        { name: 'no_clicks', label: 'Clicks', options: [{ value: 1, label: 'Never clicked' }] },
      ]}
      ranges={[{ name: 'uses', label: 'Times used', step: 1 }]}
      sorts={sortOptions(['created_at', 'Date added'], ['expires_at', 'Expiry date'], ['title', 'Title'], ['uses', 'Times used'], ['click_count', 'Clicks'], ['verified_at', 'Last checked'])}
      importHint="Columns: title, store_name (+ optional store_slug), category, type (code / sale / print), code, discount_label, description, usage_note, affiliate_url, country (UK/DE/FR/IT/ALL), event, starts_at, expires_at (YYYY-MM-DD), verified_at, is_featured, is_verified, is_exclusive, is_active. Missing stores, categories and events are created automatically."
    />
  );
}
