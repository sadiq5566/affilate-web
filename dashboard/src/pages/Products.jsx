import ResourcePage, { ActiveBadge, Badge } from '../components/ResourcePage.jsx';
import { CURRENCIES, useOptions } from '../components/useOptions.js';
import { money, num } from '../format.js';
import { SITE_URL } from '../api.js';

export default function Products() {
  const o = useOptions();
  const fields = [
    { name: 'title', label: 'Product title', required: true, full: true },
    { name: 'store_id', label: 'Store', type: 'select', required: true, options: o.storeOptions },
    { name: 'category_id', label: 'Category', type: 'select', options: o.categoryOptions },
    { name: 'price', label: 'Sale price', type: 'number', required: true },
    { name: 'old_price', label: 'Original price', type: 'number', help: 'Shows a strike-through price and % off' },
    { name: 'currency', label: 'Currency', type: 'select', required: true, options: CURRENCIES },
    { name: 'country', label: 'Show in region', type: 'select', required: true, options: o.regionOptions },
    { name: 'affiliate_url', label: 'Affiliate / deep link', type: 'url', full: true, help: 'Leave empty to use the store affiliate link. Use {click_id} to insert the tracking id.' },
    { name: 'image_url', label: 'Image', type: 'image', full: true },
    { name: 'description', label: 'Description', type: 'textarea', full: true },
    { name: 'slug', label: 'URL slug', help: 'Auto-generated from the title if empty' },
    { name: 'expires_at', label: 'Deal ends', type: 'date' },
    { name: 'is_featured', label: 'Featured on homepage', type: 'bool' },
    { name: 'is_active', label: 'Visible on website', type: 'bool' },
  ];
  const columns = [
    {
      key: 'title',
      label: 'Product',
      render: (r) => (
        <div className="cell-media">
          {r.image_url ? <img src={r.image_url} alt="" /> : <span className="thumb-empty" />}
          <div>
            <strong>{r.title}</strong>
            <span className="muted small">{r.store_name} · {r.category_name || 'No category'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      render: (r) => (
        <>
          {money(r.price, r.currency)}
          {r.old_price > r.price && <s className="muted small"> {money(r.old_price, r.currency)}</s>}
        </>
      ),
    },
    { key: 'country', label: 'Region', render: (r) => <Badge>{r.country}</Badge> },
    { key: 'click_count', label: 'Clicks', className: 'num', render: (r) => num(r.click_count) },
    {
      key: 'is_active',
      label: 'Status',
      render: (r) => (
        <>
          <ActiveBadge value={r.is_active} /> {r.is_featured ? <Badge tone="accent">Featured</Badge> : null}
        </>
      ),
    },
    { key: 'link', label: '', render: (r) => <a href={`${SITE_URL}/deals/${r.slug}`} target="_blank" rel="noreferrer" className="small">View ↗</a> },
  ];
  return (
    <ResourcePage
      resource="products"
      singular="Product"
      columns={columns}
      fields={fields}
      defaults={{ is_active: 1, currency: 'GBP', country: 'UK' }}
      filters={[
        { name: 'store_id', label: 'Store', options: o.storeOptions },
        { name: 'category_id', label: 'Category', options: o.categoryOptions },
        { name: 'country', label: 'Region', options: o.regionOptions },
        { name: 'is_active', label: 'Status', options: [{ value: 1, label: 'Active' }, { value: 0, label: 'Hidden' }] },
      ]}
    />
  );
}
