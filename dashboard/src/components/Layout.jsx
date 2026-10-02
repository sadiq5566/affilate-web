import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { SITE_URL } from '../api.js';

const NAV = [
  ['Analytics', [['/', 'Overview', '📊'], ['/conversions', 'Sales & Leads', '💶'], ['/clicks', 'Clicks', '🖱️']]],
  ['Catalog', [['/products', 'Products', '🛍️'], ['/coupons', 'Coupons', '🏷️'], ['/stores', 'Stores', '🏬'], ['/categories', 'Categories', '🗂️']]],
  ['Audience', [['/subscribers', 'Subscribers', '✉️']]],
  ['System', [['/settings', 'Settings', '⚙️']]],
];

export default function Layout({ user, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const current = NAV.flatMap(([, items]) => items).find(([p]) => p === pathname);

  return (
    <div className={`shell ${open ? 'shell--open' : ''}`}>
      <aside className="side" onClick={() => setOpen(false)}>
        <div className="side__brand">
          <span className="mark">%</span>
          <div>
            <strong>Affiliate Admin</strong>
            <span>UK · FR · IT</span>
          </div>
        </div>
        {NAV.map(([group, items]) => (
          <nav key={group} className="side__group">
            <span className="side__label">{group}</span>
            {items.map(([to, label, icon]) => (
              <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? 'active' : '')}>
                <span aria-hidden="true">{icon}</span> {label}
              </NavLink>
            ))}
          </nav>
        ))}
        <div className="side__foot">
          <a href={SITE_URL} target="_blank" rel="noreferrer">↗ Open website</a>
          <span className="small">{user.email}</span>
          <button className="link" onClick={onLogout}>Log out</button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="burger" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
          <h1>{current?.[1] || 'Dashboard'}</h1>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
