const API_URL = process.env.API_URL || 'http://localhost:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Affiliate links stay on our own domain: /go/coupon/12 → API tracks the click and redirects to the merchant.
      { source: '/go/:type/:id', destination: `${API_URL}/go/:type/:id` },
      // Browser-side calls (newsletter form) go through the website domain.
      { source: '/api/public/:path*', destination: `${API_URL}/api/public/:path*` },
    ];
  },
  async headers() {
    return [{ source: '/go/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }];
  },
};

export default nextConfig;
