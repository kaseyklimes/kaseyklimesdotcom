const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Compile the pure grid filter in memory, the same way content.test.cjs loads utilities.
const root = path.resolve(__dirname, '..');
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} };
  modules.set(file, module);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  vm.runInThisContext(`(function(require, module, exports) {${outputText}\n})`, { filename: file })(
    name => name.startsWith('@/') ? load(path.join(root, 'src', name.slice(2) + '.ts')) : require(name),
    module, module.exports,
  );
  return module.exports;
}
const { filterGridItems, MOBILE_MIN_STARS } = load(path.join(root, 'src/utils/gridFilter.ts'));

const card = (slug, stars, tags, extra = {}) => ({ title: slug, slug, date: '2024', category: tags[0], stars, tags, ...extra });
const items = [
  card('big-work', 5, ['work']),
  card('small-work', 1, ['work']),
  card('small-play', 1, ['play']),
  card('small-blog', 1, ['blog']),
  card('big-blog', 2, ['blog']),
  card('secret', 5, ['work'], { private: true }),
  card('shelf', 5, ['shelf'], { category: 'shelf' }),
];
const slugs = list => list.map(item => item.slug).sort();

test('a selected filter shows every public card in that tag regardless of stars, on mobile and desktop', () => {
  for (const isMobile of [true, false]) {
    assert.deepEqual(slugs(filterGridItems(items, 'work', isMobile)), ['big-work', 'small-work']);
    assert.deepEqual(slugs(filterGridItems(items, 'play', isMobile)), ['small-play']);
    assert.deepEqual(slugs(filterGridItems(items, 'blog', isMobile)), ['big-blog', 'small-blog']);
    assert.deepEqual(slugs(filterGridItems(items, 'shelf', isMobile)), ['shelf']);
  }
});

test('the unfiltered view hides low-star cards only on mobile', () => {
  assert.equal(MOBILE_MIN_STARS, 2);
  assert.deepEqual(slugs(filterGridItems(items, null, true)), ['big-blog', 'big-work']);
  assert.deepEqual(slugs(filterGridItems(items, 'all', true)), ['big-blog', 'big-work']);
  assert.deepEqual(slugs(filterGridItems(items, null, false)), ['big-blog', 'big-work', 'small-blog', 'small-play', 'small-work']);
});

test('private cards and the shelf card never appear in the unfiltered view', () => {
  for (const isMobile of [true, false]) {
    const shown = slugs(filterGridItems(items, null, isMobile));
    assert.ok(!shown.includes('secret'));
    assert.ok(!shown.includes('shelf'));
  }
});
