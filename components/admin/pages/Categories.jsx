import ResourcePage, { ActiveBadge } from '../ResourcePage.jsx';
import { ACTIVE_OPTIONS, refreshOptions, sortOptions } from '../useOptions.js';

export default function Categories() {
  const fields = [
    { name: 'name', label: 'Name', required: true },
    { name: 'icon', label: 'Icon (emoji)', placeholder: '👗' },
    { name: 'image_url', label: 'Card image', type: 'image', full: true, help: 'Shown on the homepage category cards' },
    { name: 'sort_order', label: 'Sort order', type: 'number', help: 'Lower numbers show first' },
    { name: 'slug', label: 'URL slug', help: 'Auto-generated if empty' },
    { name: 'description', label: 'Description (SEO text on category page)', type: 'textarea', full: true },
    { name: 'is_active', label: 'Visible on website', type: 'bool' },
  ];
  const columns = [
    { key: 'name', label: 'Category', render: (r) => <strong>{r.icon} {r.name}</strong> },
    { key: 'slug', label: 'Slug', render: (r) => <code className="small">{r.slug}</code> },
    { key: 'coupon_count', label: 'Coupons', className: 'num' },
    { key: 'product_count', label: 'Products', className: 'num' },
    { key: 'sort_order', label: 'Order', className: 'num' },
    { key: 'is_active', label: 'Status', render: (r) => <ActiveBadge value={r.is_active} /> },
  ];
  return (
    <ResourcePage resource="categories" singular="Category" columns={columns} fields={fields} defaults={{ is_active: 1, sort_order: 0 }} onSaved={refreshOptions}
      filters={[
        { name: 'is_active', label: 'Visibility', options: ACTIVE_OPTIONS },
        { name: 'empty', label: 'Content', options: [{ value: 1, label: 'Empty (no coupons or products)' }] },
      ]}
      sorts={sortOptions(['name', 'Name'], ['sort_order', 'Sort order'], ['created_at', 'Date added'], ['coupon_count', 'Coupons'], ['product_count', 'Products'])}
      importHint="Columns: name, slug, icon (emoji), image_url, description, sort_order, is_active."
    />
  );
}
