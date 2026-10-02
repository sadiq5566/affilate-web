import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, getRegion, SITE_URL } from '@/lib/server';
import { goUrl } from '@/lib/regions';
import { money } from '@/lib/format';
import { CouponList, ProductGrid } from '@/components/Grids';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await api(`/products/${slug}`);
  if (!data) return { title: 'Deal not found' };
  const p = data.product;
  return {
    title: `${p.title} – ${money(p.price, p.currency)} at ${p.store_name}`,
    description: p.description?.slice(0, 160),
    alternates: { canonical: `/deals/${slug}` },
    openGraph: { images: p.image_url ? [p.image_url] : [] },
  };
}

export default async function DealPage({ params }) {
  const { slug } = await params;
  const region = await getRegion();
  const data = await api(`/products/${slug}`, { country: region });
  if (!data) notFound();
  const { product: p, coupons, related } = data;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    image: p.image_url || undefined,
    description: p.description || undefined,
    brand: { '@type': 'Brand', name: p.store_name },
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: p.currency,
      url: `${SITE_URL}/deals/${p.slug}`,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: p.store_name },
    },
  };

  return (
    <div className="container page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="crumbs small">
        <Link href="/">Home</Link> / <Link href="/deals">Deals</Link>
        {p.category_slug && <> / <Link href={`/categories/${p.category_slug}`}>{p.category_name}</Link></>}
      </nav>
      <div className="deal">
        <div className="deal__img">
          {p.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_url} alt={p.title} />
          ) : (
            <span className="product__noimg">No image</span>
          )}
          {p.discount_pct ? <span className="product__off">-{p.discount_pct}%</span> : null}
        </div>
        <div className="deal__info">
          <Link href={`/stores/${p.store_slug}`} className="product__store">{p.store_name}</Link>
          <h1>{p.title}</h1>
          <div className="deal__price">
            <strong>{money(p.price, p.currency)}</strong>
            {p.old_price > p.price && (
              <>
                <s>{money(p.old_price, p.currency)}</s>
                <span className="tag tag--accent">Save {money(p.old_price - p.price, p.currency)}</span>
              </>
            )}
          </div>
          {p.description && <p>{p.description}</p>}
          <a className="btn btn--primary btn--lg" href={goUrl('product', p.id, region)} target="_blank" rel="sponsored nofollow noopener">
            Get this deal at {p.store_name} →
          </a>
          <p className="small muted">
            Prices and availability can change. We may earn a commission if you buy through this link.
          </p>
        </div>
      </div>

      {coupons.length > 0 && (
        <section className="section">
          <h2>Stack it with a {p.store_name} code</h2>
          <CouponList coupons={coupons} region={region} showStore={false} />
        </section>
      )}
      {related.length > 0 && (
        <section className="section">
          <h2>You might also like</h2>
          <ProductGrid products={related} region={region} />
        </section>
      )}
    </div>
  );
}
