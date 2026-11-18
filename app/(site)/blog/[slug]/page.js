import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, getRegion, getSettings, SITE_URL } from '@/lib/server';
import { renderMarkdown, readingMinutes } from '@/lib/markdown';
import { formatDate } from '@/lib/format';
import JsonLd from '@/components/JsonLd';
import ArticleCard from '@/components/ArticleCard';
import Cover from '@/components/Cover';
import { tagEmoji } from '@/lib/art';
import Newsletter from '@/components/Newsletter';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await api(`/articles/${slug}`);
  if (!data) return { title: 'Article not found' };
  const { article } = data;
  return {
    title: article.seo_title || article.title,
    description: article.seo_description || article.excerpt || undefined,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: 'article',
      title: article.seo_title || article.title,
      publishedTime: article.published_at,
      images: article.image_url ? [article.image_url] : undefined,
    },
  };
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const [data, settings, region] = await Promise.all([api(`/articles/${slug}`), getSettings(), getRegion()]);
  if (!data) notFound();
  const { article, related } = data;
  return (
    <div className="container page">
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: article.title,
            description: article.excerpt || undefined,
            image: article.image_url || undefined,
            datePublished: article.published_at,
            dateModified: (article.updated_at || article.published_at || '').slice(0, 10) || undefined,
            author: { '@type': 'Person', name: article.author || 'Editorial team' },
            publisher: { '@type': 'Organization', name: settings.site_name },
            mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
              { '@type': 'ListItem', position: 3, name: article.title, item: `${SITE_URL}/blog/${slug}` },
            ],
          },
        ]}
      />
      <nav className="crumbs small"><Link href="/">Home</Link> / <Link href="/blog">Blog</Link> / {article.title}</nav>
      <article className="prose article">
        {article.tag && <Link href={`/blog?tag=${encodeURIComponent(article.tag)}`} className="tag">{article.tag}</Link>}
        <h1>{article.title}</h1>
        <p className="muted small">
          {article.author || 'Editorial team'} · {formatDate(article.published_at)} · {readingMinutes(article.body)} min read
        </p>
        <Cover className="article__cover" src={article.image_url} seed={article.slug} emoji={tagEmoji(article.tag)} loading="eager" />
        {article.excerpt && <p className="lead">{article.excerpt}</p>}
        {renderMarkdown(article.body)}
        <p className="note small">
          Some links on this site are affiliate links: we may earn a commission when you buy, at no extra cost to you.{' '}
          <Link href="/affiliate-disclosure">Learn more</Link>.
        </p>
      </article>
      {related.length > 0 && (
        <section className="section">
          <h2>More from the blog</h2>
          <div className="article-grid">{related.map((a) => <ArticleCard key={a.id} article={a} />)}</div>
        </section>
      )}
      <Newsletter region={region} />
    </div>
  );
}
