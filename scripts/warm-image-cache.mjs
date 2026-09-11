// Warm the same q=75 variants served by next/image, without changing any assets.
// npm run warm-images -- [https://www.kaseyklimes.com] [--dry-run]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import { imageDeviceSizes, imageFormats } from '../config/image-optimization.mjs';

export function collectImages(contentDir = join(process.cwd(), 'content')) {
  const images = new Set();
  for (const category of ['blog', 'work', 'play', 'talks', 'photography', 'shelf']) {
    const dir = join(contentDir, category);
    let files;
    try { files = readdirSync(dir); } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    for (const file of files.filter(file => file.endsWith('.md'))) {
      const { data } = matter(readFileSync(join(dir, file), 'utf8'));
      if (data.private) continue;
      // All local grid covers, plus photography detail/slideshow images. Article
      // body images are deliberately left out: warming bills one transformation
      // per uncached variant, and covering them too would more than double an
      // already outsized bill for variants most readers never request.
      const sources = [data.thumbnail || data.heroImage];
      if (category === 'photography') sources.push(data.heroImage, ...(Array.isArray(data.series) ? data.series : []));
      for (const src of sources) {
        // SVGs, GIFs, videos and external thumbnails do not use this raster pipeline.
        if (typeof src === 'string' && /^\/images\/.*\.(jpe?g|png|webp|avif)$/i.test(src)) images.add(src);
      }
    }
  }
  return [...images].sort();
}

export function createJobs(images) {
  return images.flatMap(src => imageDeviceSizes.flatMap(w => imageFormats.map(format => ({ src, w, format }))));
}

export async function warmJob(origin, { src, w, format }, fetcher = fetch) {
  const url = `${origin}/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;
  let reason, original;
  for (let attempt = 1; attempt <= 3; attempt++) {
    original = undefined;
    try {
      const response = await fetcher(url, {
        headers: { Accept: format },
        signal: AbortSignal.timeout(45_000),
      });
      const bytes = (await response.arrayBuffer()).byteLength;
      const type = (response.headers.get('content-type') || '').split(';')[0];
      if (response.ok && type === format && bytes > 0) return { ok: true, bytes };
      reason = `HTTP ${response.status}, ${type || 'no content type'}, ${bytes} bytes`;
      if (response.ok && bytes > 0 && ['image/png', 'image/jpeg', 'image/gif'].includes(type)) {
        original = { ok: true, bytes, passthrough: true, type };
      }
    } catch (error) { reason = error.message; }
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1000));
  }
  // The optimizer may retain the original format. Preserve that delivery decision.
  return original || { ok: false, reason };
}

/**
 * `origin` is the lone positional argument. `--limit N` requests only the first
 * N variants, and `--only <pattern>` keeps just the image paths it matches:
 * warming bills one image transformation per uncached variant, so together they
 * warm a single post's new images, or probe how the deployed optimizer is
 * answering, without paying for a full pass.
 */
export function parseArgs(args) {
  const flags = { dryRun: false, limit: 0, only: null };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const [name, inline] = args[i].startsWith('--') ? args[i].split(/=(.*)/s) : [null];
    if (name === '--dry-run') flags.dryRun = true;
    else if (name === '--limit') flags.limit = Number(inline ?? args[++i]);
    else if (name === '--only') flags.only = new RegExp(inline ?? args[++i]);
    else if (name) throw new Error(`Unknown option ${name}`);
    else positional.push(args[i]);
  }
  return { ...flags, origin: (positional[0] || 'https://www.kaseyklimes.com').replace(/\/$/, '') };
}

async function main() {
  const { origin, limit, only, dryRun } = parseArgs(process.argv.slice(2));
  const images = collectImages().filter(src => !only || only.test(src));
  const all = createJobs(images);
  const jobs = limit > 0 ? all.slice(0, limit) : all;
  console.log(`${all.length} variants: ${images.length} images × ${imageDeviceSizes.length} widths × ${imageFormats.length} formats on ${origin}`);
  if (limit > 0) console.log(`--limit ${limit}: requesting ${jobs.length} of them`);
  if (dryRun) return;
  let completed = 0, failures = 0, passthroughs = 0;
  const queue = [...jobs];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const job = queue.shift();
      const result = await warmJob(origin, job);
      completed++;
      if (result.passthrough) {
        passthroughs++;
        console.log(`ORIGINAL ${job.src} w=${job.w} requested ${job.format}, received ${result.type}`);
      }
      if (!result.ok) {
        failures++;
        console.error(`FAIL ${job.src} w=${job.w} ${job.format}: ${result.reason}`);
      }
      if (completed % 50 === 0 || completed === jobs.length) console.log(`${completed}/${jobs.length} complete; ${failures} failures; ${passthroughs} original-format responses`);
    }
  }));
  process.exitCode = failures ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
