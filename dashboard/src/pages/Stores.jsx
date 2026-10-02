import ResourcePage, { ActiveBadge, Badge } from '../components/ResourcePage.jsx';
import { refreshOptions, useOptions } from '../components/useOptions.js';
import { num } from '../format.js';
import { SITE_URL } from '../api.js';

const NETWORKS = ['Awin', 'CJ', 'Impact', 'Rakuten', 'Tradedoubler', 'Partnerize', 'Amazon Associates', 'Webgains', 'Effiliation', 'TradeTracker', 'Direct'];

export default function Stores() {
  const o = useOptions();
  const fields = [
    { name: 'name', label: 'Store name', required: true },
    { name: 'category_id', label: 'Main category', type: 'select', options: o.categoryOptions },
    { name: 'country', label: 'Region', type: 'select', required: true, options: o.regionOptions },
    { name: 'website_url', label: 'Store website', type: 'url' },
    { name: 'logo_url', label: 'Logo', type: 'image', full: true },
    { name: 'description', label: 'Description (shown on store page)', type: 'textarea', full: true },
    { name: '_aff', section: 'Affiliate programme' },
    { name: 'network', label: 'Affiliate network', type: 'select', options: NETWORKS.map((n) => ({ value: n, label: n })) },
    {
      name: 'subid_param',
      label: 'Sub-ID parameter',
      placeholder: 'clickref / sid / subId1 / u1 / epi',
      help: 'Our click id is added as this URL parameter so the network sends it back with each sale.',
    },
    {
      name: 'affiliate_url',
      label: 'Affiliate tracking link',
      type: 'url',
      full: true,
      required: true,
      help: 'The deep link from your network. You can put {click_id} anywhere in it instead of using the Sub-ID parameter.',
    },
    { name: 'commission_type', label: 'Commission type', type: 'select', required: true, options: [{ value: 'percent', label: '% of sale' }, { value: 'fixed', label: 'Fixed per sale / lead' }] },
    { name: 'commission_value', label: 'Commission rate', type: 'number', help: 'Used to estimate commission when the network does not send it' },
    { name: 'slug', label: 'URL slug', help: 'Auto-generated if empty' },
    { name: 'is_featured', label: 'Featured store', type: 'bool' },
    { name: 'is_active', label: 'Visible on website', type: 'bool' },
  ];
  const columns = [
    {
      key: 'name',
      label: 'Store',
      render: (r) => (
        <div className="cell-media">
          {r.logo_url ? <img src={r.logo_url} alt="" /> : <span className="thumb-empty">{r.name[0]}</span>}
          <div>
            <strong>{r.name}</strong>
            <span className="muted small">{r.category_name || '—'}</span>
          </div>
        </div>
      ),
    },
    { key: 'network', label: 'Network' },
    { key: 'commission_value', label: 'Commission', render: (r) => (r.commission_value == null ? '—' : r.commission_type === 'fixed' ? `${r.commission_value} fixed` : `${r.commission_value}%`) },
    { key: 'country', label: 'Region', render: (r) => <Badge>{r.country}</Badge> },
    { key: 'coupon_count', label: 'Coupons', className: 'num' },
    { key: 'product_count', label: 'Products', className: 'num' },
    { key: 'click_count', label: 'Clicks', className: 'num', render: (r) => num(r.click_count) },
    { key: 'is_active', label: 'Status', render: (r) => <><ActiveBadge value={r.is_active} /> {r.is_featured ? <Badge tone="accent">Featured</Badge> : null}</> },
    { key: 'link', label: '', render: (r) => <a href={`${SITE_URL}/stores/${r.slug}`} target="_blank" rel="noreferrer" className="small">View ↗</a> },
  ];
  return (
    <ResourcePage
      resource="stores"
      singular="Store"
      columns={columns}
      fields={fields}
      defaults={{ is_active: 1, country: 'UK', commission_type: 'percent' }}
      onSaved={refreshOptions}
      filters={[
        { name: 'country', label: 'Region', options: o.regionOptions },
        { name: 'network', label: 'Network', options: NETWORKS.map((n) => ({ value: n, label: n })) },
        { name: 'is_active', label: 'Status', options: [{ value: 1, label: 'Active' }, { value: 0, label: 'Hidden' }] },
      ]}
    />
  );
}
