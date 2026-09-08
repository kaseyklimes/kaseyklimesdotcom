import { ContentMeta } from '@/types/content';

/**
 * A mini-series is an entry whose `series` frontmatter lists extra photos.
 * The grid shows only the cover (`heroImage`); the detail page stacks the rest beneath it.
 */
export function seriesImages(item: Pick<ContentMeta, 'series'>): string[] {
  if (!Array.isArray(item.series)) return [];
  return item.series.filter((src): src is string => typeof src === 'string' && src.trim().length > 0);
}

export function isPhotoSeries(item: Pick<ContentMeta, 'series'>): boolean {
  return seriesImages(item).length > 0;
}
