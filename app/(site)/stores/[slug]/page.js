import StoreView, { generateStoreMetadata } from '@/components/StoreView';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return generateStoreMetadata(slug);
}

export default async function StorePage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  return <StoreView slug={slug} type={sp.coupon_type || sp.type || ''} />;
}
