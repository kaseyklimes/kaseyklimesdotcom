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
const { formatDateOrRange, datePrecisionFor } = load(path.join(root, 'src/utils/dateFormatting.ts'));

test('full dates render with the day by default', () => {
  assert.equal(formatDateOrRange('07-06-2025'), 'July 6, 2025');
});

test('month precision drops the day from full dates and leaves coarser dates alone', () => {
  assert.equal(formatDateOrRange('07-06-2025', 'month'), 'July 2025');
  assert.equal(formatDateOrRange('07-2024', 'month'), 'July 2024');
  assert.equal(formatDateOrRange('2011', 'month'), '2011');
  assert.equal(formatDateOrRange('2017-2021', 'month'), '2017–2021');
});

test('photography is the only category capped at month precision', () => {
  assert.equal(datePrecisionFor('photography'), 'month');
  assert.equal(datePrecisionFor('blog'), 'day');
  assert.equal(datePrecisionFor(undefined), 'day');
});
