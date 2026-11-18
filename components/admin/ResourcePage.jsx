import { useCallback, useEffect, useState } from 'react';
import { admin, download } from './api.js';
import Modal from './Modal.jsx';
import ImportModal from './ImportModal.jsx';
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
 *  filters: [{ name, label, options: [{value,label}] }]   (dropdown filters, sent as ?name=value)
 *  ranges:  [{ name, label, step }]                       (min/max number filters, sent as ?name_min / ?name_max)
 *  sorts:   [{ value, label }]                            (sortable columns, sent as ?sort=value&dir=asc|desc)
 * Every list also gets: created/date range, page size, filter chips, CSV export (respects filters) and CSV import.
 */
const PAGE_SIZES = [25, 50, 100, 200];
const storeKey = (resource) => `admin:filters:${resource}`;

function loadSaved(resource) {
  try {
    return JSON.parse(localStorage.getItem(storeKey(resource)) || '{}');
  } catch {
    return {};
  }
}
export default function ResourcePage({
  resource,
  singular,
  columns,
  fields = [],
  filters = [],
  ranges = [],
  sorts = [],
  importHint = 'Upload a CSV file. The first row must contain column names (use the template to see them).',
  importWithNetwork = false,
  canImport = true,
  exportable = true,
  dateLabel = 'Created',
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
  const [filterValues, setFilterValues] = useState(() => loadSaved(resource).filters || {});
  const [limit, setLimit] = useState(() => loadSaved(resource).limit || 25);
  const [showFilters, setShowFilters] = useState(() => Object.keys(loadSaved(resource).filters || {}).length > 0);
  const [importing, setImporting] = useState(false);
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

  useEffect(() => {
    try {
      localStorage.setItem(storeKey(resource), JSON.stringify({ filters: filterValues, limit }));
    } catch {
      /* storage unavailable – filters just won't be remembered */
    }
  }, [resource, filterValues, limit]);

  const setFilter = (name, value) => {
    setFilterValues((cur) => {
      const next = { ...cur };
      if (value === '' || value == null) delete next[name];
      else next[name] = value;
      return next;
    });
    setPage(1);
  };
  const clearFilters = () => {
    setFilterValues({});
    setQ('');
    setPage(1);
  };

  // Chips describing every active filter, each removable on its own.
  const chips = [];
  for (const f of filters) {
    const v = filterValues[f.name];
    if (v === undefined) continue;
    chips.push({ keys: [f.name], text: `${f.label}: ${f.options.find((o) => String(o.value) === String(v))?.label ?? v}` });
  }
  for (const r of ranges) {
    const lo = filterValues[`${r.name}_min`];
    const hi = filterValues[`${r.name}_max`];
    if (lo !== undefined || hi !== undefined) {
      chips.push({ keys: [`${r.name}_min`, `${r.name}_max`], text: `${r.label}: ${lo ?? '…'} – ${hi ?? '…'}` });
    }
  }
  if (filterValues.from || filterValues.to) {
    chips.push({ keys: ['from', 'to'], text: `${dateLabel}: ${filterValues.from || '…'} → ${filterValues.to || '…'}` });
  }
  if (search) chips.push({ keys: [], text: `Search: “${search}”`, clearSearch: true });
  const activeCount = chips.length;

  const extraKey = JSON.stringify(extraQuery);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await admin(`/${resource}`, { query: { q: search, page, limit, ...filterValues, ...JSON.parse(extraKey) } });
      setData(res);
      setSelected([]);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [resource, search, page, limit, filterValues, extraKey, toast]);

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
        <button className={`btn btn--ghost ${showFilters ? 'btn--on' : ''}`} onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}>
          ⚙ Filters{activeCount ? <span className="count">{activeCount}</span> : null}
        </button>
        {sorts.length > 0 && (
          <>
            <select
              value={filterValues.sort ?? ''}
              onChange={(e) => setFilter('sort', e.target.value)}
              aria-label="Sort by"
            >
              <option value="">Sort: default</option>
              {sorts.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {filterValues.sort && (
              <button
                className="btn btn--ghost"
                onClick={() => setFilter('dir', filterValues.dir === 'asc' ? '' : 'asc')}
                title="Toggle sort direction"
              >
                {filterValues.dir === 'asc' ? '↑ Asc' : '↓ Desc'}
              </button>
            )}
          </>
        )}
        <div className="toolbar__right">
          {toolbarExtra?.({ reload: load, filters: filterValues, search })}
          {exportable && (
            <button
              className="btn btn--ghost"
              onClick={() => download(`/${resource}/export`, `${resource}.csv`, { q: search, ...filterValues, ...JSON.parse(extraKey) }).catch((e) => toast(e.message, 'error'))}
            >
              ⬇ Export CSV
            </button>
          )}
          {canImport && <button className="btn btn--ghost" onClick={() => setImporting(true)}>⬆ Import CSV</button>}
          {canCreate && (
            <button className="btn btn--primary" onClick={() => openEditor(null)}>+ Add {singular.toLowerCase()}</button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="filterpanel">
          {filters.map((f) => (
            <label key={f.name} className="filter">
              <span>{f.label}</span>
              <select value={filterValues[f.name] ?? ''} onChange={(e) => setFilter(f.name, e.target.value)}>
                <option value="">All</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          ))}
          {ranges.map((r) => (
            <div key={r.name} className="filter">
              <span>{r.label}</span>
              <div className="filter__pair">
                <input type="number" step={r.step || 'any'} placeholder="Min" value={filterValues[`${r.name}_min`] ?? ''} onChange={(e) => setFilter(`${r.name}_min`, e.target.value)} aria-label={`${r.label} min`} />
                <input type="number" step={r.step || 'any'} placeholder="Max" value={filterValues[`${r.name}_max`] ?? ''} onChange={(e) => setFilter(`${r.name}_max`, e.target.value)} aria-label={`${r.label} max`} />
              </div>
            </div>
          ))}
          <div className="filter">
            <span>{dateLabel} between</span>
            <div className="filter__pair">
              <input type="date" value={filterValues.from ?? ''} onChange={(e) => setFilter('from', e.target.value)} aria-label="From date" />
              <input type="date" value={filterValues.to ?? ''} onChange={(e) => setFilter('to', e.target.value)} aria-label="To date" />
            </div>
          </div>
        </div>
      )}

      {activeCount > 0 && (
        <div className="chips">
          {chips.map((c) => (
            <button
              key={c.text}
              className="chip"
              onClick={() => {
                if (c.clearSearch) setQ('');
                else {
                  setFilterValues((cur) => Object.fromEntries(Object.entries(cur).filter(([k]) => !c.keys.includes(k))));
                  setPage(1);
                }
              }}
              title="Remove filter"
            >
              {c.text} ×
            </button>
          ))}
          <button className="link" onClick={clearFilters}>Clear all</button>
        </div>
      )}

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
        <table className="table table--cards">
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
                {columns.map((c, i) => (
                  <td key={c.key} data-label={c.label} className={`${c.className || ''} ${i === 0 ? 'cell-title' : ''}`.trim()}>
                    {c.render ? c.render(row) : row[c.key] ?? '—'}
                  </td>
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
        <span className="muted">
          {data.total} {activeCount ? 'matching' : 'total'} ·{' '}
          <select className="pagesize" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} aria-label="Rows per page">
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        </span>
        <div>
          <button className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span className="muted"> Page {page} / {pages} </span>
          <button className="btn btn--ghost btn--sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      </div>

      {importing && (
        <ImportModal
          resource={resource}
          title={`Import ${singular.toLowerCase()}s from CSV`}
          hint={importHint}
          withNetwork={importWithNetwork}
          onClose={() => setImporting(false)}
          onDone={() => {
            onSaved?.();
            load();
          }}
        />
      )}

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
