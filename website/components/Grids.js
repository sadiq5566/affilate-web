import CouponCard from './CouponCard';
import ProductCard from './ProductCard';
import StoreCard from './StoreCard';

export function CouponList({ coupons, region, showStore = true, empty = 'No offers right now – check back soon.' }) {
  if (!coupons?.length) return <p className="empty">{empty}</p>;
  return (
    <div className="coupon-list">
      {coupons.map((c) => (
        <CouponCard key={c.id} coupon={c} region={region} showStore={showStore} />
      ))}
    </div>
  );
}

export function ProductGrid({ products, region, empty = 'No deals right now – check back soon.' }) {
  if (!products?.length) return <p className="empty">{empty}</p>;
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} region={region} />
      ))}
    </div>
  );
}

export function StoreGrid({ stores }) {
  if (!stores?.length) return <p className="empty">No stores yet.</p>;
  return (
    <div className="store-grid">
      {stores.map((s) => (
        <StoreCard key={s.id} store={s} />
      ))}
    </div>
  );
}
