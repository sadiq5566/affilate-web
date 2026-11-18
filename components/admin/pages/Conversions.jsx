import ResourcePage, { Badge } from '../ResourcePage.jsx';
import { CURRENCIES, HAS, sortOptions, useOptions } from '../useOptions.js';
import { date, money } from '../format.js';

const NETWORK_OPTIONS = ['Awin', 'CJ', 'Impact', 'Rakuten', 'Tradedoubler'].map((n) => ({ value: n, label: n }));

export const STATUS_TONE = { pending: 'warn', approved: 'ok', paid: 'info', rejected: 'danger' };
const STATUS_ICON = { pending: '⏳', approved: '✓', paid: '💰', rejected: '✕' };

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_ICON[status]} {status}</Badge>;
}

export default function Conversions() {
  const o = useOptions();

  const fields = [
    { name: 'store_id', label: 'Store', type: 'select', required: true, options: o.storeOptions },
    { name: 'status', label: 'Status', type: 'select', required: true, options: ['pending', 'approved', 'paid', 'rejected'].map((s) => ({ value: s, label: s })) },
    { name: 'sale_amount', label: 'Sale amount', type: 'number', help: 'Order value (0 for a lead)' },
    { name: 'commission', label: 'Your commission', type: 'number', help: 'Empty = estimated from the store rate' },
    { name: 'currency', label: 'Currency', type: 'select', required: true, options: CURRENCIES },
    { name: 'country', label: 'Region', type: 'select', options: o.regionOptions.filter((r) => r.value !== 'ALL') },
    { name: 'order_ref', label: 'Order / transaction ref' },
    { name: 'network', label: 'Network' },
    { name: 'click_id', label: 'Click ID (sub-id)', help: 'Links the sale to the exact click/coupon' },
    { name: 'converted_at', label: 'Date', type: 'date' },
    { name: 'note', label: 'Note', type: 'textarea', full: true },
  ];

  const columns = [
    { key: 'converted_at', label: 'Date', render: (r) => date(r.converted_at) },
    { key: 'store_name', label: 'Store', render: (r) => <strong>{r.store_name || '—'}</strong> },
    { key: 'order_ref', label: 'Order ref', render: (r) => <span className="small">{r.order_ref || '—'}</span> },
    { key: 'sale_amount', label: 'Sale', className: 'num', render: (r) => money(r.sale_amount, r.currency) },
    { key: 'commission', label: 'Commission', className: 'num', render: (r) => <strong>{money(r.commission, r.currency)}</strong> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'country', label: 'Region', render: (r) => r.country || '—' },
    { key: 'source', label: 'Source', render: (r) => <span className="muted small">{r.source}{r.network ? ` · ${r.network}` : ''}</span> },
  ];

  return (
    <>
      <p className="page-intro">
        Every sale or lead you earn commission on. Conversions arrive automatically via the network <strong>postback</strong>{' '}
        (see Settings), by CSV import, or you can add them manually.
      </p>
      <ResourcePage
        resource="conversions"
        singular="Conversion"
        columns={columns}
        fields={fields}
        defaults={{ status: 'pending', currency: 'EUR', converted_at: new Date().toISOString().slice(0, 10) }}
        bulkActions={[['approved', 'Mark approved'], ['paid', 'Mark paid'], ['rejected', 'Mark rejected'], ['delete', 'Delete']]}
        filters={[
          { name: 'status', label: 'Status', options: ['pending', 'approved', 'paid', 'rejected'].map((s) => ({ value: s, label: s })) },
          { name: 'store_id', label: 'Store', options: o.storeOptions },
          { name: 'country', label: 'Region', options: o.regionOptions.filter((r) => r.value !== 'ALL') },
          { name: 'source', label: 'Source', options: ['postback', 'import', 'manual'].map((s) => ({ value: s, label: s })) },
          { name: 'currency', label: 'Currency', options: CURRENCIES },
          { name: 'network', label: 'Network', options: NETWORK_OPTIONS },
          { name: 'has_click', label: 'Linked to a click', options: HAS },
        ]}
        ranges={[
          { name: 'sale_amount', label: 'Sale amount' },
          { name: 'commission', label: 'Commission' },
        ]}
        sorts={sortOptions(['converted_at', 'Date'], ['commission', 'Commission'], ['sale_amount', 'Sale amount'], ['status', 'Status'], ['store', 'Store'])}
        dateLabel="Sale date"
        importWithNetwork
        importHint="Columns: date, store (name), order_ref (or order_id / transaction_id), sale_amount (or amount), commission, currency, status, click_id (or subid / clickref), network, note. Rows with an existing order reference are updated (e.g. pending → approved)."
      />
    </>
  );
}
