import { handleAdmin, errorResponse } from '@/lib/server/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handler(request, { params }) {
  try {
    const { path } = await params;
    return await handleAdmin(request, path);
  } catch (err) {
    return errorResponse(err);
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
