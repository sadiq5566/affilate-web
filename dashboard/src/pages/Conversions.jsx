import { useState } from 'react';
import ResourcePage, { Badge } from '../components/ResourcePage.jsx';
import Modal from '../components/Modal.jsx';
import { CURRENCIES, useOptions } from '../components/useOptions.js';
import { useToast } from '../components/Toast.jsx';
import { admin, download } from '../api.js';
import { date, money } from '../format.js';

export const STATUS_TONE = { pending: 'warn', approved: 'ok', paid: 'info', rejected: 'danger' };
const STATUS_ICON = { pending: '⏳', approved: '✓', paid: '💰', rejected: '✕' };

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_ICON[status]} {status}</Badge>;
}

const SAMPLE = `date,store,order_ref,sale_amount,commission,currency,status,click_id
2026-10-01,TechNova,ORD-1001,129.99,5.20,GBP,approved,
2026-10-01,ModaRoma,ORD-1002,80.00,,EUR,pending,`;

function ImportModal({ onClose, onDone }) {
  const toast = useToast();
  const [csv, setCsv] = useState('');
  const [network, setNetwork] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function readFile(e) {
    const file = e.target.files?.[0];
    if (file) setCsv(await file.text());
  }

  async function run() {
    setBusy(true);
    try {
      const r = await admin('/conversions/import', { method: 'POST', body: { csv, network } });
      setResult(r);
      toast(`Imported: ${r.created} new, ${r.updated} updated`);
      onDone();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Import sales from CSV"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Close</button>
          <button className="btn btn--primary" disabled={!csv.trim() || busy} onClick={run}>{busy ? 'Importing…' : 'Import'}</button>
        </>
      }
    >
      <p className="muted">
        Export a transactions report from your affiliate network and upload it here. Recognised columns:{' '}
        <code>date, store, order_ref (or order_id / transaction_id), sale_amount (or amount), commission, currency, status, click_id (or subid / clickref), network, note</code>.
        Rows with an existing order reference are updated (e.g. pending → approved).
      </p>
      <div className="form-grid">
        <div className="field">
          <label>CSV file</label>
          <input type="file" accept=".csv,text/csv" onChange={readFile} />
        </div>
        <div className="field">
          <label>Network (optional)</label>
          <input value={network} onChange={(e) => setNetwork(e.target.value)} placeholder="Awin" />
        </div>
        <div className="field field--full">
          <label>…or paste CSV</label>
          <textarea rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={SAMPLE} className="mono" />
        </div>
      </div>
      {result?.errors?.length > 0 && (
        <div className="alert alert--error">
          {result.errors.slice(0, 10).map((e) => <div key={e}>{e}</div>)}
        </div>
      )}
    </Modal>
  );
}

export default function Conversions() {
  const o = useOptions();
  const [importing, setImporting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [range, setRange] = useState({ from: '', to: '' });

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
        reloadKey={reloadKey}
        query={range}
        defaults={{ status: 'pending', currency: 'EUR', converted_at: new Date().toISOString().slice(0, 10) }}
        bulkActions={[['approved', 'Mark approved'], ['paid', 'Mark paid'], ['rejected', 'Mark rejected'], ['delete', 'Delete']]}
        filters={[
          { name: 'status', label: 'Status', options: ['pending', 'approved', 'paid', 'rejected'].map((s) => ({ value: s, label: s })) },
          { name: 'store_id', label: 'Store', options: o.storeOptions },
          { name: 'country', label: 'Region', options: o.regionOptions.filter((r) => r.value !== 'ALL') },
          { name: 'source', label: 'Source', options: ['postback', 'import', 'manual'].map((s) => ({ value: s, label: s })) },
        ]}
        toolbarExtra={({ filters, search }) => (
          <>
            <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} aria-label="From date" />
            <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} aria-label="To date" />
            <button className="btn btn--ghost" onClick={() => download('/conversions/export', 'conversions.csv', { ...filters, ...range, q: search })}>Export CSV</button>
            <button className="btn btn--ghost" onClick={() => setImporting(true)}>Import CSV</button>
          </>
        )}
      />
      {importing && <ImportModal onClose={() => setImporting(false)} onDone={() => setReloadKey((k) => k + 1)} />}
    </>
  );
}
