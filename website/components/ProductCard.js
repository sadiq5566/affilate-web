import Link from 'next/link';
import { goUrl } from '@/lib/regions';
import { money } from '@/lib/format';

export default function ProductCard({ product, region }) {
  return (
    <article className="product">
      <Link href={`/deals/${product.slug}`} className="product__img">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.title} loading="lazy" />
        ) : (
          <span className="product__noimg">No image</span>
        )}
        {product.discount_pct ? <span className="product__off">-{product.discount_pct}%</span> : null}
      </Link>
      <div className="product__body">
        <Link href={`/stores/${product.store_slug}`} className="product__store">{product.store_name}</Link>
        <h3 className="product__title">
          <Link href={`/deals/${product.slug}`}>{product.title}</Link>
        </h3>
        <div className="product__price">
          <strong>{money(product.price, product.currency)}</strong>
          {product.old_price > product.price && <s>{money(product.old_price, product.currency)}</s>}
        </div>
        <a className="btn btn--primary btn--block" href={goUrl('product', product.id, region)} target="_blank" rel="sponsored nofollow noopener">
          Get Deal
        </a>
      </div>
    </article>
  );
}
