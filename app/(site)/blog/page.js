import Link from 'next/link';
import { api } from '@/lib/server';
import ArticleCard from '@/components/ArticleCard';
import Pagination from '@/components/Pagination';

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  return {
    title: 'Blog: saving tips, guides & shopping advice',
    description: 'Practical guides on using discount codes, spotting real deals and shopping safely online.',
    alternates: { canonical: '/blog' },
    robots: sp.tag || sp.page ? { index: false, follow: true } : undefined,
  };
}

export default async function BlogPage({ searchParams }) {
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const tag = sp.tag || '';
  const data = await api('/articles', { page, tag });
  return (
    <div className="container page">
      <h1>Blog</h1>
      <p className="lead">Saving tips, guides and honest shopping advice.</p>
      {data.tags.length > 0 && (
        <div className="tabs">
          <Link href="/blog" className={!tag ? 'active' : ''}>All</Link>
          {data.tags.map((t) => (
            <Link key={t.tag} href={`/blog?tag=${encodeURIComponent(t.tag)}`} className={tag === t.tag ? 'active' : ''}>{t.tag} ({t.n})</Link>
          ))}
        </div>
      )}
      {data.items.length === 0 ? (
        <p className="empty">No articles yet – check back soon.</p>
      ) : (
        <div className="article-grid">
          {data.items.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      )}
      <Pagination page={page} total={data.total} limit={data.limit} basePath="/blog" params={{ tag }} />
    </div>
  );
}
