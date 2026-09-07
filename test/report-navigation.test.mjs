import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import rehypeFigures from '../src/components/content/rehype-figures.mjs';

const render = (content, reportPages) => renderToStaticMarkup(React.createElement(ReactMarkdown, {
  rehypePlugins: [[rehypeFigures, { reportPages }]],
}, content));

test('report pages link to original images, preserve authored links and captions, and navigate within bounds', () => {
  const html = render('Intro\n\n![First](/one.png)\n\nCaption: Original caption.\n\n[![Second](/two.png)](/authored-link)\n\nClosing words.', true);
  assert.match(html, /<p>Intro<\/p>/);
  assert.match(html, /Original caption\./);
  assert.match(html, /href="\/one.png" target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /href="\/authored-link"><img/);
  assert.match(html, /Page 1 of 2/);
  assert.match(html, /Page 2 of 2/);
  assert.equal((html.match(/>Previous<\/a>/g) || []).length, 1);
  assert.equal((html.match(/>Next<\/a>/g) || []).length, 1);
  assert.doesNotMatch(html, /href="#report-page-(0|3)"/);
  assert.match(html, /Browse report pages \(2\)/);
  assert.match(html, /<p>Closing words\.<\/p>/);
});

test('ordinary images and empty reports do not gain report controls', () => {
  assert.doesNotMatch(render('![First](/one.png)', false), /report-page|View full size/);
  assert.equal(render('Just text.', true), '<p>Just text.</p>');
});
