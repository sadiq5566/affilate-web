import { useEffect, useState } from 'react';
import { admin } from '../api.js';
import { useToast } from '../components/Toast.jsx';

const NETWORK_MACROS = [
  ['Awin', 'click_id=!!!clickref!!!&order_ref=!!!transactionid!!!&sale_amount=!!!transactionamount!!!&commission=!!!commission!!!&currency=!!!currency!!!&status=!!!status!!!'],
  ['CJ', 'click_id=[sid]&order_ref=[order_id]&sale_amount=[sale_amount]&commission=[commission]&currency=[currency]&status=[status]'],
  ['Impact', 'click_id={SubId1}&order_ref={OrderId}&sale_amount={SaleAmount}&commission={Payout}&currency={Currency}&status={ActionStatus}'],
];

export default function Settings() {
  const toast = useToast();
  const [s, setS] = useState(null);
  const [pw, setPw] = useState({ current_password: '', new_password: '' });

  const load = () => admin('/settings').then(setS).catch((e) => toast(e.message, 'error'));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e) {
    e.preventDefault();
    try {
      await admin('/settings', { method: 'PUT', body: s });
      toast('Settings saved');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function regenerate() {
    if (!confirm('Generate a new postback token? You will need to update the URL in every affiliate network.')) return;
    await admin('/settings/regenerate-token', { method: 'POST' });
    load();
    toast('New token generated');
  }

  async function changePassword(e) {
    e.preventDefault();
    try {
      await admin('/password', { method: 'POST', body: pw });
      setPw({ current_password: '', new_password: '' });
      toast('Password changed');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  const copy = (text) => navigator.clipboard.writeText(text).then(() => toast('Copied'));

  if (!s) return <div className="panel">Loading…</div>;
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value });
  const base = s.postback_url.split('?')[0];

  return (
    <div className="settings">
      <form className="panel" onSubmit={save}>
        <h2>Website</h2>
        <div className="form-grid">
          <div className="field"><label>Site name</label><input value={s.site_name} onChange={set('site_name')} /></div>
          <div className="field"><label>Contact email</label><input type="email" value={s.contact_email} onChange={set('contact_email')} /></div>
          <div className="field field--full"><label>Tagline</label><input value={s.site_tagline} onChange={set('site_tagline')} /></div>
          <div className="field">
            <label>Default region</label>
            <select value={s.default_region} onChange={set('default_region')}>
              <option value="UK">UK</option><option value="FR">France</option><option value="IT">Italy</option>
            </select>
          </div>
        </div>
        <h2>Reporting currency</h2>
        <div className="form-grid">
          <div className="field">
            <label>Report totals in</label>
            <select value={s.base_currency} onChange={set('base_currency')}>
              <option value="EUR">EUR €</option><option value="GBP">GBP £</option>
            </select>
          </div>
          <div className="field">
            <label>Exchange rates (1 unit = x EUR)</label>
            <input className="mono" value={s.fx_rates} onChange={set('fx_rates')} placeholder='{"GBP": 1.17}' />
            <small>Used to add GBP and EUR earnings together on the overview.</small>
          </div>
        </div>
        <div className="form-actions"><button className="btn btn--primary">Save settings</button></div>
      </form>

      <section className="panel">
        <h2>Sale tracking (postback / S2S)</h2>
        <p className="muted">
          Paste this URL into the <em>server-to-server postback / conversion pixel</em> settings of each affiliate network.
          Replace the <code>{'{…}'}</code> placeholders with that network&apos;s macros. Sales then appear under “Sales &amp; Leads” automatically.
        </p>
        <div className="copy-row">
          <code className="mono">{s.postback_url}</code>
          <button className="btn btn--ghost btn--sm" onClick={() => copy(s.postback_url)}>Copy</button>
        </div>
        <h3>Ready-made examples</h3>
        {NETWORK_MACROS.map(([name, qs]) => {
          const url = `${base}?token=${s.postback_token}&network=${name}&${qs}`;
          return (
            <div key={name} className="copy-row">
              <strong>{name}</strong>
              <code className="mono">{url}</code>
              <button className="btn btn--ghost btn--sm" onClick={() => copy(url)}>Copy</button>
            </div>
          );
        })}
        <p className="small muted">
          Macro names differ per network and account – check your network&apos;s documentation. Networks without postbacks:
          download the transactions report and use “Import CSV”.
        </p>
        <button className="btn btn--ghost btn--sm" onClick={regenerate}>Regenerate token</button>
      </section>

      <form className="panel" onSubmit={changePassword}>
        <h2>Change password</h2>
        <div className="form-grid">
          <div className="field"><label>Current password</label><input type="password" required value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></div>
          <div className="field"><label>New password (min 8)</label><input type="password" required minLength={8} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></div>
        </div>
        <div className="form-actions"><button className="btn btn--primary">Update password</button></div>
      </form>
    </div>
  );
}
