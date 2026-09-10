const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const matter = require('gray-matter');
const root = path.resolve(__dirname, '..');
const { outputText } = ts.transpileModule(fs.readFileSync(path.join(root, 'src/utils/shelfOrder.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});
const loaded = { exports: {} };
new Function('exports', outputText)(loaded.exports);
const { orderShelfItems, SHELF_ALBUM_SLUGS, SHELF_COLUMN_GAP, SHELF_ITEM_GAP } = loaded.exports;
const dimensions = require('../config/image-dimensions.json');
const items = fs.readdirSync(path.join(root, 'content/shelf')).filter(f => f.endsWith('.md')).sort().map(file => {
  const { data } = matter(fs.readFileSync(path.join(root, 'content/shelf', file), 'utf8'));
  const [width, height] = dimensions[data.heroImage];
  return { ...data, slug: file.slice(0, -3), imageDimensions: { width, height } };
});
const isAlbum = item => SHELF_ALBUM_SLUGS.has(item.slug);

test('shelf albums have no vertical or horizontal neighbors at every responsive width', () => {
  // Sweep every pixel, including all one-to-five-column breakpoints and the max-width cap.
  for (let viewport = 320; viewport <= 1920; viewport++) {
    const count = Math.max(1, Math.min(5, Math.floor((viewport - 48) / 200)));
    // Homepage has px-4; the standalone shelf increases padding at larger breakpoints.
    for (const padding of new Set([32, viewport >= 1024 ? 64 : viewport >= 640 ? 48 : 32])) {
      const width = (Math.min(1280, viewport) - padding - (count - 1) * SHELF_COLUMN_GAP) / count;
      const ordered = orderShelfItems(items, count, width);
      assert.equal(ordered[0].slug, 'patternlanguage');
      assert.deepEqual(ordered.map(i => i.slug).sort(), items.map(i => i.slug).sort());
      // Books and other media retain their relative order, apart from the requested first item.
      assert.deepEqual(ordered.filter(i => !isAlbum(i) && i.slug !== 'patternlanguage'),
        items.filter(i => !isAlbum(i) && i.slug !== 'patternlanguage'));
      const heights = Array(count).fill(0), last = Array(count).fill(null), albums = [];
      ordered.forEach((item, index) => {
        const column = index % count, top = heights[column];
        const bottom = top + width * item.imageDimensions.height / item.imageDimensions.width;
        if (isAlbum(item)) {
          assert.ok(!last[column] || !isAlbum(last[column]), `vertical albums at ${viewport}px`);
          for (const album of albums) {
            if (Math.abs(album.column - column) === 1) {
              assert.ok(top >= album.bottom + SHELF_COLUMN_GAP || bottom + SHELF_COLUMN_GAP <= album.top,
                `horizontal albums at ${viewport}px: ${item.slug} and ${album.slug}`);
            }
          }
          albums.push({ column, top, bottom, slug: item.slug });
        }
        heights[column] = bottom + SHELF_ITEM_GAP;
        last[column] = item;
      });
    }
  }
});

test('ordering does not mutate the source and preserves an already separated shelf', () => {
  const original = [...items];
  const ordered = orderShelfItems(items, 1, 320);
  assert.deepEqual(items, original);
  assert.deepEqual(orderShelfItems(ordered, 1, 320), ordered);
  assert.deepEqual(orderShelfItems([], 1, 320), []);
});
