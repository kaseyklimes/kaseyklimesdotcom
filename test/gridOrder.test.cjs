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

test('leaves an already mixed list untouched', () => {
  const items = seq('PBWPBW');
  assert.deepEqual(distributeByCategory(items), items);
});

test('pulls the nearest other category forward to break a run', () => {
  assert.equal(cats(distributeByCategory(seq('PPPPBPPW'))), 'PBPWPPPP');
});

test('moves an item at most window - 1 places earlier', () => {
  // B starts at index 5. Window 3 reaches it once it is 2 places away, no sooner.
  assert.equal(cats(distributeByCategory(seq('PPPPPB'), 3)), 'PPPBPP');
  assert.equal(cats(distributeByCategory(seq('PPPPPB'), 6)), 'PBPPPP');
});

test('keeps each category in its original order', () => {
  const out = distributeByCategory(seq('PPPBBBWWWPPP'));
  for (const c of 'PBW') {
    const idx = out.filter(item => item.category === c).map(item => item.i);
    assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
  }
});

test('a run survives only when no other category is within reach', () => {
  const out = cats(distributeByCategory(seq('PPPPPPPPPPPPB'), 10));
  assert.equal(out, 'PPPBPPPPPPPPP');
  assert.equal(cats(distributeByCategory(seq('PPPPPPPPPPPPB'), 1)), 'PPPPPPPPPPPPB');
});
