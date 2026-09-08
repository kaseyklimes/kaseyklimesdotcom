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
const { seriesImages, isPhotoSeries } = load(path.join(root, 'src/utils/photoSeries.ts'));

test('series lists extra photos and ignores blanks and non-strings', () => {
  assert.deepEqual(seriesImages({ series: ['/a.jpg', '', 3, '/b.jpg'] }), ['/a.jpg', '/b.jpg']);
  assert.equal(isPhotoSeries({ series: ['/a.jpg'] }), true);
});

test('entries without a series are not series', () => {
  assert.deepEqual(seriesImages({}), []);
  assert.deepEqual(seriesImages({ series: 'not-a-list' }), []);
  assert.equal(isPhotoSeries({ series: [] }), false);
});
