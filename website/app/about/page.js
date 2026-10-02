import LegalPage from '@/components/LegalPage';
import { getSettings } from '@/lib/server';

export const metadata = { title: 'About us' };

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <LegalPage title={`About ${s.site_name}`}>
      <p>
        {s.site_name} helps shoppers in the United Kingdom, France and Italy pay less online. Our team collects discount
        codes, vouchers and product deals from hundreds of shops, checks that they work and publishes them for free.
      </p>
      <h2>How we make money</h2>
      <p>
        We are an affiliate site. When you click a link and buy something, the shop may pay us a small commission. This
        never changes the price you pay, and it is how we keep the site free.
      </p>
      <h2>Get in touch</h2>
      <p>Are you a retailer who wants to be listed, or did a code not work? {s.contact_email ? <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a> : 'Contact us by email.'}</p>
    </LegalPage>
  );
}
