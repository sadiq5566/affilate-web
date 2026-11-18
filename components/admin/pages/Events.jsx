import ResourcePage, { ActiveBadge, Badge } from '../ResourcePage.jsx';
import { ACTIVE_OPTIONS, refreshOptions, sortOptions } from '../useOptions.js';
import { date } from '../format.js';

const PHASE_TONE = { live: 'ok', upcoming: 'info', ended: 'danger' };

export default function Events() {
  const fields = [
    { name: 'name', label: 'Event name', required: true, full: true, placeholder: 'Black Friday 2026' },
    { name: 'starts_on', label: 'Starts', type: 'date' },
    { name: 'ends_on', label: 'Ends', type: 'date', help: 'The event is hidden from the website after this date' },
    { name: 'image_url', label: 'Image', type: 'image', full: true },
    { name: 'description', label: 'Description (SEO text on the event page)', type: 'textarea', full: true },
    { name: 'slug', label: 'URL slug', help: 'Auto-generated if empty' },
    { name: 'is_active', label: 'Visible on website', type: 'bool' },
  ];
  const columns = [
    { key: 'name', label: 'Event', render: (r) => <strong>{r.name}</strong> },
    { key: 'starts_on', label: 'Dates', render: (r) => (r.starts_on || r.ends_on ? `${r.starts_on ? date(r.starts_on) : '…'} → ${r.ends_on ? date(r.ends_on) : '…'}` : '—') },
    { key: 'phase', label: 'Phase', render: (r) => <Badge tone={PHASE_TONE[r.phase]}>{r.phase}</Badge> },
    { key: 'coupon_count', label: 'Coupons', className: 'num' },
    { key: 'is_active', label: 'Status', render: (r) => <ActiveBadge value={r.is_active} /> },
  ];
  return (
    <>
      <p className="page-intro">
        Seasonal shopping events (Black Friday, Cyber Monday, Singles&apos; Day…). Assign coupons to an event on the Coupons page and they
        appear on the event page and on the homepage.
      </p>
      <ResourcePage
        resource="events"
        singular="Event"
        columns={columns}
        fields={fields}
        defaults={{ is_active: 1 }}
        onSaved={refreshOptions}
        filters={[
          { name: 'phase', label: 'Phase', options: ['upcoming', 'live', 'ended'].map((v) => ({ value: v, label: v })) },
          { name: 'is_active', label: 'Visibility', options: ACTIVE_OPTIONS },
        ]}
        sorts={sortOptions(['starts_on', 'Start date'], ['ends_on', 'End date'], ['name', 'Name'], ['coupon_count', 'Coupons'])}
        dateLabel="Created"
        importHint="Columns: name, slug, description, image_url, starts_on, ends_on (YYYY-MM-DD), is_active."
      />
    </>
  );
}
