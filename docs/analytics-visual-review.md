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
