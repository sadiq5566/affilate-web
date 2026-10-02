import Link from 'next/link';

export default function Footer({ siteName, email }) {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <Link href="/" className="logo logo--light">
            <span className="logo__mark">%</span>
            {siteName}
          </Link>
          <p className="small">
            We find and verify discount codes and deals from shops across the UK, France and Italy, so you always pay less.
          </p>
        </div>
        <div>
          <h4>Explore</h4>
          <Link href="/coupons">All coupons</Link>
          <Link href="/deals">Product deals</Link>
          <Link href="/stores">Stores A–Z</Link>
          <Link href="/categories">Categories</Link>
        </div>
        <div>
          <h4>Company</h4>
          <Link href="/about">About us</Link>
          <Link href="/affiliate-disclosure">Affiliate disclosure</Link>
          <Link href="/privacy">Privacy & cookies</Link>
          <Link href="/terms">Terms of use</Link>
          {email && <a href={`mailto:${email}`}>Contact</a>}
        </div>
      </div>
      <div className="container footer__bottom small">
        <p>
          <strong>Affiliate disclosure:</strong> {siteName} is reader-supported. When you buy through links on our site we
          may earn a commission at no extra cost to you. <Link href="/affiliate-disclosure">Learn more</Link>.
        </p>
        <p>© {new Date().getFullYear()} {siteName}. All rights reserved.</p>
      </div>
    </footer>
  );
}
