import Link from 'next/link';
import StoreLogo from './StoreLogo';

export default function StoreCard({ store }) {
  return (
    <Link href={`/stores/${store.slug}`} className="store-card">
      <StoreLogo name={store.name} src={store.logo_url} size={64} />
      <strong>{store.name}</strong>
      <span className="muted small">
        {store.coupon_count} {store.coupon_count === 1 ? 'offer' : 'offers'}
      </span>
    </Link>
  );
}
