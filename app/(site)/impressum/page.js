import LegalPage from '@/components/LegalPage';
import { getSettings } from '@/lib/server';

export const metadata = { title: 'Impressum (legal notice)' };

// Mandatory for websites targeting Germany (§ 5 DDG). Fill in the real details and have them checked before launch.
export default async function ImpressumPage() {
  const s = await getSettings();
  return (
    <LegalPage title="Impressum" updated="2026">
      <p className="note">Template text – replace the placeholders with your real company details before launch.</p>
      <h2>Information according to § 5 DDG</h2>
      <p>
        [Company / full name]<br />
        [Street and number]<br />
        [Postcode and city], [Country]
      </p>
      <h2>Contact</h2>
      <p>E-mail: {s.contact_email || '[your e-mail address]'}<br />Phone: [optional]</p>
      <h2>Responsible for content (§ 18 MStV)</h2>
      <p>[Name and address]</p>
      <h2>VAT ID</h2>
      <p>[VAT identification number, if available]</p>
      <h2>Affiliate links</h2>
      <p>
        Links marked as advertising or “sponsored” are affiliate links. If you buy through them we may receive a commission.
        The price for you does not change.
      </p>
    </LegalPage>
  );
}
