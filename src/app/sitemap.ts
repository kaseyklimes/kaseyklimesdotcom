import type { MetadataRoute } from 'next';
import { getAllContent } from '@/utils/content';
import { filterPath } from '@/utils/filterRoutes';
import { absoluteUrl, contentDate } from '@/utils/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const items = getAllContent().filter(item => !item.private);
  const collections = new Set(['/', '/shelf', ...items.flatMap(item => (item.tags || []).map(filterPath))]);
  return [
    ...[...collections].map(path => ({ url: absoluteUrl(path) })),
    ...items.map(item => ({
      url: absoluteUrl(`/${item.category}/${item.slug}`),
      lastModified: contentDate(item.date),
    })),
  ];
}
