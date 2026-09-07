import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server.js';
import config from '../next.config.mjs';
import { getLegacyBlogRedirects } from '../config/legacy-blog-redirects.mjs';

const origin = 'https://www.kaseyklimes.com';
async function check(source, destination) {
  const response = await unstable_getResponseFromNextConfig({ url: origin + source, nextConfig: config });
  assert.equal(response.status, 308, source);
  assert.equal(response.headers.get('location'), origin + destination);
}

test('renamed housing post preserves query strings and supports padded dates', async () => {
  for (const date of ['2023/5/2', '2023/05/02']) {
    await check(`/notes/${date}/density-doesnt-drive-housing-prices?ref=old`, '/blog/what-really-drives-housing-prices?ref=old');
  }
});

test('every generated redirect has a real target and resolves through Next', async () => {
  for (const rule of getLegacyBlogRedirects()) {
    const source = rule.source.replace(':year(\\d{4})/:month(\\d{1,2})/:day(\\d{1,2})', '2020/1/2');
    await check(source, rule.destination);
  }
});

test('every legacy link embedded in blog content redirects', async () => {
  for (const file of readdirSync(new URL('../content/blog/', import.meta.url))) {
    const content = readFileSync(new URL(`../content/blog/${file}`, import.meta.url), 'utf8');
    for (const [url] of content.matchAll(/https:\/\/(?:www\.)?kaseyklimes\.com\/notes\/[^\s)]+/g)) {
      const response = await unstable_getResponseFromNextConfig({ url, nextConfig: config });
      assert.equal(response.status, 308, url);
    }
  }
});

test('current blog URLs and unknown legacy slugs are not redirected', async () => {
  for (const source of ['/blog/what-really-drives-housing-prices', '/notes/2023/5/2/missing-post']) {
    const response = await unstable_getResponseFromNextConfig({ url: origin + source, nextConfig: config });
    assert.equal(response.headers.get('location'), null);
  }
});
