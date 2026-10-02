import Link from 'next/link';

export default function Pagination({ page, total, limit, basePath, params = {} }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  const href = (p) => {
    const q = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v)), page: String(p) });
    return `${basePath}?${q}`;
  };
  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 && <Link href={href(page - 1)}>← Previous</Link>}
      <span className="muted">Page {page} of {pages}</span>
      {page < pages && <Link href={href(page + 1)}>Next →</Link>}
    </nav>
  );
}
