import LegalPage from '@/components/LegalPage';
import { getSettings } from '@/lib/server';

export const metadata = { title: 'Terms of use' };

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <LegalPage title="Terms of use" updated="October 2026">
      <p className="note">Template text – review before launch.</p>
      <p>
        By using {s.site_name} you agree to these terms. We try hard to keep every code and price accurate, but offers
        are set by the retailers and can change or end without notice. Always check the final price at checkout.
      </p>
      <h2>No warranty</h2>
      <p>Offers are provided “as is”. We are not responsible for products or services bought from third-party shops.</p>
      <h2>Intellectual property</h2>
      <p>Store names and logos belong to their owners and are used only to identify their offers.</p>
    </LegalPage>
  );
}
