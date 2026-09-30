"use client";
import { useMemo, useState } from "react";
import type {
  summarizePresentation,
  FunnelRow,
} from "@/lib/analytics/presentation";
import RateMark from "./RateMark";
const number = (n: number) => n.toLocaleString();
const rate = (n: number, d: number) =>
  d ? `${Math.round((100 * n) / d)}%` : "—";
export default function PresentationFunnel({
  data,
  titles,
}: {
  data: ReturnType<typeof summarizePresentation>;
  titles: Record<string, string>;
}) {
  const [selected, setSelected] = useState<string | null>(null),
    [sort, setSort] = useState("engaged");
  const cards = useMemo(() => {
    const map = new Map<
      string,
      {
        target: string;
        seen: number;
        clicked: number;
        arrived: number;
        engaged: number;
        continued: number;
        seconds: number;
        variants: FunnelRow[];
      }
    >();
    for (const r of data.rows) {
      const c = map.get(r.target) || {
        target: r.target,
        seen: 0,
        clicked: 0,
        arrived: 0,
        engaged: 0,
        continued: 0,
        seconds: 0,
        variants: [],
      };
      for (const k of [
        "seen",
        "clicked",
        "arrived",
        "engaged",
        "continued",
        "seconds",
      ] as const)
        c[k] += r[k];
      c.variants.push(r);
      map.set(r.target, c);
    }
    return [...map.values()];
  }, [data.rows]);
  const chosen = cards.find((c) => c.target === selected);
  const title = (p: string) => (p === "/" ? "Home" : titles[p] || p);
  return (
    <>
      <p className="footnote">
        Versioned, qualified card exposures → clicks → confirmed same-tab
        arrivals → destination views with 10+ active seconds. Each exposure
        receives credit for its first confirmed arrival only. Content filters select the card’s
        category; source, device, and country describe its originating session.
      </p>
      <div className="presentation-totals">
        {(
          [
            [
              "Exposures",
              data.totals.seen,
              "Distinct presentation per source view",
            ],
            [
              "Clicked",
              data.totals.clicked,
              `${rate(data.totals.clicked, data.totals.seen)} of exposures`,
            ],
            [
              "Arrived",
              data.totals.arrived,
              `${rate(data.totals.arrived, data.totals.clicked)} of clicked exposures`,
            ],
            [
              "Engaged",
              data.totals.engaged,
              `${rate(data.totals.engaged, data.totals.arrived)} of arrivals`,
            ],
          ] as const
        ).map(([label, n, note]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{number(n)}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      {!data.rows.length && (
        <p className="empty-small">
          Presentation history begins with the new tracking release. New
          exposures and confirmed arrivals will appear here; earlier visits
          cannot be reconstructed.
        </p>
      )}
      {data.legacyExposures > 0 && (
        <p className="footnote">
          {number(data.legacyExposures)} earlier or unversioned card exposures
          are excluded from this funnel. Their existing click-through history
          remains in “Seen → selected”.
        </p>
      )}
      {data.omittedPresentations > 0 && (
        <p className="journey-notice">
          The table shows the 500 most-exposed presentations.{" "}
          {number(data.omittedExposures)} exposures across{" "}
          {number(data.omittedPresentations)} additional presentations are
          included in the totals above but omitted from the table. Narrow the
          period or filters for a complete comparison.
        </p>
      )}
      {!!cards.length && (
        <>
          <label className="table-control">
            Sort cards by{" "}
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="engaged">Engaged arrivals</option>
              <option value="rate">
                Engaged / 100 exposures (20+ exposures)
              </option>
              <option value="seen">Exposures</option>
            </select>
          </label>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Content card</th>
                  <th>Exposures</th>
                  <th>Clicked</th>
                  <th>Arrived</th>
                  <th>Engaged</th>
                  <th>Engaged / 100 exposures</th>
                  <th>Explored further</th>
                  <th>Active / arrival</th>
                  <th>History</th>
                </tr>
              </thead>
              <tbody>
                {[...cards]
                  .filter((c) => sort !== "rate" || c.seen >= 20)
                  .sort((a, b) =>
                    sort === "rate"
                      ? b.engaged / b.seen - a.engaged / a.seen
                      : sort === "seen"
                        ? b.seen - a.seen
                        : b.engaged - a.engaged || b.seen - a.seen,
                  )
                  .map((c) => (
                    <tr key={c.target}>
                      <td>{title(c.target)}</td>
                      <td>{number(c.seen)}</td>
                      <td>{number(c.clicked)}</td>
                      <td>{number(c.arrived)}</td>
                      <td>{number(c.engaged)}</td>
                      <td>
                        <RateMark outcome="qualified exposures led to an engaged arrival" success={c.engaged} total={c.seen} />
                      </td>
                      <td>{number(c.continued)}</td>
                      <td>
                        {c.arrived
                          ? Math.round(c.seconds / c.arrived) + "s"
                          : "—"}
                      </td>
                      <td>
                        <button
                          className="presentation-inspect"
                          aria-expanded={selected === c.target}
                          onClick={() =>
                            setSelected(selected === c.target ? null : c.target)
                          }
                        >
                          {selected === c.target ? "Hide" : "Inspect"}{" "}
                          {c.variants.length} presentations
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {chosen && (
        <section
          className="presentation-history"
          aria-label={`Presentation history for ${title(chosen.target)}`}
        >
          <h3>{title(chosen.target)} · presentation history</h3>
          <p className="footnote">
            Recorded at exposure, not inferred from today’s layout. A new layout
            or resize can produce another exposure in the same source view.
            Position is top-to-bottom, then left-to-right across the visible
            grid layout. “Initial viewport” describes the card’s location at the
            top of the page, not the visitor’s scroll position.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Observed (UTC)</th>
                  <th>Grid context</th>
                  <th>Presentation</th>
                  <th>Versions</th>
                  <th>Exposed → clicked → arrived → engaged</th>
                  <th>Engaged / 100</th>
                </tr>
              </thead>
              <tbody>
                {chosen.variants.map((r, i) => (
                  <tr key={i}>
                    <td>
                      {new Date(r.firstAt).toISOString().slice(0, 10)}
                      <small>
                        through {new Date(r.lastAt).toISOString().slice(0, 10)}
                      </small>
                    </td>
                    <td>
                      {title(r.origin)}
                      <small>Filter: {r.presentation.filter}</small>
                      <small>
                        {r.presentation.viewportWidth} ×{" "}
                        {r.presentation.viewportHeight} viewport (rounded)
                      </small>
                    </td>
                    <td>
                      {r.presentation.stars} stars · position{" "}
                      {r.presentation.position}
                      <small>
                        {r.presentation.span} / {r.presentation.columns} columns
                        · {r.presentation.width} × {r.presentation.height}px
                        (rounded)
                      </small>
                      <small>
                        {r.presentation.initialViewport
                          ? "In initial viewport"
                          : "Below initial viewport"}
                      </small>
                    </td>
                    <td>
                      <details>
                        <summary>Version identifiers</summary>
                        <small>
                          Build: <code>{r.presentation.build}</code>
                        </small>
                        <small>
                          Content: <code>{r.presentation.content}</code>
                        </small>
                        <small>
                          Thumbnail: <code>{r.presentation.thumbnail}</code>
                        </small>
                        <small>Measurement: v{r.presentation.schema}</small>
                      </details>
                    </td>
                    <td>
                      {r.seen} → {r.clicked} → {r.arrived} → {r.engaged}
                      <small>{r.seen < 20 ? "Small sample" : ""}</small>
                    </td>
                    <td>
                      <RateMark outcome="qualified exposures led to an engaged arrival" success={r.engaged} total={r.seen} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <p className="footnote">
        Exposure requires at least one second of visible time with half the
        viewport-capped card area visible, so tall cards can qualify.
        Attribution requires an explicit click token and arrival within two
        minutes, in the same tab and session. New-tab, external, blocked, and
        unmatched navigations remain unconfirmed. Arrivals and the next distinct
        page must be observed within this date range. Attention is cumulative
        for those destination views as of this report, including later
        heartbeats; recent visits may still mature. “Explored further” is the next recorded page after
        arrival, excluding reloads of the same page. Rates are observational,
        not causal; the rate marker shows a 95% Wilson interval.
      </p>
    </>
  );
}
