import ResourcePage, { Badge } from '../components/ResourcePage.jsx';
import { download } from '../api.js';
import { date } from '../format.js';

export default function Subscribers() {
  const columns = [
    { key: 'email', label: 'Email', render: (r) => <strong>{r.email}</strong> },
    { key: 'country', label: 'Region', render: (r) => r.country || '—' },
    { key: 'consent', label: 'Consent', render: (r) => (r.consent ? <Badge tone="ok">✓ Given</Badge> : <Badge tone="danger">No</Badge>) },
    { key: 'created_at', label: 'Subscribed', render: (r) => date(r.created_at, true) },
  ];
  return (
    <>
      <p className="page-intro">Newsletter sign-ups from the website (with GDPR consent). Export them to Mailchimp, Brevo, etc.</p>
      <ResourcePage
        resource="subscribers"
        singular="Subscriber"
        columns={columns}
        canCreate={false}
        canEdit={false}
        bulkActions={[['delete', 'Delete']]}
        filters={[{ name: 'country', label: 'Region', options: ['UK', 'FR', 'IT'].map((v) => ({ value: v, label: v })) }]}
        toolbarExtra={() => (
          <button className="btn btn--ghost" onClick={() => download('/subscribers/export', 'subscribers.csv')}>Export CSV</button>
        )}
      />
    </>
  );
}
