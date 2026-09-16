const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

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
const { distributeByCategory } = load(path.join(root, 'src/utils/gridOrder.ts'));

const seq = (s) => [...s].map((c, i) => ({ category: c, i }));
const cats = (items) => items.map(item => item.category).join('');

test('leaves an already mixed single-column list untouched', () => {
  const items = seq('PBWPBW');
  assert.deepEqual(distributeByCategory(items), items);
});

test('spreads scarce alternatives instead of exhausting them at the beginning', () => {
  const result = cats(distributeByCategory(seq('PPPPBPPW')));
  assert.ok(!result.includes('PPP'), result);
});

test('preserves all items, newest first, category chronology and bounded movement at every width', () => {
  const input = seq('WPPPPPPPPBBBTTWWBBBBBBPPPPWWWWWWWPPP');
  for (let columns = 1; columns <= 5; columns++) {
    const out = distributeByCategory(input, columns);
    assert.equal(out[0], input[0]);
    assert.deepEqual(out.map(x => x.i).sort((a,b) => a-b), input.map(x => x.i));
    out.forEach((item, position) => assert.ok(Math.abs(item.i - position) <= 6));
    for (const category of 'PBTW') {
      assert.deepEqual(out.filter(x => x.category === category), input.filter(x => x.category === category));
    }
    assert.deepEqual(out, distributeByCategory(input, columns));
  }
});

test('handles empty and single-type filters without reordering', () => {
  for (const input of [[], seq('P'), seq('PPPPPPPPPPPP')]) {
    assert.deepEqual(distributeByCategory(input, 5), input);
  }
});

test('wider grids consider more than immediate list neighbors', () => {
  const input = seq('WPBPBPBPBTWTW');
  const neighbors = items => items.reduce((sum, item, i) => sum +
    items.slice(Math.max(0, i - 3), i).filter(other => other.category === item.category).length, 0);
  assert.ok(neighbors(distributeByCategory(input, 5)) < neighbors(input));
});

test('balances the actual archive across all five column counts', () => {
  const matter = require('gray-matter');
  const { parseDateToTimestamp } = load(path.join(root, 'src/utils/dateFormatting.ts'));
  const items = ['blog', 'photography', 'play', 'talks', 'work'].flatMap(category =>
    fs.readdirSync(path.join(root, 'content', category)).filter(file => file.endsWith('.md')).map(file => ({
      ...matter(fs.readFileSync(path.join(root, 'content', category, file), 'utf8')).data,
      category, slug: file,
    }))
  ).filter(item => !item.private && !item.hideFromAll)
    .sort((a,b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date) || b.stars - a.stars);
  const longestRun = list => {
    let longest = 0, run = 0, previous;
    for (const item of list) {
      run = previous === item.category ? run + 1 : 1;
      previous = item.category;
      longest = Math.max(longest, run);
    }
    return longest;
  };
  for (let columns = 1; columns <= 5; columns++) {
    const input = items.filter(item => columns > 1 || item.stars >= 2);
    const output = distributeByCategory(input, columns);
    assert.ok(longestRun(output) < longestRun(input));
    output.forEach((item, index) => assert.ok(Math.abs(input.indexOf(item) - index) <= 6));
    for (const category of new Set(input.map(item => item.category))) {
      assert.deepEqual(output.filter(item => item.category === category), input.filter(item => item.category === category));
    }
  }
});
