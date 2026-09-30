const DAY = 86400000;
export const RANGE_OPTIONS = [
  ["1", "Today"],
  ["yesterday", "Yesterday"],
  ["7", "Last 7 days"],
  ["14", "Last 14 days"],
  ["30", "Last 30 days"],
  ["90", "Last 90 days"],
  ["180", "Last 180 days"],
  ["365", "Last 365 days"],
  ["730", "Last 730 days"],
  ["ytd", "Year to date"],
  ["all", "All time"],
  ["custom", "Custom dates"],
] as const;
export function resolveRange(
  value: string,
  from: string | null,
  to: string | null,
  firstAt: number | null,
  now = Date.now(),
) {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  let start = today.getTime(),
    end = now;
  if (value === "all") {
    start = firstAt === null ? start : Math.floor(firstAt / DAY) * DAY;
  } else if (value === "yesterday") {
    start -= DAY;
    end = today.getTime() - 1;
  } else if (value === "ytd") {
    start = Date.UTC(today.getUTCFullYear(), 0, 1);
  } else if (value === "custom") {
    const parse = (s: string | null) => {
      if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s))
        throw new Error("Choose valid start and end dates.");
      const n = Date.parse(s + "T00:00:00Z");
      if (!Number.isFinite(n) || new Date(n).toISOString().slice(0, 10) !== s)
        throw new Error("Choose valid start and end dates.");
      return n;
    };
    start = parse(from);
    end = Math.min(now, parse(to) + DAY - 1);
    if (start > end)
      throw new Error("Start date must be on or before the end date.");
    if (start < Date.UTC(2000, 0, 1))
      throw new Error("Choose a date from 2000 onward.");
  } else {
    if (!["1", "7", "14", "30", "90", "180", "365", "730"].includes(value))
      throw new Error("Invalid date range");
    start -= (Number(value) - 1) * DAY;
  }
  const days = Math.floor((end - start) / DAY) + 1;
  return {
    start,
    end,
    days,
    label:
      value === "all"
        ? "All time"
        : value === "ytd"
          ? "Year to date"
          : value === "custom"
            ? "Custom dates"
            : RANGE_OPTIONS.find((r) => r[0] === value)?.[1] || "",
    from: new Date(start).toISOString().slice(0, 10),
    to: new Date(end).toISOString().slice(0, 10),
  };
}
