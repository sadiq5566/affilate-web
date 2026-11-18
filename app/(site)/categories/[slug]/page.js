import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, getRegion, monthYear } from '@/lib/server';
import { CouponList, ProductGrid, StoreGrid } from '@/components/Grids';
import Cover from '@/components/Cover';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await api(`/categories/${slug}`);
  if (!data) return { title: 'Category not found' };
  return {
    title: `${data.category.name} Discount Codes & Deals – ${monthYear()}`,
    description: data.category.description || `The best ${data.category.name.toLowerCase()} discount codes and deals.`,
    alternates: { canonical: `/categories/${slug}` },
  };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const region = await getRegion();
  const data = await api(`/categories/${slug}`, { country: region });
  if (!data) notFound();
  const { category, coupons, products, stores } = data;
  return (
    <div className="container page">
      <nav className="crumbs small"><Link href="/">Home</Link> / <Link href="/categories">Categories</Link> / {category.name}</nav>
      <header className="banner banner--short">
        <Cover src={category.image_url} seed={category.slug} emoji={category.icon || '🛍️'} loading="eager" />
        <div className="banner__text">
          <span className="banner__chip">{category.icon} Category</span>
          <h1>{category.name} discount codes</h1>
          {category.description && <p>{category.description}</p>}
        </div>
      </header>
      {stores.length > 0 && (
        <section className="section">
          <h2>Stores</h2>
          <StoreGrid stores={stores} />
        </section>
      )}
      <section className="section">
        <h2>Coupons</h2>
        <CouponList coupons={coupons} region={region} />
      </section>
      {products.length > 0 && (
        <section className="section">
          <h2>Product deals</h2>
          <ProductGrid products={products} region={region} />
        </section>
      )}
    </div>
  );
}
