'use client';

import dynamic from 'next/dynamic';

// The dashboard is a browser-only app (hash router, localStorage token), so it is not server-rendered.
const AdminApp = dynamic(() => import('./AdminApp.jsx'), {
  ssr: false,
  loading: () => <div className="boot">Loading…</div>,
});

export default function AdminLoader() {
  return <AdminApp />;
}
