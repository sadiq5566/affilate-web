import ResourcePage, { ActiveBadge, Badge } from '../ResourcePage.jsx';
import { refreshOptions, useOptions, ACTIVE_OPTIONS, HAS, YES_NO, sortOptions } from '../useOptions.js';
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
    { name: '_trust', section: 'Trust & SEO (shown on the store page)' },
    { name: 'editor_name', label: 'Checked by (editor name)', help: 'Shows an "editor" box. Leave empty to hide it.' },
    { name: 'last_checked_at', label: 'Last checked on', type: 'date' },
    { name: 'success_rate', label: 'Success rate %', type: 'number', help: 'Only fill in if you really track it. Empty = not shown.' },
    { name: 'rating_avg', label: 'Rating (0–5)', type: 'number', help: 'Only enter ratings from real reviews. Empty = not shown and no star markup for Google.' },
    { name: 'rating_count', label: 'Number of reviews', type: 'number' },
    { name: 'seo_title', label: 'SEO title', full: true, help: 'Empty = "{Store} Discount Codes – Month Year"' },
    { name: 'seo_description', label: 'SEO description', type: 'textarea', full: true },
    { name: 'faq', label: 'FAQ (one per line: Question | Answer)', type: 'textarea', full: true, help: 'Shown as an accordion and as FAQ markup for Google.' },
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
        { name: 'category_id', label: 'Category', options: o.categoryOptions },
        { name: 'network', label: 'Network', options: NETWORKS.map((n) => ({ value: n, label: n })) },
        { name: 'commission_type', label: 'Commission type', options: [{ value: 'percent', label: 'Percent' }, { value: 'fixed', label: 'Fixed amount' }] },
        { name: 'is_active', label: 'Visibility', options: ACTIVE_OPTIONS },
        { name: 'is_featured', label: 'Featured', options: YES_NO },
        { name: 'has_affiliate', label: 'Affiliate link', options: HAS },
        { name: 'has_logo', label: 'Logo', options: HAS },
        { name: 'stale_days', label: 'Not checked for', options: [{ value: 7, label: '7+ days' }, { value: 30, label: '30+ days' }, { value: 90, label: '90+ days' }] },
        { name: 'has_faq', label: 'FAQ', options: HAS },
        { name: 'no_offers', label: 'Offers', options: [{ value: 1, label: 'No coupons or products' }] },
      ]}
      ranges={[{ name: 'commission', label: 'Commission rate' }, { name: 'rating', label: 'Rating' }]}
      bulkActions={[['checked', '✓ Mark checked today'], ['activate', 'Activate'], ['deactivate', 'Deactivate'], ['delete', 'Delete']]}
      sorts={sortOptions(['name', 'Name'], ['created_at', 'Date added'], ['commission_value', 'Commission'], ['coupon_count', 'Coupons'], ['product_count', 'Products'], ['click_count', 'Clicks'])}
      importHint="Columns: name, slug, category (name), country (UK/DE/FR/IT/ALL), network, affiliate_url, subid_param, commission_type (percent/fixed), commission_value, website_url, logo_url, description, is_featured, is_active."
    />
  );
}
