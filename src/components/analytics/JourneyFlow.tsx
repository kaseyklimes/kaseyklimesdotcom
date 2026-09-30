"use client";
import { useMemo, useRef, useState } from "react";
import { buildJourneyFlow, JOURNEY_STAGES } from "@/lib/analytics/journey-flow";
import type { JourneyRoute, summarize } from "@/lib/analytics/model";
type Data = ReturnType<typeof summarize>["journeyFlow"];
const number = (n: number) => n.toLocaleString();
const rate = (n: number, d: number) =>
  d ? `${Math.round((100 * n) / d)}%` : "—";
const color = (n: number, d: number) =>
  d
    ? `color-mix(in srgb, var(--journey-high) ${Math.round((100 * n) / d)}%, var(--journey-low))`
    : "var(--journey-missing)";
const short = (s: string) => (s.length > 23 ? s.slice(0, 22) + "…" : s);
export default function JourneyFlow({
  data,
  titles,
}: {
  data: Data;
  titles: Record<string, string>;
}) {
  const detailRef = useRef<HTMLDivElement>(null);
  const revealDetails = () =>
    requestAnimationFrame(() =>
      detailRef.current?.scrollIntoView({ block: "center" }),
    );
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selection, setSelection] = useState<{
    kind: "node" | "link";
    id: string;
  } | null>(null);
  const [focus, setFocus] = useState<JourneyRoute[] | null>(null);
  const routes = focus || data.routes;
  const graph = useMemo(
    () => buildJourneyFlow(routes, expanded, titles),
    [routes, expanded, titles],
  );
  const selected =
    selection?.kind === "node"
      ? graph.nodes.find((n) => n.id === selection.id)
      : graph.links.find((l) => l.id === selection?.id);
  const selectedRoutes = selected
    ? selected.routes.map((i) => routes[i])
    : routes;
  const sum = (
    field: keyof Pick<
      JourneyRoute,
      | "sessions"
      | "seconds"
      | "engagedSessions"
      | "continued"
      | "additionalViews"
    >,
  ) => selectedRoutes.reduce((n, r) => n + r[field], 0);
  const sessions = sum("sessions");
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const selectedLink =
    selection?.kind === "link"
      ? graph.links.find((l) => l.id === selection.id)
      : null;
  const selectedNode =
    selection?.kind === "node"
      ? graph.nodes.find((n) => n.id === selection.id)
      : null;
  const title = (p: string | null) =>
    p
      ? p === "/"
        ? "Home"
        : titles[p] || p.replace(/^\//, "").replaceAll("-", " ")
      : "No next page observed";
  const nextCounts = new Map<string, number>();
  for (const r of selectedRoutes)
    nextCounts.set(
      title(r.next),
      (nextCounts.get(title(r.next)) || 0) + r.sessions,
    );
  const nextSteps = [...nextCounts].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const selectLink = (id: string) => setSelection({ kind: "link", id });
  const expand = (cat: string) => {
    setExpanded((v) =>
      v.includes(cat) ? v.filter((c) => c !== cat) : [...v, cat],
    );
    setSelection(null);
  };
  const linkLabel = (l: (typeof graph.links)[number]) =>
    `${JOURNEY_STAGES[l.stage]}: ${nodeById.get(l.from)!.label} → ${JOURNEY_STAGES[l.stage + 1]}: ${nodeById.get(l.to)!.label}`;
  if (!data.routes.length && data.ambiguousSessions)
    return (
      <p className="empty-small">
        No reliably ordered journeys in this selection.{" "}
        {number(data.ambiguousSessions)} sessions have simultaneous page
        timestamps; no sequence is inferred.
      </p>
    );
  if (!data.totalSessions)
    return (
      <p className="empty-small">
        No observed journeys in this selection yet. As visits arrive, this
        diagram will connect their source, first page, next page, and last
        observed page.
      </p>
    );
  return (
    <div className="journey-flow">
      <div className="journey-toolbar">
        <p>
          <strong>{number(graph.sessions)}</strong> sessions{" "}
          {focus ? "in focused cohort" : "shown"} · width = sessions
        </p>
        <div className="journey-actions">
          {focus && (
            <button
              onClick={() => {
                setFocus(null);
                setSelection(null);
              }}
            >
              Show all sessions
            </button>
          )}
          {expanded.length > 0 && (
            <button
              onClick={() => {
                setExpanded([]);
                setSelection(null);
              }}
            >
              Collapse all categories
            </button>
          )}
        </div>
      </div>
      {data.omittedSessions > 0 && (
        <p className="journey-notice">
          Showing the 300 most common source/first/next/last combinations.{" "}
          {number(data.omittedSessions)} of {number(data.totalSessions)}{" "}
          matching sessions are outside this diagram. Flow percentages use only
          the sessions shown.
        </p>
      )}
      {data.ambiguousSessions > 0 && (
        <p className="journey-notice">
          {number(data.ambiguousSessions)} matching sessions have simultaneous
          page timestamps and are excluded because their order cannot be
          established.
        </p>
      )}
      {data.contentFilter && (
        <p className="journey-notice">
          Sessions that viewed {data.contentFilter}. Other pages in those
          sessions remain visible to preserve the observed sequence.
        </p>
      )}
      {data.continuedSessions > 0 && (
        <p className="footnote">
          {number(data.continuedSessions)} matching sessions were already
          observed before this date range. “First” means the first page within
          this range.
        </p>
      )}
      {graph.sessions < 20 && (
        <p className="journey-notice">
          Small sample: {number(graph.sessions)} sessions. Treat these paths as
          observations, not stable patterns.
        </p>
      )}
      <div className="journey-legend">
        <span>Destination page engagement</span>
        <span className="journey-gradient" aria-hidden="true" />
        <span>0% → 100%</span>
        <span className="footnote">
          10+ active seconds on that page · gray for no next page · select for
          exact rates
        </span>
      </div>
      <p className="footnote">
        Solid bands connect consecutive observations. Dashed bands lead to a
        last-observed summary: it can repeat the next page or omit intermediate
        pages. It is not an additional page view or a confirmed exit.
      </p>
      <div ref={detailRef} className="journey-detail" aria-live="polite">
        <div className="journey-detail-heading">
          <h3>
            {selectedLink
              ? linkLabel(selectedLink)
              : selectedNode
                ? `${JOURNEY_STAGES[selectedNode.stage]}: ${selectedNode.label}`
                : "Explore a flow"}
          </h3>
          {selected && (
            <button onClick={() => setSelection(null)}>Clear selection</button>
          )}
        </div>
        <p>
          {selected
            ? `${number(sessions)} sessions · ${rate(sessions, graph.sessions)} of this diagram${sessions < 20 ? " · small sample" : ""}`
            : "Select a band or page group to inspect its sessions. Select a category, then expand it to see individual pages."}
        </p>
        <div className="journey-detail-metrics">
          <span>
            <strong>{rate(sum("engagedSessions"), sessions)}</strong> sessions
            with an engaged page
          </span>
          <span>
            <strong>
              {sessions ? Math.round(sum("seconds") / sessions) : 0}s
            </strong>{" "}
            active time / session in range
          </span>
          {selectedLink && (
            <span>
              <strong>
                {rate(selectedLink.engaged, selectedLink.measured)}
              </strong>{" "}
              destination engaged ({number(selectedLink.engaged)}/
              {number(selectedLink.measured)}) ·{" "}
              {selectedLink.measured
                ? Math.round(selectedLink.seconds / selectedLink.measured) +
                  "s / destination view"
                : "no next page to measure"}
            </span>
          )}
        </div>
        {selected && (
          <>
            <p className="footnote">
              {number(sum("continued"))} continued beyond the second page;{" "}
              {number(sum("additionalViews"))} intermediate page views are
              omitted from the last-observed summary. Active sessions may
              continue.
            </p>
            <div className="journey-actions">
              {selectedNode?.category && selectedNode.category !== "Home" && (
                <button onClick={() => expand(selectedNode.category!)}>
                  {expanded.includes(selectedNode.category)
                    ? "Collapse"
                    : "Expand"}{" "}
                  {selectedNode.category}
                </button>
              )}
              {sessions < graph.sessions && (
                <button
                  onClick={() => {
                    setFocus(selectedRoutes);
                    setSelection(null);
                  }}
                >
                  Focus on these sessions
                </button>
              )}
            </div>
            <details>
              <summary>Second observed pages for these sessions</summary>
              <ol className="journey-next-list">
                {nextSteps.map(([name, n]) => (
                  <li key={name}>
                    <span>{name}</span>
                    <strong>
                      {number(n)} · {rate(n, sessions)}
                    </strong>
                  </li>
                ))}
              </ol>
            </details>
          </>
        )}
      </div>
      <p className="footnote journey-scroll-hint">
        Scroll the diagram horizontally on smaller screens. Keyboard users can
        tab through bands and groups, or use the flow table below.
      </p>
      <div
        className="journey-canvas"
        tabIndex={0}
        role="region"
        aria-label="Journey diagram, scroll to explore"
      >
        <svg
          viewBox={`0 0 ${graph.width} ${graph.height}`}
          width={graph.width}
          height={graph.height}
          role="group"
          aria-label="Session journeys from arrival source to last observed page"
        >
          <title>Observed session journeys</title>
          <desc>
            Band widths represent sessions. Color represents the share of
            destination page views with at least ten active seconds. The final
            column is a summary, not necessarily a consecutive step.
          </desc>
          {JOURNEY_STAGES.map((s, i) => (
            <text key={s} x={18 + i * 310} y={20} className="journey-stage">
              {s}
            </text>
          ))}
          {graph.links.map((l) => (
            <g key={l.id}>
              <path
                d={l.path}
                fill="none"
                stroke={color(l.engaged, l.measured)}
                strokeWidth={l.width}
                strokeDasharray={l.stage === 2 ? "24 8" : undefined}
                className={`journey-band ${selection && !(selection.kind === "link" ? selection.id === l.id : l.from === selection.id || l.to === selection.id) ? "muted" : ""}`}
              />
              <path
                d={l.path}
                fill="none"
                stroke="transparent"
                strokeWidth={Math.max(12, l.width)}
                role="button"
                tabIndex={0}
                aria-pressed={
                  selection?.kind === "link" && selection.id === l.id
                }
                aria-label={`${linkLabel(l)}. ${number(l.sessions)} sessions. Destination engagement ${rate(l.engaged, l.measured)}. Select for details.`}
                className="journey-hit"
                onClick={() => selectLink(l.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectLink(l.id);
                  }
                }}
              >
                <title>
                  {linkLabel(l)} · {number(l.sessions)} sessions ·{" "}
                  {rate(l.engaged, l.measured)} destination engagement
                </title>
              </path>
            </g>
          ))}
          {graph.nodes.map((n) => (
            <g
              key={n.id}
              role="button"
              tabIndex={0}
              aria-pressed={selection?.kind === "node" && selection.id === n.id}
              aria-label={`${JOURNEY_STAGES[n.stage]}: ${n.label}. ${number(n.sessions)} sessions.${n.expandable ? " Select to expand this category." : ""}`}
              className="journey-node"
              onClick={() => setSelection({ kind: "node", id: n.id })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelection({ kind: "node", id: n.id });
                }
              }}
            >
              <title>
                {n.label} · {number(n.sessions)} sessions
              </title>
              <rect
                x={n.x}
                y={n.y}
                width={8}
                height={n.height}
                className="journey-node-bar"
              />
              <rect
                x={n.x - 4}
                y={n.y + n.height / 2 - 22}
                width={196}
                height={44}
                fill="transparent"
                className="journey-node-hit"
              />
              <text
                x={n.x + 15}
                y={n.y + n.height / 2 - 3}
                className="journey-node-label"
              >
                {short(n.label)}
                {n.expandable ? " +" : ""}
              </text>
              <text
                x={n.x + 15}
                y={n.y + n.height / 2 + 14}
                className="journey-node-count"
              >
                {number(n.sessions)} sessions
              </text>
            </g>
          ))}
        </svg>
      </div>
      <p className="footnote">
        Categories start collapsed. Expanded categories show their four
        most-observed pages; remaining pages stay in an “Other” group. Sources
        beyond the top six stay in “Other sources”. Every displayed session is
        counted once per column. Repeated pages are retained.
      </p>
      {selected && (
        <button className="journey-details-link" onClick={revealDetails}>
          View selected flow details ↑
        </button>
      )}
      <details className="journey-table">
        <summary>View all connections ({number(graph.links.length)})</summary>
        <ol className="journey-mobile-list">
          {graph.links.map((l) => (
            <li key={l.id}>
              <p>
                {linkLabel(l)}
                {l.stage === 2 ? " (summary)" : ""}
              </p>
              <p>
                {number(l.sessions)} sessions · {rate(l.engaged, l.measured)}{" "}
                destination engagement ({number(l.engaged)}/{number(l.measured)}
                ){l.sessions < 20 ? " · small sample" : ""}
              </p>
              <button
                onClick={() => {
                  selectLink(l.id);
                  revealDetails();
                }}
              >
                Inspect flow
              </button>
            </li>
          ))}
        </ol>
        <div className="table-wrap journey-desktop-table">
          <table>
            <thead>
              <tr>
                <th>Connection</th>
                <th>Sessions</th>
                <th>Destination engagement</th>
                <th>Explore</th>
              </tr>
            </thead>
            <tbody>
              {graph.links.map((l) => (
                <tr key={l.id}>
                  <td>
                    {linkLabel(l)}
                    {l.stage === 2 ? " (summary)" : ""}
                  </td>
                  <td>{number(l.sessions)}</td>
                  <td>
                    {rate(l.engaged, l.measured)} · {number(l.engaged)}/
                    {number(l.measured)}
                    {l.sessions < 20 ? " · small sample" : ""}
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        selectLink(l.id);
                        revealDetails();
                      }}
                    >
                      Inspect flow
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
