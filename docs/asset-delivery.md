# Asset delivery

Font files under `public/fonts/versioned/` are byte-identical copies of the original fonts. Each filename contains the first 16 hexadecimal characters of its SHA-256 hash. Only this directory receives a one-year immutable cache header; old font URLs keep their existing behavior.

When changing a font, create a new hashed filename, update `config/font-assets.json`, its `src/app/fonts.css` reference, and any matching preload in `src/app/layout.tsx`. Keep previously published files. Never overwrite a versioned font. `test/asset-delivery.test.mjs` verifies byte identity, hashes, and references. Font weights, display settings and all three existing preloads are unchanged.

`npm run warm-images` prepares local raster grid covers across all public content categories and photography covers/series. It requests every configured device width in AVIF and WebP separately with the existing quality of 75. It does not rewrite images, change browser loading priorities or change responsive selection. SVGs, GIFs, video and remote images are excluded. `--dry-run` prints the workload without network requests; an optional origin argument targets a different deployment.

The GitHub workflow is manual dispatch only. It limits requests to four concurrently, retries unsuccessful transforms, verifies returned image types and reports original-format responses separately after retries. HTTP failures, empty bodies and unexpected content types fail the job. Original-format responses retain the optimizer’s existing delivery decision. `--only <pattern>` warms just the matching paths and `--limit <n>` caps the number of variants requested; both are exposed as dispatch inputs, so publishing new photography can warm those files alone.

Image widths/formats are shared between Next configuration and the warmer in `config/image-optimization.mjs`. Current coverage is 117 images, 5 widths, 2 formats (1170 requests before retries). Existing image assets and encoding settings remain unchanged.

## Image transformation budget

Vercel bills one image transformation per uncached variant, and the monthly allowance is the real constraint on this site: every source image can become `widths × formats` variants, so the catalogue is far larger than the allowance. When the allowance is spent the optimizer answers `HTTP 402` for any variant it has not already cached, and readers see broken images — cached variants keep serving, so the damage shows up first on the least-visited pages rather than the home grid.

This happened on 11 September 2026. Running a full warm pass on every production deployment spent thousands of transformations a week; article body images, which are never warmed, were the first to break. Three things keep the bill down: the ladder in `config/image-optimization.mjs` stays short, warming is manual and narrow, and `minimumCacheTTL` stays at a year so variants are bought once. Before widening the ladder or automating warming again, check Usage → Image Optimization in the Vercel dashboard.
