import ResourcePage, { Badge } from '../components/ResourcePage.jsx';
import { useOptions } from '../components/useOptions.js';
import { date } from '../format.js';

export default function Clicks() {
  const o = useOptions();
  const columns = [
    { key: 'created_at', label: 'Time', render: (r) => date(r.created_at, true) },
    { key: 'item_title', label: 'Clicked', render: (r) => <><Badge>{r.item_type}</Badge> {r.item_title || `#${r.item_id}`}</> },
    { key: 'store_name', label: 'Store' },
    { key: 'country', label: 'Region' },
    { key: 'page', label: 'Page', render: (r) => <span className="small muted">{r.page || '—'}</span> },
    { key: 'click_id', label: 'Click ID', render: (r) => <code className="small">{r.click_id}</code> },
    { key: 'converted', label: 'Converted', render: (r) => (r.converted ? <Badge tone="ok">✓ Sale</Badge> : '—') },
  ];
  return (
    <>
      <p className="page-intro">
        Every click on an affiliate link is logged with a unique <strong>Click ID</strong>. It is passed to the network as a
        sub-id, so each sale can be traced back to the exact coupon or product. IPs are stored only as a salted hash.
      </p>
      <ResourcePage
        resource="clicks"
        singular="Click"
        columns={columns}
        canCreate={false}
        canEdit={false}
        bulkActions={[['delete', 'Delete']]}
        filters={[
          { name: 'store_id', label: 'Store', options: o.storeOptions },
          { name: 'item_type', label: 'Type', options: ['coupon', 'product', 'store'].map((v) => ({ value: v, label: v })) },
          { name: 'country', label: 'Region', options: o.regionOptions.filter((r) => r.value !== 'ALL') },
        ]}
      />
    </>
  );
}
