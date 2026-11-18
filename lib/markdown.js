import React from 'react';

/**
 * Tiny, safe Markdown renderer for articles. It builds React elements (never raw HTML), so article text can
 * not inject scripts. Supported: ## / ### headings, paragraphs, - bullet lists, 1. numbered lists, > quotes,
 * **bold**, *italic*, `code` and [text](link) (only http, https, mailto and /relative links).
 */
const h = React.createElement;

function safeHref(url) {
  const u = url.trim();
  if (/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(u)) return u;
  return null;
}

function inline(text, keyBase) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;
    if (tok.startsWith('**')) out.push(h('strong', { key }, tok.slice(2, -2)));
    else if (tok.startsWith('`')) out.push(h('code', { key }, tok.slice(1, -1)));
    else if (tok.startsWith('[')) {
      const [, label, url] = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      const href = safeHref(url);
      if (!href) out.push(label);
      else {
        const external = /^https?:/i.test(href);
        out.push(h('a', { key, href, ...(external ? { rel: 'nofollow noopener noreferrer', target: '_blank' } : {}) }, label));
      }
    } else out.push(h('em', { key }, tok.slice(1, -1)));
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderMarkdown(source) {
  const lines = String(source || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let para = [];
  let list = null; // { ordered, items }
  let n = 0;
  const flushPara = () => {
    if (para.length) blocks.push(h('p', { key: `b${n++}` }, inline(para.join(' '), `p${n}`)));
    para = [];
  };
  const flushList = () => {
    if (list) {
      blocks.push(h(list.ordered ? 'ol' : 'ul', { key: `b${n++}` }, list.items.map((t, i) => h('li', { key: i }, inline(t, `l${n}-${i}`)))));
    }
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) {
      flushPara();
      flushList();
    } else if ((m = line.match(/^(#{2,3})\s+(.*)$/))) {
      flushPara();
      flushList();
      blocks.push(h(m[1].length === 2 ? 'h2' : 'h3', { key: `b${n++}` }, inline(m[2], `h${n}`)));
    } else if ((m = line.match(/^[-*]\s+(.*)$/))) {
      flushPara();
      if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; }
      list.items.push(m[1]);
    } else if ((m = line.match(/^\d+[.)]\s+(.*)$/))) {
      flushPara();
      if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [] }; }
      list.items.push(m[1]);
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flushPara();
      flushList();
      blocks.push(h('blockquote', { key: `b${n++}` }, inline(m[1], `q${n}`)));
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return blocks;
}

/** Plain-text word count, for the "x min read" label. */
export function readingMinutes(source) {
  const words = String(source || '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
