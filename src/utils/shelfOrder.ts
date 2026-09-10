import { ContentMeta } from '@/types/content';

export const SHELF_ALBUM_SLUGS = new Set([
  'alopecia', 'ambient-1', 'animalcollective', 'getz-gilberto',
  'glowpt2', 'kid-a', 'neutral-milk-hotel', 'you-forgot-it-in-people',
]);

export const SHELF_COLUMN_GAP = 24;
export const SHELF_ITEM_GAP = 32; // gap-6 plus the cover's mb-2

/** Keep the original order unless an album would touch another album visually. */
export function orderShelfItems(items: readonly ContentMeta[], columnCount: number, columnWidth: number): ContentMeta[] {
  const pool = [...items];
  const first = pool.findIndex(item => item.slug === 'patternlanguage');
  if (first > 0) pool.unshift(...pool.splice(first, 1));

  const ordered: ContentMeta[] = [];
  const heights = Array<number>(columnCount).fill(0);
  const lastIsAlbum = Array<boolean>(columnCount).fill(false);
  const albums: { column: number; top: number; bottom: number }[] = [];
  const heightOf = (item: ContentMeta) => item.heroImage
    ? columnWidth * (item.imageDimensions?.height ?? 800) / (item.imageDimensions?.width ?? 1200)
    : 0;

  while (pool.length) {
    const column = ordered.length % columnCount;
    const top = heights[column];
    const pick = pool.findIndex(item => {
      if (!SHELF_ALBUM_SLUGS.has(item.slug)) return true;
      if (lastIsAlbum[column]) return false;
      const bottom = top + heightOf(item);
      return !albums.some(album => Math.abs(album.column - column) === 1
        && top < album.bottom + SHELF_COLUMN_GAP
        && bottom + SHELF_COLUMN_GAP > album.top);
    });

    // Preserve all content if future additions leave no separating item available.
    const [item] = pool.splice(pick < 0 ? 0 : pick, 1);
    const bottom = top + heightOf(item);
    const isAlbum = SHELF_ALBUM_SLUGS.has(item.slug);
    if (isAlbum) albums.push({ column, top, bottom });
    heights[column] = bottom + SHELF_ITEM_GAP;
    lastIsAlbum[column] = isAlbum;
    ordered.push(item);
  }
  return ordered;
}
