/** Keep the newest item first and each type chronological, while spreading types
 * across a neighborhood sized for the responsive grid. Score the whole sequence
 * so borrowing a different type doesn't just leave a larger clump behind it.
 * Every item stays within six positions of its original chronological position.
 */
export const DISTRIBUTE_MAX_SHIFT = 6;

export function distributeByCategory<T extends { category: string }>(
  sorted: readonly T[],
  columns = 1,
): T[] {
  const order = sorted.map((_, index) => index);
  const radius = Math.min(4, Math.max(1, columns));
  const score = (indices: number[]) => {
    let cost = 0;
    let run = 0;
    for (let i = 0; i < indices.length; i++) {
      run = i > 0 && sorted[indices[i]].category === sorted[indices[i - 1]].category ? run + 1 : 1;
      cost += (run - 1) * (run - 1) * 4;
      // Prefer the smallest departure from chronology for the same mix.
      cost += Math.abs(indices[i] - i) * 0.2;
      for (let distance = 1; distance <= radius && i >= distance; distance++) {
        if (sorted[indices[i]].category === sorted[indices[i - distance]].category) {
          cost += 8 / (distance * distance);
        }
      }
    }
    return cost;
  };

  let currentScore = score(order);
  // Deterministic local improvement; each accepted move strictly reduces cost.
  for (let pass = 0; pass < sorted.length; pass++) {
    let bestScore = currentScore;
    let bestOrder: number[] | undefined;
    for (let from = 1; from < order.length; from++) {
      for (let to = from + 1; to < Math.min(order.length, from + DISTRIBUTE_MAX_SHIFT + 1); to++) {
        // Crossing another item of this type would reverse its chronology.
        for (const [source, target] of [[from, to], [to, from]]) {
          const crossed = source === from ? order.slice(from + 1, to + 1) : order.slice(from, to);
          if (crossed.some(index => sorted[index].category === sorted[order[source]].category)) continue;
          const candidate = [...order];
          candidate.splice(target, 0, candidate.splice(source, 1)[0]);
          if (candidate.some((index, position) => Math.abs(index - position) > DISTRIBUTE_MAX_SHIFT)) continue;
          const candidateScore = score(candidate);
          if (candidateScore < bestScore - 0.0001) {
            bestScore = candidateScore;
            bestOrder = candidate;
          }
        }
      }
    }
    if (!bestOrder) break;
    order.splice(0, order.length, ...bestOrder);
    currentScore = bestScore;
  }
  return order.map(index => sorted[index]);
}
