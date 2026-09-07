# Homepage review — September 7, 2026

Reviewed the personal website's routing, content utilities, homepage rendering, metadata, and validation commands. This is a focused code review, not an exhaustive audit of external links or all interactive components.

## Fixed

- Missing migration redirects: Next config now generates permanent redirects for all 23 current blog slugs and three known historical aliases. Dated `/notes/YYYY/M/D/slug` and undated `/notes/slug` paths work. Dates deliberately do not need to match frontmatter because the land-value-tax post was republished. Unknown slugs remain 404s. The canonical `/blog/slug` URL is included in post metadata.
- Duplicated content loading: one reader now supplies pages, metadata, listings, and related items. React request-scoped caching avoids duplicate reads during rendering without persistent stale content.
- Unsafe filesystem lookup: category and slug validation prevent reads outside the intended content directory. Filename and directory identity override conflicting frontmatter.
- A malformed Markdown file could discard a whole category listing. Each file is now isolated. The parser's global cache is disabled because it caches incomplete results before parsing succeeds.
- Related items could surface entries marked private. They now skip those entries and continue until the requested limit is filled. Private still means hidden from discovery; direct URLs remain accessible, matching the existing content convention.
- The initial review encountered a local editorial prototype. The fixes have since been moved to the exact deployed production commit, preserving the production homepage and its existing interactive masonry grid.
- Custom hover prefetching ran alongside automatic viewport prefetching. Links now prefetch on hover or keyboard focus instead of eagerly fetching every visible card's route.
- Next 16 no longer supports `next lint`. The lint script invokes ESLint directly; test and typecheck scripts were added.
- Viewport settings prevented mobile zoom. Removed the maximum-scale restriction.

## Work-page improvements

- Titles and descriptions precede hero media; CED and SVA now have titles.
- Prose uses a centered reading column, and Google Maps research areas use matching headings without wording changes.
- Galleries render only the active image, scope keyboard handling to focus, tolerate malformed hashes, and provide arrows, a counter, full-size links, and a full-width image selector.
- Report navigation uses clickable thumbnail previews, previous/next links, and original-size images.
- The quantitative-history map is embedded with a full-screen link.
- The course outline uses weekly sections and lesson rows while preserving the original wording.

## Validation

The final 36-test suite covers content loading, legacy redirects, all blog sources, Markdown structure, and report navigation. Production build, TypeScript, and ESLint passed. Browser checks verified legacy redirect chains, desktop/mobile work-page layouts, gallery controls and hashes, report thumbnails and navigation, and the restored WebGL map embed.

## Remaining opportunities

- The Markdown renderer and imported blog formatting were addressed in the [follow-up visual review](blog-visual-review.md).
- Homepage cards use original images with no reserved aspect ratio. Responsive thumbnails and measured dimensions would reduce transfer size and layout shifts; verify representative photography and work images before changing their presentation.
- React 19 is paired with React 18 types; Next 16 is paired with Next 15 ESLint configuration. Align these in a dependency maintenance pass with a lockfile update.
- Historical slugs absent from both this repository and its content cannot be inferred reliably. Add any additional recovered aliases to `config/legacy-blog-redirects.mjs`.

Changes need deployment before public legacy links recover. No production deployment was performed during this review.
