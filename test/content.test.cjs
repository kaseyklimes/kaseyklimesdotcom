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
    module, module.exports, { cwd: () => fixture, env: {} },
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
fs.mkdirSync(path.join(fixture, 'content/tweet'), { recursive: true });
fs.writeFileSync(path.join(fixture, 'content/tweet/c-current.md'), '---\ntitle: Old tweet\ncategory: tweet\n---\nbody');
const api = load(path.join(root, 'src/utils/content.ts'));
after(() => fs.rmSync(fixture, { recursive: true, force: true }));

test('rejects traversal, invalid categories, missing posts, and removed tweets', () => {
  assert.equal(api.getContentBySlug('blog', '../blog/c-current'), null);
  assert.equal(api.getContentBySlug('../blog', 'c-current'), null);
  assert.equal(api.getContentBySlug('blog', 'missing'), null);
  assert.equal(api.getContentBySlug('tweet', 'c-current'), null);
  assert.deepEqual(api.getAllContent({ category: '../blog' }), []);
  assert.deepEqual(api.getContentPaths('tweet'), []);
  assert.deepEqual(api.getAllContent({ category: 'tweet' }), []);
  assert.ok(api.getAllContent().every(item => item.category !== 'tweet'));
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

test('feed escapes XML, uses absolute links, and omits private posts', async () => {
  write('feed-example', '---\ntitle: A & B < C\ndescription: "Quotes & <tags>"\ndate: 05-02-2023\n---\nbody');
  const { GET } = load(path.join(root, 'src/app/feed.xml/route.ts'));
  const response = GET();
  const xml = await response.text();
  assert.match(response.headers.get('content-type'), /application\/rss\+xml/);
  assert.ok(xml.includes('A &amp; B &lt; C'));
  assert.ok(xml.includes('https://kaseyklimes.com/blog/feed-example'));
  assert.ok(xml.includes('<pubDate>'));
  assert.ok(!xml.includes('b-hidden'));
});

test('sitemap omits private posts and uses frontmatter dates', () => {
  const sitemap = load(path.join(root, 'src/app/sitemap.ts')).default();
  assert.ok(!sitemap.some(item => item.url.includes('b-hidden')));
  const post = sitemap.find(item => item.url.endsWith('/blog/feed-example'));
  assert.equal(post.lastModified.getFullYear(), 2023);
  assert.equal(post.lastModified.getMonth(), 4);
  const { contentDate } = load(path.join(root, 'src/utils/site.ts'));
  assert.equal(contentDate('present'), undefined);
  assert.equal(contentDate('not a date'), undefined);
});

test('raw Markdown preserves source and rejects private, missing, and traversal paths', async () => {
  const { GET } = load(path.join(root, 'src/app/markdown/blog/[slug]/route.ts'));
  const get = slug => GET(new Request('https://kaseyklimes.com/blog/example.md'), { params: Promise.resolve({ slug }) });
  const response = await get('feed-example');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/markdown; charset=utf-8');
  assert.equal(await response.text(), fs.readFileSync(path.join(fixture, 'content/blog/feed-example.md'), 'utf8'));
  for (const slug of ['b-hidden', 'missing', '../blog/feed-example']) {
    assert.equal((await get(slug)).status, 404);
  }
});
