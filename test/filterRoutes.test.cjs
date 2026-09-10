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
const { filterPath, filterTag } = load(path.join(root, 'src/utils/filterRoutes.ts'));

test('each filter has a shareable URL matching its visible label', () => {
  for (const [tag, url] of [
    ['all', '/'], ['blog', '/notes'], ['photography', '/images'],
    ['work', '/work'], ['play', '/play'], ['talks', '/talks'], ['shelf', '/shelf'],
  ]) {
    assert.equal(filterPath(tag), url);
    assert.equal(filterTag(url), tag === 'all' ? null : tag);
    assert.equal(filterTag(url === '/' ? url : url + '/'), tag === 'all' ? null : tag);
  }
});

test('detail paths do not select a collection filter', () => {
  assert.equal(filterTag('/work/google'), null);
  assert.equal(filterTag('/photography/azores1'), null);
});
