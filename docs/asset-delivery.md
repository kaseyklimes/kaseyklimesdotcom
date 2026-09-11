# Asset delivery

Font files under `public/fonts/versioned/` are byte-identical copies of the original fonts. Each filename contains the first 16 hexadecimal characters of its SHA-256 hash. Only this directory receives a one-year immutable cache header; old font URLs keep their existing behavior.

When changing a font, create a new hashed filename, update `config/font-assets.json`, its `src/app/fonts.css` reference, and any matching preload in `src/app/layout.tsx`. Keep previously published files. Never overwrite a versioned font. `test/asset-delivery.test.mjs` verifies byte identity, hashes, and references. Font weights, display settings and all three existing preloads are unchanged.

`npm run warm-images` prepares local raster grid covers across all public content categories and photography covers/series. It requests every configured device width in AVIF and WebP separately with the existing quality of 75. It does not rewrite images, change browser loading priorities or change responsive selection. SVGs, GIFs, video and remote images are excluded. `--dry-run` prints the workload without network requests; an optional origin argument targets a different deployment.

The GitHub workflow runs after successful production deployment statuses, with manual dispatch available as a fallback. It checks out the deployed commit, limits requests to four concurrently, retries unsuccessful transforms, verifies returned image types and reports original-format responses separately after retries. HTTP failures, empty bodies and unexpected content types fail the job. Original-format responses retain the optimizer’s existing delivery decision. Warming costs image transformations/cache operations; cached requests can still involve cache reads. Cache eviction and regional misses remain possible, so warming is not a permanent guarantee of hits.

Image widths/formats are shared between Next configuration and the warmer in `config/image-optimization.mjs`. Current coverage is 117 images, 9 widths, 2 formats (2106 requests before retries). Existing image assets and encoding settings remain unchanged.
