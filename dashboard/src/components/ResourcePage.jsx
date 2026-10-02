import { useCallback, useEffect, useState } from 'react';
import { admin } from '../api.js';
import Modal from './Modal.jsx';
import FormField from './FormField.jsx';
import { useToast } from './Toast.jsx';

const DEFAULT_BULK = [
  ['activate', 'Activate'],
  ['deactivate', 'Deactivate'],
  ['delete', 'Delete'],
];

/**
 * Generic list + create/edit/delete screen driven by config.
 *  columns: [{ key, label, render?(row), className? }]
 *  fields:  [{ name, label, type, required, options, help, full }]
 *  filters: [{ name, label, options: [{value,label}] }]
 */
export default function ResourcePage({
  resource,
  singular,
  columns,
  fields = [],
  filters = [],
  defaults = {},
  bulkActions = DEFAULT_BULK,
  canCreate = true,
  canEdit = true,
  toolbarExtra,
  query: extraQuery = {},
  onSaved,
  reloadKey,
}) {
  const toast = useToast();
  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: 25 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({});
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null); // null | {} (new) | row
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const extraKey = JSON.stringify(extraQuery);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await admin(`/${resource}`, { query: { q: search, page, limit: 25, ...filterValues, ...JSON.parse(extraKey) } });
      setData(res);
      setSelected([]);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [resource, search, page, filterValues, extraKey, toast]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  function openEditor(row) {
    setEditing(row || {});
    setForm(row ? { ...row } : { ...defaults });
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = Object.fromEntries(fields.filter((f) => !f.section).map((f) => [f.name, form[f.name] ?? (f.type === 'bool' ? 0 : '')]));
      if (editing.id) await admin(`/${resource}/${editing.id}`, { method: 'PUT', body });
      else await admin(`/${resource}`, { method: 'POST', body });
      toast(`${singular} ${editing.id ? 'updated' : 'created'}`);
      setEditing(null);
      onSaved?.();
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(row) {
    if (!confirm(`Delete this ${singular.toLowerCase()}? This cannot be undone.`)) return;
    try {
      await admin(`/${resource}/${row.id}`, { method: 'DELETE' });
      toast(`${singular} deleted`);
      onSaved?.();
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function bulk(action) {
    if (action === 'delete' && !confirm(`Delete ${selected.length} item(s)? This cannot be undone.`)) return;
    try {
      await admin(`/${resource}/bulk`, { method: 'POST', body: { ids: selected, action } });
      toast(`Done – ${selected.length} item(s) updated`);
      onSaved?.();
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  const pages = Math.max(1, Math.ceil(data.total / data.limit));
  const allSelected = data.items.length > 0 && selected.length === data.items.length;

  return (
    <div className="panel">
      <div className="toolbar">
        <input className="search" type="search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        {filters.map((f) => (
          <select
            key={f.name}
            value={filterValues[f.name] ?? ''}
            onChange={(e) => {
              setFilterValues({ ...filterValues, [f.name]: e.target.value });
              setPage(1);
            }}
            aria-label={f.label}
          >
            <option value="">{f.label}: all</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ))}
        <div className="toolbar__right">
          {toolbarExtra?.({ reload: load, filters: filterValues, search })}
          {canCreate && (
            <button className="btn btn--primary" onClick={() => openEditor(null)}>+ Add {singular.toLowerCase()}</button>
          )}
        </div>
      </div>

      {selected.length > 0 && bulkActions.length > 0 && (
        <div className="bulkbar">
          <strong>{selected.length} selected</strong>
          {bulkActions.map(([action, label]) => (
            <button key={action} className={`btn btn--sm ${action === 'delete' ? 'btn--danger' : 'btn--ghost'}`} onClick={() => bulk(action)}>
              {label}
            </button>
          ))}
          <button className="link" onClick={() => setSelected([])}>Clear</button>
        </div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {bulkActions.length > 0 && (
                <th className="cell-check">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? [] : data.items.map((r) => r.id))}
                  />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} className={c.className}>{c.label}</th>
              ))}
              {(canEdit || bulkActions.some(([a]) => a === 'delete')) && <th className="cell-actions" />}
            </tr>
          </thead>
          <tbody>
            {data.items.map((row) => (
              <tr key={row.id} className={selected.includes(row.id) ? 'selected' : ''}>
                {bulkActions.length > 0 && (
                  <td className="cell-check">
                    <input
                      type="checkbox"
                      aria-label="Select row"
                      checked={selected.includes(row.id)}
                      onChange={() => setSelected(selected.includes(row.id) ? selected.filter((x) => x !== row.id) : [...selected, row.id])}
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.key} className={c.className}>{c.render ? c.render(row) : row[c.key] ?? '—'}</td>
                ))}
                {(canEdit || bulkActions.some(([a]) => a === 'delete')) && (
                  <td className="cell-actions">
                    {canEdit && <button className="btn btn--ghost btn--sm" onClick={() => openEditor(row)}>Edit</button>}
                    <button className="icon-btn icon-btn--danger" onClick={() => remove(row)} aria-label="Delete" title="Delete">🗑</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && data.items.length === 0 && <div className="empty">Nothing here yet.</div>}
        {loading && <div className="loading-bar" />}
      </div>

      <div className="pager">
        <span className="muted">{data.total} total</span>
        <div>
          <button className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span className="muted"> Page {page} / {pages} </span>
          <button className="btn btn--ghost btn--sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      </div>

      {editing && (
        <Modal
          title={editing.id ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`}
          onClose={() => setEditing(null)}
          wide
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn--primary" form="resource-form" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </>
          }
        >
          <form id="resource-form" className="form-grid" onSubmit={save}>
            {fields.map((f) =>
              f.section ? (
                <h3 key={f.name} className="form-section">{f.section}</h3>
              ) : (
                <FormField key={f.name} field={f} value={form[f.name]} onChange={(v) => setForm((s) => ({ ...s, [f.name]: v }))} />
              ),
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function ActiveBadge({ value }) {
  return value ? <Badge tone="ok">Active</Badge> : <Badge>Hidden</Badge>;
}
