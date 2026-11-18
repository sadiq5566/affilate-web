import Link from 'next/link';
import { formatDate } from '@/lib/format';
import Cover from './Cover';
import { tagEmoji } from '@/lib/art';

export default function ArticleCard({ article }) {
  const minutes = Math.max(1, Math.round((article.body_length || 0) / 6 / 200));
  return (
    <Link href={`/blog/${article.slug}`} className="article-card">
      <Cover src={article.image_url} seed={article.slug} emoji={tagEmoji(article.tag)} className="article-card__img" />
      <div className="article-card__body">
        {article.tag && <span className="tag">{article.tag}</span>}
        <h3>{article.title}</h3>
        {article.excerpt && <p>{article.excerpt}</p>}
        <span className="muted small">{formatDate(article.published_at)} · {minutes} min read</span>
      </div>
    </Link>
  );
}
