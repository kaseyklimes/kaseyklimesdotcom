const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Compile the small server utility graph in memory; no emitted files or extra test dependencies.
const root = path.resolve(__dirname, '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'homepage-content-'));
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} };
  modules.set(file, module);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  vm.runInThisContext(`(function(require, module, exports, process) {${outputText}\n})`, { filename: file })(
    name => name.startsWith('@/') ? load(path.join(root, 'src', name.slice(2) + '.ts')) : require(name),
    module, module.exports, { cwd: () => fixture, env: { HIDE_TWEETS: 'true' } },
  );
  return module.exports;
}
function write(slug, text) {
  fs.writeFileSync(path.join(fixture, 'content/blog', `${slug}.md`), text);
}
fs.mkdirSync(path.join(fixture, 'content/blog'), { recursive: true });
write('a-broken', '---\ntitle: [broken\n---\n');
write('b-hidden', '---\ntitle: Hidden\nprivate: true\n---\nbody');
write('c-current', '---\ntitle: Current\ncategory: work\nslug: wrong\n---\nbody');
write('d-public', '---\ntitle: Public\nstars: 4\n---\nbody');
write('e-public', '---\ntitle: Also public\n---\n');
const api = load(path.join(root, 'src/utils/content.ts'));
after(() => fs.rmSync(fixture, { recursive: true, force: true }));

test('rejects traversal, invalid categories, missing posts, and disabled tweets', () => {
  assert.equal(api.getContentBySlug('blog', '../blog/c-current'), null);
  assert.equal(api.getContentBySlug('../blog', 'c-current'), null);
  assert.equal(api.getContentBySlug('blog', 'missing'), null);
  assert.equal(api.getContentBySlug('tweet', 'c-current'), null);
  assert.deepEqual(api.getAllContent({ category: '../blog' }), []);
  assert.deepEqual(api.getContentPaths('tweet'), []);
});

test('disk identity overrides frontmatter and metadata excludes Markdown body', () => {
  const item = api.getContentBySlug('blog', 'c-current');
  assert.equal(item.category, 'blog');
  assert.equal(item.slug, 'c-current');
  assert.equal(item.hasContent, true);
  const all = api.getAllContent({ category: 'blog' });
  assert.equal(all.length, 4); // One malformed file must not discard its entire category.
  assert.ok(all.every(item => !('content' in item)));
});

test('related content skips private and malformed files and fills the requested limit', () => {
  assert.deepEqual(api.getRelatedContent('blog', 'c-current', 2).map(item => item.slug), ['d-public', 'e-public']);
  assert.deepEqual(api.getRelatedContent('blog', 'c-current', 0), []);
  assert.deepEqual(api.getRelatedContent('blog', 'c-current', Infinity), []);
});
