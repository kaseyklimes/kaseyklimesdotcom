/**
 * Spread grid item types out while keeping the list roughly chronological.
 *
 * The input is already sorted (newest first) and is taken in that order until
 * the next item would extend a run of `maxRun` same-category items. Then the
 * nearest item of another category within the next `window` positions is
 * pulled forward instead. Nothing moves unless a run is about to form, an item
 * can move at most `window - 1` places earlier than its date would put it, and
 * a run only survives when no other category exists within reach.
 */
export const DISTRIBUTE_WINDOW = 10;
export const DISTRIBUTE_MAX_RUN = 1;

export function distributeByCategory<T extends { category: string }>(
  sorted: readonly T[],
  window: number = DISTRIBUTE_WINDOW,
  maxRun: number = DISTRIBUTE_MAX_RUN,
): T[] {
  if (window <= 1 || maxRun < 1) return [...sorted];
  const pool = [...sorted];
  const out: T[] = [];
  let runCategory: string | undefined;
  let runLength = 0;

  while (pool.length > 0) {
    let pick = 0;
    if (runLength >= maxRun && pool[0].category === runCategory) {
      const limit = Math.min(window, pool.length);
      for (let i = 1; i < limit; i++) {
        if (pool[i].category !== runCategory) {
          pick = i;
          break;
        }
      }
    }
    const [item] = pool.splice(pick, 1);
    if (item.category === runCategory) {
      runLength += 1;
    } else {
      runCategory = item.category;
      runLength = 1;
    }
    out.push(item);
  }
  return out;
}
