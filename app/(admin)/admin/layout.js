import './admin.css';

export const metadata = {
  title: 'Affiliate Dashboard',
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.svg' },
};

// Separate root layout: the dashboard has its own <html>/<body> and styles, fully isolated from the public site.
export default function AdminLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
