import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import matter from 'gray-matter';
import rehypeFigures from '../src/components/content/rehype-figures.mjs';

function render(content) {
  return renderToStaticMarkup(React.createElement(ReactMarkdown, { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeRaw, rehypeFigures] }, content));
}

test('figures preserve linked images, captions, inline emphasis and ordinary prose', () => {
  const html = render('Before\n![Chart](/chart.png)\nAfter\n\n[![Detail](/detail.png)](/full.png) ![Other](/other.png)\n\nCaption: A **bold** caption with [credit](https://example.com) | a detail.\n\n_Not a caption._');
  assert.match(html, /<p>Before/);
  assert.match(html, /<p>\n?After/);
  assert.equal((html.match(/<figure>/g) || []).length, 2);
  assert.match(html, /<a href="\/full.png"><img/);
  assert.match(html, /<figcaption>A <strong>bold<\/strong> caption with <a href="https:\/\/example.com">credit<\/a> \| a detail\.<\/figcaption>/);
  assert.match(html, /<p><em>Not a caption\.<\/em><\/p>/);
  assert.doesNotMatch(html, /<p>\s*<figure>/);
});

test('GFM tables, nested lists, footnotes, and code remain semantic', () => {
  const html = render('1. First\n   - Nested\n2. Second\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\nA note[^1].\n\n[^1]: Note text.\n\n```md\n![literal](/image.png)\nCaption: literal\n```');
  assert.match(html, /<ol>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<table>/);
  assert.match(html, /data-footnote-ref/);
  assert.match(html, /data-footnote-backref/);
  assert.match(html, /Caption: literal/);
  assert.doesNotMatch(html, /<figure>/);
});

for (const file of readdirSync(new URL('../content/blog/', import.meta.url)).filter(file => file.endsWith('.md'))) {
  test(`clean article structure: ${file}`, () => {
    const {content} = matter(readFileSync(new URL(`../content/blog/${file}`, import.meta.url), 'utf8'));
    const html = render(content);
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert.doesNotMatch(html, /<li>\s*<\/li>|<blockquote>\s*<\/blockquote>/);
    assert.doesNotMatch(html, /&amp;nbsp;|\u00a0{2,}|<p>Caption:/);
    const captions = (content.match(/^Caption:/gm) || []).length;
    assert.equal((html.match(/<figcaption>/g) || []).length, captions);
    assert.doesNotMatch(html, /<p>\s*<figure>/);
  });
}

test('layout markers in fenced code stay literal and normal pipes do not create columns', async () => {
  const ts = await import('typescript');
  const source = readFileSync(new URL('../src/components/content/layout-blocks.ts', import.meta.url), 'utf8');
  const {outputText} = ts.default.transpileModule(source, {compilerOptions: {module: ts.default.ModuleKind.ESNext}});
  const {splitLayoutBlocks} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  const code = '```md\n:::\n<carousel>\n^^literal\n```';
  assert.deepEqual(splitLayoutBlocks(code), [{type: 'markdown', content: code}]);
  assert.deepEqual(splitLayoutBlocks('A | B'), [{type: 'markdown', content: 'A | B'}]);
  assert.deepEqual(splitLayoutBlocks('Intro\n:::\nLeft\n|||\nRight\n:::\n<carousel>\n/image.png\n</carousel>\nEnd').map(block => block.type), ['markdown', 'columns', 'carousel', 'markdown']);
});

test('imported footnotes have local references and visible definitions', () => {
  for (const file of readdirSync(new URL('../content/blog/', import.meta.url)).filter(file => file.endsWith('.md'))) {
    const {content} = matter(readFileSync(new URL(`../content/blog/${file}`, import.meta.url), 'utf8'));
    const html = render(content);
    for (const [, id] of content.matchAll(/^\[\^([^\]]+)\]:/gm)) {
      assert.ok(html.includes(`id="user-content-fn-${id}"`), `${file}: missing footnote ${id}`);
      assert.ok(html.includes(`href="#user-content-fn-${id}"`), `${file}: missing reference ${id}`);
    }
  }
});
