import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container page center">
      <h1>Page not found</h1>
      <p className="lead">This offer may have expired or the page has moved.</p>
      <Link className="btn btn--primary" href="/coupons">Browse all coupons</Link>
    </div>
  );
}
