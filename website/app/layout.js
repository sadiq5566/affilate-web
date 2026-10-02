import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CookieBanner from '@/components/CookieBanner';
import { getRegion, getSettings, SITE_URL } from '@/lib/server';

export async function generateMetadata() {
  const s = await getSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${s.site_name} – ${s.site_tagline}`, template: `%s | ${s.site_name}` },
    description: s.site_tagline,
    openGraph: { siteName: s.site_name, type: 'website' },
    icons: { icon: '/favicon.svg' },
  };
}

export const viewport = { themeColor: '#0f766e' };

export default async function RootLayout({ children }) {
  const [settings, region] = await Promise.all([getSettings(), getRegion()]);
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip">Skip to content</a>
        <Header siteName={settings.site_name} region={region} />
        <main id="main">{children}</main>
        <Footer siteName={settings.site_name} email={settings.contact_email} />
        <CookieBanner />
      </body>
    </html>
  );
}
