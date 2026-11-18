import LegalPage from '@/components/LegalPage';
import { getSettings } from '@/lib/server';

export const metadata = { title: 'Affiliate disclosure' };

export default async function DisclosurePage() {
  const s = await getSettings();
  return (
    <LegalPage title="Affiliate disclosure" updated="October 2026">
      <p>
        {s.site_name} is supported by its readers. Many links on this website are <strong>affiliate links</strong>. If you
        click one and make a purchase or sign up, we may receive a commission from the retailer or from an affiliate
        network (for example Awin, CJ, Impact, Rakuten or Tradedoubler).
      </p>
      <ul>
        <li>You never pay more because you used our link.</li>
        <li>Commissions do not decide which offers we publish; we list the best deals we can find.</li>
        <li>Affiliate links are marked with <code>rel=&quot;sponsored&quot;</code> for search engines.</li>
      </ul>
      <p>
        This disclosure is made in line with the UK CMA and ASA guidance on online endorsements and with the EU Unfair
        Commercial Practices Directive.
      </p>
    </LegalPage>
  );
}
