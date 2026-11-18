import ResourcePage, { Badge } from '../ResourcePage.jsx';
import { YES_NO, sortOptions } from '../useOptions.js';
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
        filters={[
          { name: 'country', label: 'Region', options: ['UK', 'DE', 'FR', 'IT'].map((v) => ({ value: v, label: v })) },
          { name: 'consent', label: 'Consent given', options: YES_NO },
        ]}
        sorts={sortOptions(['created_at', 'Subscribed'], ['email', 'Email'])}
        dateLabel="Subscribed"
        importHint="Columns: email, country (UK/FR/IT), consent (1/0, default 1). Only import people who agreed to receive emails (GDPR)."
      />
    </>
  );
}
