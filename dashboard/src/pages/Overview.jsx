import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { admin } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import { StatusBadge } from './Conversions.jsx';
import { daysAgo, isoDay, money, num, pctChange } from '../format.js';

const PRESETS = [
  ['7d', 'Last 7 days', 6],
  ['30d', 'Last 30 days', 29],
  ['90d', 'Last 90 days', 89],
  ['365d', 'Last 12 months', 364],
];

const SERIES = '#2a78d6';
const GRID = '#e8eaee';
const AXIS = { fontSize: 12, fill: '#64748b' };

function Trend({ curr, prev, invert }) {
  const change = pctChange(curr, prev);
  if (change == null) return <span className="trend trend--up">new</span>;
  if (Math.abs(change) < 0.5) return <span className="trend">→ 0%</span>;
  const up = change > 0;
  return (
    <span className={`trend ${up !== Boolean(invert) ? 'trend--up' : 'trend--down'}`}>
      {up ? '▲' : '▼'} {Math.abs(change).toFixed(0)}%
    </span>
  );
}

function Kpi({ label, value, curr, prev, hint }) {
  return (
    <div className="kpi">
      <span className="kpi__label">{label}</span>
      <strong className="kpi__value">{value}</strong>
      <span className="kpi__foot">
        {prev !== undefined && <Trend curr={curr} prev={prev} />} <span className="muted">{hint || 'vs previous period'}</span>
      </span>
    </div>
  );
}

function ChartTooltip({ active, payload, label, format }) {
  if (!active || !payload?.length) return null;
  const d = new Date(`${label}T00:00:00`);
  return (
    <div className="chart-tip">
      <span className="muted small">{d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
      <strong>{format(payload[0].value)}</strong>
      {payload[0].payload.conversions !== undefined && payload[0].dataKey === 'commission' && (
        <span className="small muted">{payload[0].payload.conversions} conversions</span>
      )}
    </div>
  );
}

const shortDate = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function MeterRow({ value, max }) {
  return (
    <span className="meter" aria-hidden="true">
      <span style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} />
    </span>
  );
}

export default function Overview() {
  const toast = useToast();
  const [preset, setPreset] = useState('30d');
  const [range, setRange] = useState({ from: daysAgo(29), to: isoDay(new Date()) });
  const [data, setData] = useState(null);

  useEffect(() => {
    admin('/analytics/overview', { query: range }).then(setData).catch((e) => toast(e.message, 'error'));
  }, [range, toast]);

  function choose(key, days) {
    setPreset(key);
    setRange({ from: daysAgo(days), to: isoDay(new Date()) });
  }

  if (!data) return <div className="panel">Loading analytics…</div>;
  const { kpis, previous, currency } = data;
  const m = (n) => money(n, currency);
  const maxStore = Math.max(0, ...data.top_stores.map((s) => s.commission));
  const maxCountry = Math.max(0, ...data.countries.map((c) => c.clicks));
  const earned = kpis.pending + kpis.approved + kpis.paid;

  return (
    <div className="overview">
      <div className="filters-row">
        <div className="seg">
          {PRESETS.map(([key, label, days]) => (
            <button key={key} className={preset === key ? 'active' : ''} onClick={() => choose(key, days)}>{label}</button>
          ))}
        </div>
        <div className="range">
          <input type="date" value={range.from} max={range.to} onChange={(e) => { setPreset(''); setRange({ ...range, from: e.target.value }); }} aria-label="From" />
          <span>→</span>
          <input type="date" value={range.to} min={range.from} onChange={(e) => { setPreset(''); setRange({ ...range, to: e.target.value }); }} aria-label="To" />
        </div>
      </div>

      <div className="kpis">
        <Kpi label="Commission earned" value={m(kpis.commission)} curr={kpis.commission} prev={previous.commission} />
        <Kpi label="Sales generated" value={m(kpis.sales)} curr={kpis.sales} prev={previous.sales} />
        <Kpi label="Conversions" value={num(kpis.conversions)} curr={kpis.conversions} prev={previous.conversions} />
        <Kpi label="Clicks" value={num(kpis.clicks)} curr={kpis.clicks} prev={previous.clicks} />
        <Kpi label="Conversion rate" value={`${kpis.conversion_rate}%`} hint="conversions ÷ clicks" />
        <Kpi label="EPC" value={m(kpis.epc)} hint="earnings per click" />
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel__head">
            <h2>Commission per day</h2>
            <span className="muted small">{currency}, excluding rejected</span>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillCommission" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={SERIES} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => money(v, currency).replace(/\.00$/, '')} />
                <Tooltip content={<ChartTooltip format={m} />} cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }} />
                <Area type="monotone" dataKey="commission" stroke={SERIES} strokeWidth={2} fill="url(#fillCommission)" activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>Clicks per day</h2>
            <span className="muted small">outbound affiliate clicks</span>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                <Tooltip content={<ChartTooltip format={(v) => `${num(v)} clicks`} />} cursor={{ fill: 'rgb(42 120 214 / 0.08)' }} />
                <Bar dataKey="clicks" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2>Earnings by status</h2>
          <Link to="/conversions" className="small">Manage sales →</Link>
        </div>
        <div className="status-tiles">
          {['pending', 'approved', 'paid', 'rejected'].map((st) => (
            <div key={st} className={`status-tile status-tile--${st}`}>
              <StatusBadge status={st} />
              <strong>{m(kpis[st])}</strong>
              <span className="muted small">{num(data.status_counts[st])} conversions</span>
            </div>
          ))}
        </div>
        {earned > 0 && (
          <div className="stackbar" role="img" aria-label={`Pending ${m(kpis.pending)}, approved ${m(kpis.approved)}, paid ${m(kpis.paid)}`}>
            {['pending', 'approved', 'paid'].map((st) =>
              kpis[st] > 0 ? (
                <span key={st} className={`stackbar__seg stackbar__seg--${st}`} style={{ flexGrow: kpis[st] }} title={`${st}: ${m(kpis[st])}`} />
              ) : null,
            )}
          </div>
        )}
        <p className="small muted">
          Pending = waiting for the network to validate · Approved = confirmed, awaiting payout · Paid = received in your bank.
        </p>
      </section>

      <div className="grid-2">
        <section className="panel">
          <div className="panel__head"><h2>Top stores</h2><Link to="/stores" className="small">All stores →</Link></div>
          <table className="table table--compact">
            <thead>
              <tr><th>Store</th><th className="num">Clicks</th><th className="num">Sales</th><th className="num">Commission</th><th className="cell-meter" /></tr>
            </thead>
            <tbody>
              {data.top_stores.map((s) => (
                <tr key={s.store_id ?? 'none'}>
                  <td><strong>{s.name}</strong></td>
                  <td className="num">{num(s.clicks)}</td>
                  <td className="num">{num(s.conversions)}</td>
                  <td className="num"><strong>{m(s.commission)}</strong></td>
                  <td className="cell-meter"><MeterRow value={s.commission} max={maxStore} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.top_stores.length && <div className="empty">No activity in this period.</div>}
        </section>

        <section className="panel">
          <div className="panel__head"><h2>By region</h2></div>
          <table className="table table--compact">
            <thead>
              <tr><th>Region</th><th className="num">Clicks</th><th className="num">Sales</th><th className="num">Commission</th><th className="cell-meter" /></tr>
            </thead>
            <tbody>
              {data.countries.map((c) => (
                <tr key={c.country}>
                  <td><strong>{{ UK: '🇬🇧 UK', FR: '🇫🇷 France', IT: '🇮🇹 Italy', '—': 'Unknown' }[c.country] || c.country}</strong></td>
                  <td className="num">{num(c.clicks)}</td>
                  <td className="num">{num(c.conversions)}</td>
                  <td className="num"><strong>{m(c.commission)}</strong></td>
                  <td className="cell-meter"><MeterRow value={c.clicks} max={maxCountry} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.countries.length && <div className="empty">No activity in this period.</div>}

          <div className="panel__head panel__head--spaced"><h2>Catalog</h2></div>
          <div className="catalog">
            <Link to="/stores"><strong>{data.catalog.stores}</strong> stores</Link>
            <Link to="/coupons"><strong>{data.catalog.coupons}</strong> live coupons</Link>
            <Link to="/products"><strong>{data.catalog.products}</strong> products</Link>
            <Link to="/subscribers"><strong>{data.catalog.subscribers}</strong> subscribers</Link>
          </div>
          {data.catalog.expiring_soon > 0 && (
            <div className="alert alert--warn">⚠ {data.catalog.expiring_soon} coupon(s) expire in the next 7 days. <Link to="/coupons">Review →</Link></div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel__head"><h2>Most clicked offers</h2><Link to="/clicks" className="small">Click log →</Link></div>
        <table className="table table--compact">
          <thead><tr><th>Offer</th><th>Type</th><th>Store</th><th className="num">Clicks</th></tr></thead>
          <tbody>
            {data.top_items.map((it) => (
              <tr key={`${it.item_type}-${it.item_id}`}>
                <td>{it.title || `#${it.item_id} (deleted)`}</td>
                <td><span className="badge badge--neutral">{it.item_type}</span></td>
                <td>{it.store_name || '—'}</td>
                <td className="num"><strong>{num(it.clicks)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.top_items.length && <div className="empty">No clicks in this period.</div>}
      </section>
    </div>
  );
}
