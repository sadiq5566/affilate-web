import { useState } from 'react';
import Modal from './Modal.jsx';
import { useToast } from './Toast.jsx';
import { admin, download } from './api.js';

/**
 * CSV import dialog used on every page.
 *  resource: API resource name (POST /:resource/import)
 *  hint:     text describing the recognised columns
 *  withNetwork: show the optional "Network" field (sales import)
 */
const CREATES_REFS = ['products', 'coupons', 'stores'];

export default function ImportModal({ resource, title, hint, withNetwork, onClose, onDone }) {
  const toast = useToast();
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [network, setNetwork] = useState('');
  const [createMissing, setCreateMissing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function readFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setCsv((await file.text()).replace(/^﻿/, ''));
    setResult(null);
  }

  const rowCount = csv.trim() ? Math.max(csv.trim().split(/\r?\n/).length - 1, 0) : 0;

  async function run() {
    setBusy(true);
    try {
      const r = await admin(`/${resource}/import`, { method: 'POST', body: { csv, network, create_missing: createMissing } });
      setResult(r);
      toast(`Imported: ${r.created} new, ${r.updated} updated${r.skipped ? `, ${r.skipped} skipped` : ''}${r.errors.length ? `, ${r.errors.length} errors` : ''}`);
      onDone?.();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={title || 'Import from CSV'}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Close</button>
          <button className="btn btn--primary" disabled={!csv.trim() || busy} onClick={run}>
            {busy ? 'Importing…' : `Import${rowCount ? ` ${rowCount} row${rowCount === 1 ? '' : 's'}` : ''}`}
          </button>
        </>
      }
    >
      <p className="muted">
        {hint} Existing items are <strong>updated</strong> instead of duplicated, so you can also export, edit in Excel and import back.
      </p>
      <p>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => download(`/${resource}/export`, `${resource}-template.csv`, { template: 1 })}>
          ⬇ Download CSV template
        </button>
      </p>
      <div className="form-grid">
        <div className="field">
          <label>CSV file</label>
          <input type="file" accept=".csv,text/csv" onChange={readFile} />
          {fileName && <span className="help small muted">{fileName}</span>}
        </div>
        {withNetwork && (
          <div className="field">
            <label>Network (optional)</label>
            <input value={network} onChange={(e) => setNetwork(e.target.value)} placeholder="Awin" />
          </div>
        )}
        {CREATES_REFS.includes(resource) && (
          <label className="field field--full check">
            <input type="checkbox" checked={createMissing} onChange={(e) => setCreateMissing(e.target.checked)} />
            <span>Create missing stores / categories automatically (from the <code>store</code>, <code>store_name</code>, <code>store_slug</code>, <code>category</code> columns)</span>
          </label>
        )}
        <div className="field field--full">
          <label>…or paste CSV (first row = column names)</label>
          <textarea rows={7} value={csv} onChange={(e) => { setCsv(e.target.value); setResult(null); }} className="mono" />
        </div>
      </div>
      {result && (
        <div className={`alert ${result.errors.length ? 'alert--error' : ''}`}>
          <strong>
            {result.created} created · {result.updated} updated{result.skipped ? ` · ${result.skipped} skipped (already exist)` : ''}
          </strong>
          {(result.created_stores || result.created_categories || result.created_events) ? (
            <div className="small">
              Also created: {[result.created_stores && `${result.created_stores} store(s)`, result.created_categories && `${result.created_categories} categor${result.created_categories === 1 ? 'y' : 'ies'}`, result.created_events && `${result.created_events} event(s)`].filter(Boolean).join(', ')}
            </div>
          ) : null}
          {result.errors.slice(0, 15).map((e) => <div key={e}>{e}</div>)}
          {result.errors.length > 15 && <div>…and {result.errors.length - 15} more</div>}
        </div>
      )}
    </Modal>
  );
}
