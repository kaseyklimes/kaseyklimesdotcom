/**
 * `sizes` hints for images in the article column, derived from the layout:
 * the detail page article is `max-w-4xl` (56rem = 896px) inside `px-4`.
 * A hint that overstates the slot makes the browser fetch a larger variant
 * than it can display, so these track the real rendered widths.
 */
export const ARTICLE_WIDTH = 896;
// The viewport width at which the column reaches its full width (896px + 2rem padding).
const ARTICLE_BREAKPOINT = ARTICLE_WIDTH + 32;

/** A full-width image in the article column (hero, series photo, carousel slide). */
export const ARTICLE_SIZES = `(min-width: ${ARTICLE_BREAKPOINT}px) ${ARTICLE_WIDTH}px, calc(100vw - 2rem)`;

/** One of the two "Loosely Related" cards: two columns with a 1.5rem gap from `md` up. */
export const RELATED_CARD_SIZES =
  `(min-width: ${ARTICLE_BREAKPOINT}px) ${Math.ceil((ARTICLE_WIDTH - 24) / 2)}px, ` +
  '(min-width: 768px) calc(50vw - 28px), calc(100vw - 2rem)';

/**
 * A Markdown body image renders at its natural width, capped by the column or
 * by its share of a multi-image row (1rem gaps), so the hint is the smaller
 * of the two.
 */
export function articleImageSizes(naturalWidth: number, columns = 1): string {
  const slot = Math.floor((ARTICLE_WIDTH - 16 * (Math.max(1, columns) - 1)) / Math.max(1, columns));
  const width = Math.min(naturalWidth, slot);
  return `(min-width: ${ARTICLE_BREAKPOINT}px) ${width}px, min(${naturalWidth}px, 100vw - 2rem)`;
}
