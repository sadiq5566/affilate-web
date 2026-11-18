import ResourcePage, { ActiveBadge, Badge } from '../ResourcePage.jsx';
import { ACTIVE_OPTIONS, HAS, YES_NO, sortOptions } from '../useOptions.js';
import { date, num } from '../format.js';
import { SITE_URL } from '../api.js';

const TAGS = ['Guides', 'Saving tips', 'Shopping safety', 'Seasonal', 'Transparency'];

export default function Articles() {
  const fields = [
    { name: 'title', label: 'Title', required: true, full: true },
    { name: 'tag', label: 'Topic', type: 'select', options: TAGS.map((t) => ({ value: t, label: t })) },
    { name: 'author', label: 'Author', placeholder: 'Editorial team' },
    { name: 'published_at', label: 'Publish date', type: 'date', help: 'A future date schedules the article: it appears on that day.' },
    { name: 'slug', label: 'URL slug', help: 'Auto-generated from the title if empty' },
    { name: 'image_url', label: 'Cover image', type: 'image', full: true },
    { name: 'excerpt', label: 'Short summary (shown on cards and in Google)', type: 'textarea', full: true },
    {
      name: 'body',
      label: 'Article text (Markdown)',
      type: 'textarea',
      full: true,
      rows: 18,
      help: 'Use ## Heading, ### Subheading, - bullet lists, 1. numbered lists, **bold**, *italic*, > quote and [link text](https://…).',
    },
    { name: '_seo', section: 'SEO (optional)' },
    { name: 'seo_title', label: 'SEO title', full: true },
    { name: 'seo_description', label: 'SEO description', type: 'textarea', full: true },
    { name: 'is_active', label: 'Published', type: 'bool' },
  ];
  const columns = [
    {
      key: 'title',
      label: 'Article',
      render: (r) => (
        <div>
          <strong>{r.title}</strong>
          <span className="muted small block">{r.tag || 'No topic'} · {r.author || 'No author'}</span>
        </div>
      ),
    },
    { key: 'published_at', label: 'Publish date', render: (r) => (r.is_scheduled ? <Badge tone="info">Scheduled {date(r.published_at)}</Badge> : date(r.published_at)) },
    { key: 'body_length', label: 'Words', className: 'num', render: (r) => num(Math.round((r.body_length || 0) / 6)) },
    { key: 'is_active', label: 'Status', render: (r) => <ActiveBadge value={r.is_active} /> },
    { key: 'link', label: '', render: (r) => <a href={`${SITE_URL}/blog/${r.slug}`} target="_blank" rel="noreferrer" className="small">View ↗</a> },
  ];
  return (
    <>
      <p className="page-intro">Blog articles bring search traffic to the site. Write them in Markdown, schedule them, or import many at once from a CSV.</p>
      <ResourcePage
        resource="articles"
        singular="Article"
        columns={columns}
        fields={fields}
        defaults={{ is_active: 1, published_at: new Date().toISOString().slice(0, 10) }}
        filters={[
          { name: 'tag', label: 'Topic', options: TAGS.map((t) => ({ value: t, label: t })) },
          { name: 'status', label: 'State', options: [{ value: 'published', label: 'Published' }, { value: 'scheduled', label: 'Scheduled' }] },
          { name: 'is_active', label: 'Visibility', options: ACTIVE_OPTIONS },
          { name: 'has_image', label: 'Cover image', options: HAS },
          { name: 'short', label: 'Length', options: [{ value: 1, label: 'Short (under ~200 words)' }] },
        ]}
        sorts={sortOptions(['published_at', 'Publish date'], ['title', 'Title'], ['body_length', 'Length'], ['created_at', 'Date added'])}
        dateLabel="Published"
        importHint="Columns: title, slug, tag, author, published_at (YYYY-MM-DD), excerpt, body (Markdown, wrap multi-line text in quotes), image_url, seo_title, seo_description, is_active."
      />
    </>
  );
}
