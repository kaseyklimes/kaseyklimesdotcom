import { ContentMeta } from '@/types/content';

// Cards below this star count are hidden from the unfiltered "All" view on mobile
// (the single-column layout). It never applies once a filter is selected.
export const MOBILE_MIN_STARS = 2;

/**
 * Decide which cards the masonry grid shows.
 *
 * - A selected tag shows every public card carrying that tag, regardless of stars.
 * - The unfiltered "All" view hides the shelf card, cards flagged hideFromAll,
 *   and, on mobile only, anything below MOBILE_MIN_STARS.
 */
export function filterGridItems(items: ContentMeta[], selectedTag: string | null, isMobile: boolean): ContentMeta[] {
  if (selectedTag && selectedTag !== 'all') {
    return items.filter(item => !item.private && item.tags?.includes(selectedTag));
  }
  return items.filter(item =>
    !item.private
    && item.category !== 'shelf'
    && !item.hideFromAll
    && (!isMobile || (Number(item.stars) || 0) >= MOBILE_MIN_STARS)
  );
}
