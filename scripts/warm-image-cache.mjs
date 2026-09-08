// Pre-render the large image variants on the deployed site so visitors never
// hit a cold transform. Cold transforms of the biggest sources take 4–10s and
// Vercel occasionally answers them with the untouched multi-megabyte original.
//
//   npm run warm-images                 # warms https://www.kaseyklimes.com
//   npm run warm-images -- https://host # warms another deployment
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const origin = (process.argv[2] || 'https://www.kaseyklimes.com').replace(/\/$/, '');
// Widths a detail page (1200px slot) or the full-screen viewer (100vw) can request.
const widths = [1200, 1920, 2048, 2560, 3840];
const concurrency = 4;

const dir = join(process.cwd(), 'content', 'photography');
const images = new Set();
for (const file of readdirSync(dir)) {
  if (!file.endsWith('.md')) continue;
  const { data } = matter(readFileSync(join(dir, file), 'utf8'));
  if (data.private) continue;
  for (const src of [data.heroImage, ...(Array.isArray(data.series) ? data.series : [])]) {
    if (typeof src === 'string' && src.startsWith('/images/')) images.add(src);
  }
}

const jobs = [];
for (const src of images) for (const w of widths) jobs.push({ src, w });
console.log(`Warming ${jobs.length} variants (${images.size} images × ${widths.length} widths) on ${origin}`);

let passthroughs = 0, failures = 0;
async function warm({ src, w }) {
  const url = `${origin}/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;
  const started = Date.now();
  try {
    const res = await fetch(url, { headers: { Accept: 'image/avif,image/webp,*/*' } });
    const bytes = (await res.arrayBuffer()).byteLength;
    const type = res.headers.get('content-type') || '';
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    const flag = !res.ok ? 'FAIL' : type.includes('jpeg') || type.includes('png') ? 'PASSTHROUGH' : 'ok';
    if (flag === 'FAIL') failures += 1;
    if (flag === 'PASSTHROUGH') passthroughs += 1;
    console.log(`${flag.padEnd(11)} ${res.status} ${String(Math.round(bytes / 1024)).padStart(6)}KB ${secs.padStart(5)}s ${src} w=${w}`);
    return flag;
  } catch (err) {
    failures += 1;
    console.log(`FAIL        ${src} w=${w} ${err.message}`);
    return 'FAIL';
  }
}

// A passthrough means the transform was still running; asking again gets the real variant.
const queue = [...jobs];
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (queue.length) {
    const job = queue.shift();
    if (await warm(job) === 'PASSTHROUGH') await warm(job);
  }
}));
console.log(`Done. ${passthroughs} passthrough(s) retried, ${failures} failure(s).`);
process.exit(failures ? 1 : 0);
