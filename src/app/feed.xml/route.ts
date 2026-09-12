import { getAllContent } from '@/utils/content';
import { absoluteUrl, contentDate, escapeXml } from '@/utils/site';

export const dynamic = 'force-static';
export const revalidate = 3600;

export function GET() {
  const items = getAllContent({ category: 'blog', sortBy: 'date', order: 'desc' })
    .filter(item => !item.private)
    .map(item => {
      const url = escapeXml(absoluteUrl(`/blog/${item.slug}`));
      const date = contentDate(item.date);
      return `<item><title>${escapeXml(item.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><description>${escapeXml(item.description || '')}</description>${date ? `<pubDate>${date.toUTCString()}</pubDate>` : ''}</item>`;
    }).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>Kasey Klimes — Notes</title><link>${escapeXml(absoluteUrl('/notes'))}</link>
<description>Notes by Kasey Klimes</description><language>en</language>
<atom:link href="${escapeXml(absoluteUrl('/feed.xml'))}" rel="self" type="application/rss+xml" />
${items}
</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
