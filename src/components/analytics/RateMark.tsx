export function wilson(success: number, total: number) {
  if (!total) return { low: 0, high: 0 };
  const z = 1.96,
    p = success / total,
    div = 1 + (z * z) / total,
    center = (p + (z * z) / (2 * total)) / div,
    half =
      (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) /
      div;
  return {
    low: Math.max(0, center - half) * 100,
    high: Math.min(1, center + half) * 100,
  };
}
export default function RateMark({
  success,
  total,
  outcome = "exposed views clicked",
}: {
  success: number;
  total: number;
  outcome?: string;
}) {
  if (!total) return <span>—</span>;
  const rate = (100 * success) / total,
    { low, high } = wilson(success, total);
  return (
    <span
      className="rate-mark"
      title={`${success} of ${total} ${outcome}. 95% Wilson interval: ${low.toFixed(1)}–${high.toFixed(1)}%.`}
    >
      <span>
        {rate.toFixed(1)}%{total < 20 ? <small>Low sample</small> : null}
      </span>
      <span className="rate-scale" aria-hidden="true">
        <i style={{ left: `${low}%`, width: `${high - low}%` }} />
        <b style={{ left: `${rate}%` }} />
      </span>
    </span>
  );
}
