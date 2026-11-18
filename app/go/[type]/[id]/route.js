import { handleOutboundClick } from '@/lib/server/tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Outbound affiliate redirect + click tracking: /go/coupon/12, /go/product/5, /go/store/3
export async function GET(request, { params }) {
  const { type, id } = await params;
  return handleOutboundClick(request, type, id);
}
