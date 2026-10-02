import Link from 'next/link';
import { api, getRegion } from '@/lib/server';

export const metadata = { title: 'Shop by category', description: 'Discount codes and deals by category.' };

export default async function CategoriesPage() {
  const region = await getRegion();
  const categories = await api('/categories', { country: region });
  return (
    <div className="container page">
      <h1>Shop by category</h1>
      <div className="cat-grid">
        {categories.map((c) => (
          <Link key={c.id} href={`/categories/${c.slug}`} className="cat-card">
            <span className="cat-card__icon" aria-hidden="true">{c.icon}</span>
            <strong>{c.name}</strong>
            <span className="muted small">{c.coupon_count} coupons · {c.product_count} deals</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
