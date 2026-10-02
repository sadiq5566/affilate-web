import Link from 'next/link';
import RegionSwitcher from './RegionSwitcher';
import MobileNav from './MobileNav';

const NAV = [
  ['/coupons', 'Coupons'],
  ['/deals', 'Deals'],
  ['/stores', 'Stores'],
  ['/categories', 'Categories'],
];

export default function Header({ siteName, region }) {
  return (
    <header className="header">
      <div className="container header__inner">
        <Link href="/" className="logo">
          <span className="logo__mark">%</span>
          {siteName}
        </Link>
        <nav className="nav" aria-label="Main">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
        <form action="/search" className="header__search" role="search">
          <input type="search" name="q" placeholder="Search stores, coupons, deals…" aria-label="Search" />
        </form>
        <RegionSwitcher region={region} />
        <MobileNav items={NAV} />
      </div>
    </header>
  );
}
