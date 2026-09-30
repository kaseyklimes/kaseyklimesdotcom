"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import TrafficChart from "./TrafficChart";
import RateMark from "./RateMark";
import JourneyFlow from "./JourneyFlow";
import { RANGE_OPTIONS } from "@/lib/analytics/range";
import type { resolveRange } from "@/lib/analytics/range";
import type { summarize } from "@/lib/analytics/model";
type Report = ReturnType<typeof summarize> & {
  coverageWarnings: { date: string; reason: string }[];
  range: ReturnType<typeof resolveRange>;
  trackingSince: string | null;
  generatedAt: string;
};
type Row = { name: string; count: number };
const countryName = (code: string) => {
  try {
    return /^[A-Z]{2}$/.test(code)
      ? new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code
      : code;
  } catch {
    return code;
  }
};
const number = (n: number) => n.toLocaleString();
const percent = (n: number, d: number) =>
  d ? `${Math.round((100 * n) / d)}%` : "—";
const pretty = (path: string) =>
  path === "/"
    ? "Home"
    : path
        .split("/")
        .filter(Boolean)
        .map((p) => p.replace(/-/g, " "))
        .join(" / ");
function Bars({
  rows,
  empty = "No activity recorded yet.",
}: {
  rows: Row[];
  empty?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const max = Math.max(1, ...rows.map((r) => r.count));
  const shown = expanded ? rows : rows.slice(0, 8);
  return rows.length ? (
    <>
      <div className="bars">
        {shown.map((r) => (
          <div className="bar-row" key={r.name}>
            <div>
              <span title={r.name}>{r.name}</span>
              <strong>{number(r.count)}</strong>
            </div>
            <div className="track" aria-hidden="true">
              <i style={{ width: `${(100 * r.count) / max}%` }} />
            </div>
          </div>
        ))}
      </div>
      {rows.length > 8 && (
        <button
          className="text-button list-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show top 8" : `Show all ${rows.length}`}
        </button>
      )}
      <p className="footnote">
        {expanded ? "All" : `Top ${Math.min(8, rows.length)}`} of {rows.length}{" "}
        · bars share a zero baseline and are scaled to the largest value above.
      </p>
    </>
  ) : (
    <p className="empty-small">{empty}</p>
  );
}
function Panel({
  title,
  note,
  children,
  className = "",
}: {
  title: string;
  note: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <header>
        <h2>{title}</h2>
        <p>{note}</p>
      </header>
      {children}
    </section>
  );
}
export default function Dashboard() {
  const [days, setDays] = useState("7"),
    [source, setSource] = useState(""),
    [device, setDevice] = useState(""),
    [country, setCountry] = useState(""),
    [category, setCategory] = useState("");
  const [from, setFrom] = useState(
      new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    ),
    [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [audienceBy, setAudienceBy] = useState<"source" | "device" | "country">(
    "source",
  );
  const [pageSort, setPageSort] = useState<
    "views" | "sessions" | "engaged" | "seconds" | "depth"
  >("views");
  const [cardSort, setCardSort] = useState("clicked");
  const [report, setReport] = useState<Report | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0),
    [tab, setTab] = useState("Overview");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      days,
      from,
      to,
      source,
      device,
      country,
      category,
    });
    fetch(`/api/analytics/report?${params}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (r.status === 401) {
          location.reload();
          return;
        }
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setReport(data);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(e.message || "Unable to load analytics.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [days, from, to, source, device, country, category, refresh]);
  const title = (path: string) => report?.titles[path] || pretty(path);
  const reset = () => {
    setSource("");
    setDevice("");
    setCountry("");
    setCategory("");
  };
  const exportCsv = () => {
    if (!report) return;
    const rows = [
      [
        "Path",
        "Views",
        "Sessions",
        "Engaged views (%)",
        "Average active seconds",
        "Average scroll (%)",
      ],
      ...report.pages.map((p) => [
        p.path,
        p.views,
        p.sessions,
        p.engaged,
        p.seconds,
        p.depth,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `site-analytics-${days}-days.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <main className="insights">
      <div className="topline">
        <Link href="/">
          Kasey Klimes <span>/ Analytics</span>
        </Link>
        <div>
          <span className="private-dot">Private</span>
          <button
            className="text-button"
            onClick={async () => {
              try {
                const r = await fetch("/api/analytics/logout", {
                  method: "POST",
                });
                if (!r.ok) throw new Error();
                location.reload();
              } catch {
                setError("Unable to sign out. Please retry.");
              }
            }}
          >
            Sign out ↗
          </button>
        </div>
      </div>
      <header className="intro">
        <div>
          <span className="eyebrow">WEBSITE / PRIVATE ANALYTICS</span>
          <h1>Analytics</h1>
          <p>
            Where people arrive, what they explore, and what holds their
            attention.
          </p>
        </div>
        <div className="actions">
          <button onClick={() => setRefresh((v) => v + 1)} disabled={loading}>
            {loading ? "Updating…" : "↻ Refresh"}
          </button>
          <button onClick={exportCsv} disabled={!report || loading || !!error}>
            Export pages ↓
          </button>
        </div>
      </header>
      <div className="controls">
        <label>
          Period
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            {RANGE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Acquisition source
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All sources</option>
            {report?.options.sources.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Device
          <select value={device} onChange={(e) => setDevice(e.target.value)}>
            <option value="">All devices</option>
            {report?.options.devices.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Country
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">All countries</option>
            {report?.options.countries.map((v) => (
              <option key={v} value={v}>
                {countryName(v)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Content
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All content</option>
            {[
              "Home",
              "Notes",
              "Work",
              "Images",
              "Shelf",
              "Talks",
              "Play",
              "Other",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        {(source || device || country || category) && (
          <button className="text-button" onClick={reset}>
            Clear filters
          </button>
        )}
      </div>
      {days === "custom" && (
        <div className="custom-range">
          <label>
            From (UTC)
            <input
              type="date"
              aria-label="Start date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Through (UTC)
            <input
              type="date"
              aria-label="End date"
              value={to}
              min={from}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
      )}
      <nav className="tabs" aria-label="Analytics views">
        {[
          "Overview",
          "Content & attention",
          "Audience & acquisition",
          "Journeys",
        ].map((t) => (
          <button
            key={t}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      {error && (
        <div className="notice error" role="alert">
          {error}{" "}
          <button onClick={() => setRefresh((v) => v + 1)}>Retry</button>
        </div>
      )}
      {loading && (
        <p role="status" className="status">
          Loading your analytics…
        </p>
      )}
      {report && !loading && !error && (
        <>
          {report.coverageWarnings.length > 0 && (
            <div className="notice" role="status">
              <strong>
                Incomplete collection on {report.coverageWarnings.length}{" "}
                day(s).
              </strong>
              <p>
                {report.coverageWarnings
                  .slice(0, 5)
                  .map((w) => `${w.date}: ${w.reason}`)
                  .join(" · ")}
                . These totals include only successfully recorded visits.
              </p>
            </div>
          )}
          <p className="range-caption">
            {report.range.label} · {report.range.from} – {report.range.to} UTC
            {report.trackingSince
              ? ` · Tracking began ${report.trackingSince.slice(0, 10)}`
              : " · Awaiting first tracked visit"}
          </p>
          {!report.views && (
            <div className="notice">
              <strong>
                {source || device || country || category
                  ? "No visits match these filters."
                  : report.trackingSince
                    ? "No recorded visits in this selection."
                    : "Ready for the first visit."}
              </strong>
              <p>
                {source || device || country || category
                  ? "Try a broader segment or a longer date range."
                  : "Real visits will appear here after tracking is enabled. Your signed-in visits are excluded, and historical visits cannot be recovered."}
              </p>
            </div>
          )}
          <div className="metrics">
            <div>
              <span>PAGE VIEWS</span>
              <strong>{number(report.views)}</strong>
              <small>Selected pages</small>
            </div>
            <div>
              <span>SESSIONS</span>
              <strong>{number(report.sessions)}</strong>
              <small>Tab-scoped visits</small>
            </div>
            <div>
              <span>ENGAGED VIEWS</span>
              <strong>{percent(report.engaged, report.views)}</strong>
              <small>10+ active seconds</small>
            </div>
            <div>
              <span>ACTIVE TIME / VIEW</span>
              <strong>
                {report.views ? report.avgSeconds : "—"}
                {report.views > 0 && <em>s</em>}
              </strong>
              <small>Visible + active time</small>
            </div>
          </div>
          {tab === "Overview" && (
            <div className="dashboard-grid">
              <Panel
                title="The rhythm of visits"
                note="Page views and distinct sessions · UTC"
                className="wide"
              >
                <TrafficChart
                  series={report.traffic}
                  days={report.range.days}
                  trackingSince={report.trackingSince}
                />
              </Panel>
              <Panel title="What draws people in" note="Most-viewed pages">
                <Bars
                  rows={report.pages.map((p) => ({
                    name: title(p.path),
                    count: p.views,
                  }))}
                />
              </Panel>
              <Panel
                title="Where they come from"
                note="Sessions by first observed acquisition source"
              >
                <Bars rows={report.sources} />
              </Panel>
            </div>
          )}
          {tab === "Content & attention" && (
            <div className="dashboard-grid">
              <Panel
                title="Attention, page by page"
                note="Active time and scroll are averages over all views, including views without an engagement heartbeat."
                className="wide"
              >
                <label className="table-control">
                  Sort by{" "}
                  <select
                    value={pageSort}
                    onChange={(e) =>
                      setPageSort(e.target.value as typeof pageSort)
                    }
                  >
                    <option value="views">Page views</option>
                    <option value="sessions">Sessions</option>
                    <option value="engaged">Engagement rate</option>
                    <option value="seconds">Active time</option>
                    <option value="depth">Scroll depth</option>
                  </select>
                </label>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Content</th>
                        <th>Views</th>
                        <th>Sessions</th>
                        <th>Engaged</th>
                        <th>Active time</th>
                        <th>Scroll</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...report.pages]
                        .sort(
                          (a, b) =>
                            b[pageSort] - a[pageSort] || b.views - a.views,
                        )
                        .map((p) => (
                          <tr key={p.path}>
                            <td>
                              <a href={p.path} target="_blank" rel="noreferrer">
                                {title(p.path)} ↗
                              </a>
                              <small>{p.path}</small>
                            </td>
                            <td>{number(p.views)}</td>
                            <td>{number(p.sessions)}</td>
                            <td>
                              <span className="pill">{p.engaged}%</span>
                              {p.views < 20 && <small>Low sample</small>}
                            </td>
                            <td>{p.seconds}s</td>
                            <td>{p.depth}%</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {!report.pages.length && (
                    <p className="empty-small">
                      No content views in this segment.
                    </p>
                  )}
                </div>
              </Panel>
              <Panel
                title="Seen → selected"
                note="A card impression requires 50% visibility for 1 second. Click-through counts only clicks with a recorded impression."
                className="wide"
              >
                <label className="table-control">
                  Sort by{" "}
                  <select
                    value={cardSort}
                    onChange={(e) => setCardSort(e.target.value)}
                  >
                    <option value="clicked">Clicked views</option>
                    <option value="seen">Exposed views</option>
                    <option value="rate">
                      Click-through (20+ impressions)
                    </option>
                  </select>
                </label>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Content card</th>
                        <th>Views that saw it</th>
                        <th>Views that clicked</th>
                        <th>Click-through</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...report.interests]
                        .filter((c) => cardSort !== "rate" || c.seen >= 20)
                        .sort((a, b) =>
                          cardSort === "seen"
                            ? b.seen - a.seen
                            : cardSort === "rate"
                              ? b.clicked / b.seen - a.clicked / a.seen
                              : b.clicked - a.clicked,
                        )
                        .map((c) => (
                          <tr key={c.target}>
                            <td>{title(c.target)}</td>
                            <td>{c.seen}</td>
                            <td>{c.clicked}</td>
                            <td>
                              <RateMark success={c.clicked} total={c.seen} />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {!report.interests.length && (
                    <p className="empty-small">
                      Card visibility and click data will appear as visitors
                      explore the grid.
                    </p>
                  )}
                </div>
                <p className="footnote">
                  Compare cards with similar exposure. Small samples and
                  placement can heavily influence click-through. The dot marks
                  the measured rate; its line shows a 95% Wilson uncertainty
                  interval on a 0–100% scale. Wider lines mean less precision.
                </p>
              </Panel>
              {Object.entries(report.dimensions).map(([key, rows]) => (
                <Panel
                  key={key}
                  title={
                    {
                      topics: "Content tags",
                      formats: "Which formats work",
                      emphasis: "Editorial emphasis",
                    }[key] || key
                  }
                  note={
                    key === "topics"
                      ? "Current content tags · a page can belong to several topics."
                      : key === "formats"
                        ? "Current content format · compare attention and card conversion."
                        : "Current 1–5 content emphasis · higher values generally receive larger grid placement."
                  }
                  className={key === "topics" ? "wide" : ""}
                >
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>
                            {key === "emphasis" ? "Emphasis" : "Dimension"}
                          </th>
                          <th>Views</th>
                          <th>Engaged</th>
                          <th>Active</th>
                          <th>Card CTR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.name}>
                            <td>
                              {r.name}
                              <small>{r.seen} card impressions</small>
                            </td>
                            <td>{r.views}</td>
                            <td>{r.views ? `${r.engaged}%` : "—"}</td>
                            <td>{r.views ? `${r.seconds}s` : "—"}</td>
                            <td>{percent(r.clicked, r.seen)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!rows.length && (
                      <p className="empty-small">
                        No matching content activity yet.
                      </p>
                    )}
                  </div>
                </Panel>
              ))}
              <Panel
                title="Beyond the website"
                note="Views with an outbound click · destination domain only"
              >
                <Bars rows={report.outbound} />
              </Panel>
              <Panel
                title="Deeper interaction"
                note="Views with gallery navigation or manually started media"
              >
                <Bars rows={report.interactions} />
              </Panel>
            </div>
          )}
          {tab === "Audience & acquisition" && (
            <div className="dashboard-grid">
              <Panel
                title="Different arrivals. Different interests."
                note="Engagement rate by audience and content category. Each cell shows the share of views with 10+ active seconds, plus its numerator and denominator. This is association, not proof of causation."
                className="wide"
              >
                <div className="matrix-toolbar">
                  <label>
                    Compare by{" "}
                    <select
                      value={audienceBy}
                      onChange={(e) =>
                        setAudienceBy(e.target.value as typeof audienceBy)
                      }
                    >
                      <option value="source">Acquisition source</option>
                      <option value="device">Device</option>
                      <option value="country">Country</option>
                    </select>
                  </label>
                  <span>
                    Shade: 0% <i className="matrix-gradient" /> 100% engaged
                  </span>
                </div>
                <div className="table-wrap">
                  <table className="heatmap">
                    <thead>
                      <tr>
                        <th>{audienceBy} / sessions</th>
                        {[
                          "Notes",
                          "Work",
                          "Images",
                          "Shelf",
                          "Talks",
                          "Play",
                        ].map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.audienceCohorts[audienceBy].map((row) => (
                        <tr key={row.name}>
                          <td>
                            {audienceBy === "country"
                              ? countryName(row.name)
                              : row.name}
                            <small>{row.count} sessions</small>
                          </td>
                          {row.categories.map((c) => (
                            <td
                              key={c.category}
                              style={{
                                backgroundColor: `rgba(var(--heat-rgb),${c.views ? 0.03 + (0.22 * c.engaged) / c.views : 0})`,
                              }}
                            >
                              <strong>{percent(c.engaged, c.views)}</strong>
                              <small>
                                {c.engaged} / {c.views} views
                                {c.views > 0 && c.views < 20 ? " · low n" : ""}
                              </small>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!report.audienceCohorts[audienceBy].length && (
                    <p className="empty-small">
                      Audience comparisons need recorded visits.
                    </p>
                  )}
                </div>
                <p className="footnote">
                  Top {report.audienceCohorts[audienceBy].length} {audienceBy}{" "}
                  segments by sessions. Use the filters above to inspect a
                  specific audience. “—” means no measured views, not zero
                  engagement.
                </p>
              </Panel>
              <Panel
                title="Acquisition sources"
                note="Sessions · referrer domain or tagged UTM source"
              >
                <Bars rows={report.sources} />
              </Panel>
              <Panel
                title="Device mix"
                note="Sessions · inferred from browser user agent"
              >
                <Bars rows={report.devices} />
              </Panel>
              <Panel
                title="Geography"
                note="Sessions · approximate country, not precise location"
              >
                <Bars
                  rows={report.countries.map((r) => ({
                    ...r,
                    name: countryName(r.name),
                  }))}
                />
              </Panel>
              <Panel title="Campaigns" note="Sessions · utm_campaign values">
                <Bars rows={report.campaigns} />
              </Panel>
              <Panel
                title="Acquisition medium"
                note="Sessions · utm_medium values"
              >
                <Bars rows={report.mediums} />
              </Panel>
            </div>
          )}
          {tab === "Journeys" && (
            <div className="dashboard-grid">
              <Panel
                title="Where attention travels"
                note="Follow matching sessions from arrival through their observed pages."
                className="wide"
              >
                <JourneyFlow
                  key={report.generatedAt}
                  data={report.journeyFlow}
                  titles={report.titles}
                />
              </Panel>
              <Panel
                title="The next step"
                note="Consecutive page transitions within the selected content and date range."
                className="wide"
              >
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>From</th>
                        <th>To</th>
                        <th>Transitions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.journeys.map((r) => {
                        const [from, to] = r.name.split(" → ");
                        return (
                          <tr key={r.name}>
                            <td>{title(from)}</td>
                            <td>{title(to)}</td>
                            <td>{r.count}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!report.journeys.length && (
                    <p className="empty-small">
                      No page-to-page transitions in this selection.
                    </p>
                  )}
                </div>
              </Panel>
              <Panel
                title="The first impression"
                note="First observed pages of matching sessions"
              >
                <Bars
                  rows={report.entries.map((r) => ({
                    ...r,
                    name: title(r.name),
                  }))}
                />
              </Panel>
              <Panel
                title="Where visits end"
                note="Last observed page in this selection; active sessions may continue"
              >
                <Bars
                  rows={report.exits.map((r) => ({
                    ...r,
                    name: title(r.name),
                  }))}
                />
              </Panel>
            </div>
          )}
          <footer className="dashboard-footer">
            <p>
              Updated {new Date(report.generatedAt).toLocaleTimeString()} ·{" "}
              {report.range.from} – {report.range.to} · UTC
            </p>
            <p>
              Sessions are anonymous and scoped to a browser tab, resetting
              after 30 minutes without a new page view. They are not unique
              people. No identities, age, gender, or employer are inferred.
              Browser blocking and privacy choices can reduce coverage.
            </p>
            <p>
              Per-view summaries remain available for all-time history. Active
              time is capped at 30 minutes per page view.{" "}
              <Link href="/privacy">Privacy & tracking controls ↗</Link>
            </p>
          </footer>
        </>
      )}
    </main>
  );
}
