const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const file = path.resolve(__dirname, '../src/utils/categoryLabel.ts');
const mod = { exports: {} };
const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
});
vm.runInThisContext(`(function(require, module, exports) {${outputText}\n})`, { filename: file })(require, mod, mod.exports);
const { categoryLabel } = mod.exports;

test('renamed categories use their display names', () => {
  assert.equal(categoryLabel('blog'), 'Notes');
  assert.equal(categoryLabel('photography'), 'Images');
});

test('other categories are capitalized slugs', () => {
  assert.equal(categoryLabel('all'), 'All');
  assert.equal(categoryLabel('work'), 'Work');
  assert.equal(categoryLabel('shelf'), 'Shelf');
});
