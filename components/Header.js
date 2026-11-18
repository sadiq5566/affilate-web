import Link from 'next/link';
import RegionSwitcher from './RegionSwitcher';
import MobileNav from './MobileNav';
import SearchBox from './SearchBox';

const NAV = [
  ['/coupons', 'Coupons'],
  ['/deals', 'Deals'],
  ['/stores', 'Stores'],
  ['/events', 'Events'],
  ['/blog', 'Blog'],
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
        <SearchBox region={region} />
        <RegionSwitcher region={region} />
        <MobileNav items={NAV} />
      </div>
    </header>
  );
}
