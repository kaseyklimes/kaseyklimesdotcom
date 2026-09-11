import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { collectImages, createJobs, parseArgs, warmJob } from '../scripts/warm-image-cache.mjs';
import { imageDeviceSizes, imageFormats } from '../config/image-optimization.mjs';

test('versioned fonts are byte-identical, content-addressed, and referenced by CSS and preloads', () => {
  const manifest = JSON.parse(readFileSync('config/font-assets.json', 'utf8'));
  const css = readFileSync('src/app/fonts.css', 'utf8');
  const layout = readFileSync('src/app/layout.tsx', 'utf8');
  for (const [original, versioned] of Object.entries(manifest)) {
    const bytes = readFileSync(`public${original}`);
    assert.deepEqual(readFileSync(`public${versioned}`), bytes);
    assert.ok(versioned.includes(createHash('sha256').update(bytes).digest('hex').slice(0, 16)));
    assert.ok(css.includes(versioned.replaceAll(' ', '%20')));
  }
  const preloads = [...layout.matchAll(/href="(\/fonts\/[^\"]+)"/g)].map(m => decodeURI(m[1]));
  assert.equal(preloads.length, 3);
  for (const url of preloads) assert.ok(Object.values(manifest).includes(url));
  assert.ok(!css.includes("url('/fonts/Berkeley"));
});

test('warming includes public covers and photo series, skipping private and bypassed media', () => {
  const dir = mkdtempSync(join(tmpdir(), 'warm-images-'));
  try {
    for (const category of ['photography', 'work', 'shelf']) mkdirSync(join(dir, category));
    const put = (category, name, yaml, body = '') => writeFileSync(join(dir, category, `${name}.md`), `---\n${yaml}\n---\n${body}`);
    put('photography', 'series', 'heroImage: /images/cover.jpg\nseries: [/images/extra.png, /images/cover.jpg]');
    put('photography', 'private', 'private: true\nheroImage: /images/private.jpg');
    put('work', 'thumb', 'heroImage: /images/hero.jpg\nthumbnail: /images/thumb.webp');
    put('work', 'svg', 'heroImage: /images/logo.svg');
    put('work', 'remote', 'heroImage: https://example.com/image.jpg');
    put('shelf', 'book', 'heroImage: /images/book.jpg');
    assert.deepEqual(collectImages(dir), ['/images/book.jpg', '/images/cover.jpg', '/images/extra.png', '/images/thumb.webp']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('warming stays off article body images, which would multiply the transformation bill', () => {
  const dir = mkdtempSync(join(tmpdir(), 'warm-body-'));
  try {
    mkdirSync(join(dir, 'blog'));
    const body = ['![a chart](/images/chart.png)', '![](/images/photo.jpeg)'].join('\n\n');
    writeFileSync(join(dir, 'blog', 'post.md'), `---\nheroImage: /images/hero.png\n---\n${body}`);
    assert.deepEqual(collectImages(dir), ['/images/hero.png']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the width ladder stays short enough to keep the transformation bill in budget', () => {
  // widths × formats is the per-image transformation count; every step added
  // here is bought again for all ~650 images in public/images.
  assert.ok(imageDeviceSizes.length * imageFormats.length <= 10,
    `${imageDeviceSizes.length} widths × ${imageFormats.length} formats is too many variants per image`);
  assert.deepEqual([...imageDeviceSizes].sort((a, b) => a - b), imageDeviceSizes);
});

test('origin, --only and --limit parse independently of argument order', () => {
  assert.deepEqual(parseArgs([]), { dryRun: false, limit: 0, only: null, origin: 'https://www.kaseyklimes.com' });
  const parsed = parseArgs(['--only', 'nyc-\\d', 'https://preview.example.com/', '--limit', '12', '--dry-run']);
  assert.equal(parsed.origin, 'https://preview.example.com');
  assert.equal(parsed.limit, 12);
  assert.equal(parsed.dryRun, true);
  assert.ok(parsed.only.test('/images/nyc-4.png'));
  assert.ok(!parsed.only.test('/images/memex.jpg'));
  // `--flag=value` is equivalent, and a pattern is never mistaken for the origin.
  assert.equal(parseArgs(['--only=nyc', '--limit=3']).origin, 'https://www.kaseyklimes.com');
  assert.throws(() => parseArgs(['--nope']), /Unknown option --nope/);
});

test('every configured device width and format is warmed with unchanged quality', async () => {
  const jobs = createJobs(['/images/example.jpg']);
  assert.equal(jobs.length, imageDeviceSizes.length * imageFormats.length);
  assert.deepEqual([...new Set(jobs.map(j => j.w))], imageDeviceSizes);
  for (const job of jobs) {
    const result = await warmJob('https://example.com', job, async (url, options) => {
      assert.equal(new URL(url).searchParams.get('q'), '75');
      assert.equal(new URL(url).searchParams.get('w'), String(job.w));
      assert.equal(options.headers.Accept, job.format);
      return new Response('image', { headers: { 'content-type': job.format } });
    });
    assert.equal(result.ok, true);
  }
});

test('passthrough originals are retried instead of reported as warmed', async () => {
  let calls = 0;
  const result = await warmJob('https://example.com', createJobs(['/images/example.jpg'])[0], async () => {
    calls++;
    return new Response('image', { headers: { 'content-type': calls === 1 ? 'image/jpeg' : 'image/avif' } });
  });
  assert.equal(calls, 2);
  assert.equal(result.ok, true);
});

test('persistent original-image responses are reported separately without changing delivery', async () => {
  let calls = 0;
  const result = await warmJob('https://example.com', createJobs(['/images/example.jpg'])[0], async () => {
    calls++;
    return new Response('image', { headers: { 'content-type': 'image/png' } });
  });
  assert.equal(calls, 3);
  assert.equal(result.ok, true);
  assert.equal(result.passthrough, true);
});

test('HTTP errors remain failures after retries', async () => {
  const result = await warmJob('https://example.com', createJobs(['/images/example.jpg'])[0], async () => new Response('not found', { status: 404 }));
  assert.equal(result.ok, false);
});
