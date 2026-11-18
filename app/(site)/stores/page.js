import Link from 'next/link';
import { api, getRegion } from '@/lib/server';
import StoreLogo from '@/components/StoreLogo';

export const metadata = {
  title: 'All stores A–Z',
  description: 'Browse every store with discount codes and deals, from A to Z.',
};

export default async function StoresPage() {
  const region = await getRegion();
  const stores = await api('/stores', { country: region });
  const groups = {};
  for (const s of stores) {
    const letter = /[a-z]/i.test(s.name[0]) ? s.name[0].toUpperCase() : '#';
    (groups[letter] ||= []).push(s);
  }
  const letters = Object.keys(groups).sort();

  return (
    <div className="container page">
      <h1>All stores A–Z</h1>
      <p className="lead">{stores.length} stores with active discount codes and deals.</p>
      <nav className="az" aria-label="Jump to letter">
        {letters.map((l) => (
          <a key={l} href={`#letter-${l}`}>{l}</a>
        ))}
      </nav>
      {letters.map((l) => (
        <section key={l} id={`letter-${l}`} className="az__group">
          <h2>{l}</h2>
          <ul className="az__list">
            {groups[l].map((s) => (
              <li key={s.id}>
                <Link href={`/stores/${s.slug}`}>
                  <StoreLogo name={s.name} src={s.logo_url} size={32} />
                  <span>{s.name}</span>
                  <span className="muted small">{s.coupon_count} offers</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
