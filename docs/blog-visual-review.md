# Blog rendering review — September 7, 2026

Reviewed all 23 blog routes at 1280px desktop and 390px mobile widths, using full-page captures and checks for broken media, empty lists/quotes, captions, titles, and horizontal overflow.

| Before | After |
| --- | --- |
| Long Primitive positioning copy on the homepage and work card | “Founder of Primitive” and “Decision infrastructure for coordinated intelligence” |
| 61 imported captions looked like prose or leaked underscores and spacing entities | Explicit `Caption:` source paragraphs become smaller, muted semantic `figcaption` elements; links and emphasis remain intact |
| Detached list numbers, heading-sized list items, and duplicated housing headings | Real numbered/bulleted lists with consistent indentation and spacing |
| Empty quote markers, detached quote paragraphs, and a duplicated land-tax quotation | Proper blockquotes with a restrained left rule and the duplicate removed |
| Multiple title-sized H1s per essay and inconsistent hierarchy | One article title per post, with section and subsection headings below it |
| Very wide body text and inconsistent section spacing | A consistent reading column, balanced headings, and responsive type/spacing |
| Images shared paragraphs with prose; paired images worked differently in column-based posts | Semantic figures and responsive image groups, original aspect ratios, subtle outlines, and lazy image loading |
| Footnotes used disconnected/external anchors or disappeared from rendering | 62 local footnote definitions across five essays, numbered references, and working return links |
| Tables and code could overflow or conflict with pipe-based layout heuristics | GFM tables/footnotes, scrollable tables/code, and explicit column markers; code fences keep layout markers literal |
| A large inline renderer with separate rendering paths | Shared Markdown component, isolated figure transform, and layout parser; regression tests cover all blog sources |
| Legacy guest-speaker layout depended on flattening inline Markdown | Explicit responsive columns keep each portrait, name, and bio together |

Also repaired malformed emphasis and a broken Markdown link in the housing post. Writing content and image assets remain otherwise as authored; the private improv draft retains its private flag.

See [Writing Markdown](writing-markdown.md) for the supported source conventions. Tests cover every article's structure plus captions, linked images, nested lists, tables, footnotes, and fenced layout markers.

No production deployment was performed. These changes take effect publicly after deployment.

## Production baseline correction

Vercel deployment `dpl_HiqiW9kQZkTqNBsrHtXx3D9iucTo` confirms the public site is built from `main` at `d856c8e9b0a710259464d03dc4aee7651e2b94ee`. The edits now sit on `fix/production-site-cleanup` from that exact commit. The homepage route and Tailwind configuration match production; the original introduction and filterable masonry grid are restored. The prototype remains on `prototype/editorial-home`, and a snapshot of the original working edits is saved in `/tmp/personal-prototype-backup-20260907-135741`.
