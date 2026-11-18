import LegalPage from '@/components/LegalPage';
import { getSettings } from '@/lib/server';

export const metadata = { title: 'Privacy & cookie policy' };

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <LegalPage title="Privacy & cookie policy" updated="October 2026">
      <p className="note">
        Template text – have it reviewed for your business before launch (UK GDPR, EU GDPR and ePrivacy rules apply).
      </p>
      <h2>Who we are</h2>
      <p>{s.site_name} is the data controller for personal data collected on this website. Contact: {s.contact_email || 'see our contact page'}.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Newsletter:</strong> your email address and country, only if you subscribe and give consent.</li>
        <li><strong>Click data:</strong> when you click an offer we record the offer, time, country, page and a one-way hash of your IP address, so we can match commissions. We do not store your raw IP.</li>
        <li><strong>Cookies:</strong> an essential cookie remembers your country; a consent cookie remembers your cookie choice. Analytics cookies are only used if you accept them.</li>
      </ul>
      <h2>Third-party cookies</h2>
      <p>
        When you leave our site through an affiliate link, the retailer and the affiliate network may set their own
        cookies to record that you came from us. Their privacy policies apply.
      </p>
      <h2>Your rights</h2>
      <p>
        You can ask to access, correct or delete your data, withdraw consent, or complain to the ICO (UK), CNIL (France)
        or Garante Privacy (Italy).
      </p>
      <h2>Retention</h2>
      <p>Newsletter data is kept until you unsubscribe. Click data is kept for up to 24 months for accounting purposes.</p>
    </LegalPage>
  );
}
