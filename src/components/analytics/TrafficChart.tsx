"use client";
import { useState } from "react";
export type TrafficPoint = {
  date: string;
  end: string;
  views: number;
  sessions: number;
  partial: boolean;
};
export default function TrafficChart({
  series,
  days,
  trackingSince,
}: {
  series: {
    daily: TrafficPoint[];
    weekly: TrafficPoint[];
    monthly: TrafficPoint[];
  };
  days: number;
  trackingSince: string | null;
}) {
  const [choice, setChoice] = useState("auto"),
    [selected, setSelected] = useState<number | null>(null);
  const grain =
    choice === "auto"
      ? days <= 31
        ? "daily"
        : days <= 180
          ? "weekly"
          : "monthly"
      : (choice as "daily" | "weekly" | "monthly");
  const points = series[grain],
    max = Math.max(1, ...points.map((p) => p.views));
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const ceiling = Math.ceil(max / magnitude) * magnitude;
  const untracked = (p: TrafficPoint) =>
    !trackingSince || p.end < trackingSince.slice(0, 10);
  const active =
    points[Math.min(selected ?? points.length - 1, points.length - 1)];
  const label = (date: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      ...(grain === "monthly" ? { year: "2-digit" } : { day: "numeric" }),
      timeZone: "UTC",
    }).format(new Date(date + "T00:00:00Z"));
  const tickIndices = (count: number) => new Set(Array.from({ length: Math.min(count, points.length) }, (_, i) => Math.round(i * (points.length - 1) / Math.max(1, Math.min(count, points.length) - 1))));
  const desktopTicks = tickIndices(8), mobileTicks = tickIndices(3);
  return (
    <>
      <div className="chart-toolbar">
        <div className="chart-legend">
          <span>
            <i /> Page views
          </span>
          <span>
            <i /> Sessions
          </span>
        </div>
        <label>
          Group by{" "}
          <select
            value={choice}
            onChange={(e) => {
              setChoice(e.target.value);
              setSelected(null);
            }}
            aria-label="Traffic grouping"
          >
            <option value="auto">Automatic</option>
            <option value="daily">Day</option>
            <option value="weekly">Week</option>
            <option value="monthly">Month</option>
          </select>
        </label>
      </div>
      <div className="traffic-value" aria-live="polite">
        {active && (
          <>
            <strong>
              {active.date}
              {active.end !== active.date ? ` – ${active.end}` : ""}
            </strong>
            <span>
              {untracked(active)
                ? "Not tracked"
                : active.views.toLocaleString() + " views"}{" "}
              ·{" "}
              {untracked(active)
                ? "history unavailable"
                : active.sessions.toLocaleString() + " sessions"}
              {active.partial ? " · partial interval" : ""}
            </span>
          </>
        )}
      </div>
      <div className="traffic-frame">
        <div className="traffic-axis" aria-hidden="true">
          <span>{ceiling.toLocaleString()}</span>
          <span>{(ceiling / 2).toLocaleString()}</span>
          <span>0</span>
        </div>
        <div className="traffic-scroll">
          <div
            className="traffic-plot"
            style={{
              minWidth: points.length > 31 ? points.length * 24 : undefined,
            }}
          >
            {points.map((p, i) => (
              <button
                key={p.date}
                className={`traffic-column ${selected === i ? "selected" : ""} ${untracked(p) ? "not-tracked" : ""}`}
                onMouseEnter={() => setSelected(i)}
                onFocus={() => setSelected(i)}
                onClick={() => setSelected(i)}
                aria-label={
                  untracked(p)
                    ? `${p.date} to ${p.end}: not tracked`
                    : `${p.date} to ${p.end}: ${p.views} page views and ${p.sessions} sessions${p.partial ? ", partial interval" : ""}`
                }
              >
                <span className="traffic-bars">
                  <i style={{ height: `${(p.views / ceiling) * 100}%` }} />
                  <i style={{ height: `${(p.sessions / ceiling) * 100}%` }} />
                </span>
                <span className="traffic-date traffic-date-desktop">{desktopTicks.has(i) ? label(p.date) : ""}</span>
                <span className="traffic-date traffic-date-mobile">{mobileTicks.has(i) ? label(p.date) : ""}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="footnote">
        Dates before tracking began are unmeasured, not zero traffic. Counts per{" "}
        {grain === "daily" ? "day" : grain === "weekly" ? "week" : "month"},
        starting at zero. Sessions are distinct within each interval; a session
        crossing a boundary may appear in both. Hover, tap, or focus an interval
        for exact values.
      </p>
      <details>
        <summary>View {grain} data table</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Interval (UTC)</th>
                <th>Page views</th>
                <th>Sessions</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.date}>
                  <td>
                    {p.date}
                    {p.end !== p.date ? ` – ${p.end}` : ""}
                    {p.partial ? " (partial)" : ""}
                  </td>
                  <td>
                    {untracked(p) ? "Not tracked" : p.views.toLocaleString()}
                  </td>
                  <td>{untracked(p) ? "—" : p.sessions.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
