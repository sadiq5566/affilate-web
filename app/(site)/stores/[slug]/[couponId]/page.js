import StoreView, { generateStoreMetadata } from '@/components/StoreView';

// Shareable coupon URL: /stores/{store}/{couponId} shows the store page and opens that coupon's code pop-up.
export async function generateMetadata({ params }) {
  const { slug } = await params;
  return generateStoreMetadata(slug); // canonical points at the store page
}

export default async function CouponPage({ params }) {
  const { slug, couponId } = await params;
  return <StoreView slug={slug} couponId={Number(couponId) || undefined} />;
}
