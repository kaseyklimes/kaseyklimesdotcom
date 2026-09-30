# Analytics visualization review

Reviewed against the live website and an isolated fixture spanning 420 days. Fixture data is not production traffic.

| Before | After |
| --- | --- |
| Serif headline, green palette, rounded dashboard cards | Berkeley Mono and the site's foreground/background tokens; monochrome charts, understated rules, minimal radii, and automatic light/dark colors |
| Charts only handled up to 30 days | Today, yesterday, 7/14/30/90/180/365/730 days, year-to-date, custom dates, and all time; exact UTC boundaries are visible |
| Dense daily bars regardless of selected period | Automatic daily/weekly/monthly grouping plus a manual grouping control; zero-based count axis and exact interval values |
| Session counts could be misleading if daily counts were summed | Each time bin deduplicates sessions independently; cross-boundary counting and partial intervals are explained |
| Unavailable pre-tracking history could look like zero traffic | Unmeasured intervals say “Not tracked”; tracking start and actual range are displayed |
| Acquisition/content matrix emphasized volume | Fixed 0–100% engagement-rate shading, explicit engaged/total denominators, low-sample labels, and source/device/country comparisons |
| Missing data could look like 0% | Cells with no views use a dash, distinct from measured 0% engagement |
| A high CTR from a tiny sample could appear definitive | Exposed-view and clicked-view counts, 95% Wilson intervals, low-sample flags, and optional CTR sorting restricted to 20+ impressions |
| Card click counts mixed direct navigation and exposure | CTR requires a measured impression and matching card click on the same page view; outbound destinations are measured separately |
| Content popularity lacked context | Views, sessions, active time, scroll depth, and engagement are adjacent; sortable page table and current tag/format/emphasis comparisons |
| Top-eight rankings concealed the remainder | Rankings state displayed/total rows and allow expanding all entries; numbers directly label bar lengths |
| Journey strings obscured direction | A ranked From/To/Transitions table uses readable content titles; no fabricated links across filtered-out pages |
| Country codes and URL slugs required interpretation | Country names and Markdown content titles are used when available |
| Dark-mode chart legend and matrix sublabels were too faint | Text uses higher-contrast tokens; series use both tone and hatching, not color alone |
| Mobile date labels overlapped | Reduced label density, horizontally scrollable dense charts/tables, compact filter typography, and shorter metric descriptions |
| Numeric movement and small controls added friction | Tabular numerals, visible keyboard focus, 40+ pixel controls, reduced-motion support, and an accessible table alternative for traffic |
| No transparent coverage state | Storage/ingest limits produce dated warnings; existing history is retained instead of silently pruned |

Simple charts are intentional: ranked bars and the transition table make exact comparisons easier than a map or Sankey for this site's likely traffic volume. The heatmap earns its complexity by comparing audiences against multiple content categories simultaneously. Confidence intervals are used only where a rate based on limited exposure can otherwise be misleading.

Verification included real browser review at desktop and a narrow mobile viewport, populated and empty data states, all-time selection, source filtering, keyboard-accessible controls, and comparison of displayed metrics with the fixture aggregates. The remaining data limits are stated in the dashboard: sessions are not people, time/scroll are proxies for attention, audience categories are observed context, and relationships are not causal effects.

## Interactive journeys

| Before | After |
| --- | --- |
| Only a consecutive-transition table | A session-weighted flow diagram connects source, first in-range page, next observed page, and last-observed summary; the original transition table remains available |
| Volume alone conveyed interest | A fixed 0–100% sequential engagement scale, exact engaged/view denominators, and active-time details distinguish attention from traffic |
| Categories offered no path drill-down | Select a category and expand it into named pages; top-four page and top-six source grouping keeps less common observations in explicit “Other” groups |
| A merged diagram could suggest paths belonging to different sessions | Focus rebuilds the entire diagram from only the actual matching session combinations; content filters retain intervening pages |
| Final destinations could imply a direct jump or confirmed exit | Dashed endpoint-summary bands, explicit repeated-page handling, and omitted-intermediate counts distinguish last observed pages from consecutive steps |
| Small or incomplete samples were easy to overlook | Low-sample notices, pre-range session context, explicit top-300 route omissions, and exclusion of timestamp ties make coverage clear |
| Thin bands were difficult to inspect on small screens | Keyboard-operable SVG controls, a desktop flow table, and a mobile connection list offer the same metrics and selection actions; wide diagrams scroll inside their container |

Validation: model tests cover chronological order, preserved content-filter context, cumulative engagement, repeated and single-page visits, date boundaries, anonymous aggregation, simultaneous observations, and route limits. Geometry tests verify conserved session totals and band widths across every column before and after category expansion. Browser review used isolated long-range fixtures with short, long, and repeated-page visits. Live collection and authorization are unchanged.

## Historical presentations and engaged visits

| Before | After |
| --- | --- |
| Today's stars and thumbnails could be mistaken for historical evidence | Per-card history preserves observed stars, position, responsive geometry, viewport context, and immutable content/media/build identifiers |
| Click-through ended before destination attention | Four explicit stages separate qualified exposure, click, confirmed arrival, and 10-second engaged arrival; continuation and active time remain adjacent |
| Small conversion samples could look conclusive | Counts and 95% Wilson intervals accompany engaged arrivals per 100 exposures, with low-sample labels and 20-exposure rate sorting |
| Old measurement might silently mix with the new funnel | Unversioned exposures are explicitly excluded; historical CTR remains available with its measurement change disclosed |
| History could overwhelm the primary comparison | A per-card Inspect control expands a contextual table; version identifiers use progressive disclosure and wide tables scroll within mobile containers |
| Reused rate tooltip described clicks | Rate markers now accept a metric-specific outcome description for accurate accessible/tool-tip text |

Reviewed desktop and narrow mobile layouts in the production build using isolated Redis fixtures. Browser collection verified actual viewport-qualified exposures and an explicit same-tab click/arrival with measured destination attention. Integration tests cover immutable snapshots, out-of-order delivery and retries; model tests cover unmatched navigation, date/filter boundaries, oversized cards, variant separation and first-arrival attribution. The four-stage summary and aligned counts are intentionally simpler than a tapered funnel that could exaggerate small differences or imply unobserved transitions.
