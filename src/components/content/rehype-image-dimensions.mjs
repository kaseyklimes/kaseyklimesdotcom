// Attach intrinsic dimensions to local Markdown images so the renderer can
// reserve their space (no layout shift) and route them through the image
// optimizer with a `sizes` hint that matches the slot they render in.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { imageSize } from 'image-size';

// Formats the optimizer resizes and re-encodes. SVGs and GIFs pass through
// untouched, so they stay plain <img> elements.
const OPTIMIZABLE = /\.(jpe?g|png|webp|avif)$/i;
const cache = new Map();

export function isOptimizableLocalImage(src) {
  return typeof src === 'string' && src.startsWith('/images/') && OPTIMIZABLE.test(src);
}

/** Pixel dimensions of a file under public/, or null when unknown. */
export function localImageDimensions(src, root = process.cwd()) {
  if (!isOptimizableLocalImage(src)) return null;
  const key = `${root}:${src}`;
  if (cache.has(key)) return cache.get(key);
  let result = null;
  try {
    const file = join(root, 'public', decodeURIComponent(src));
    if (existsSync(file)) {
      const { width, height } = imageSize(readFileSync(file));
      if (width && height) result = { width, height };
    }
  } catch {
    result = null;
  }
  cache.set(key, result);
  return result;
}

const isElement = (node, tag) => node.type === 'element' && node.tagName === tag;
const hasClass = (node, name) => Array.isArray(node.properties?.className) && node.properties.className.includes(name);

function countImages(node) {
  if (isElement(node, 'img')) return 1;
  return (node.children || []).reduce((sum, child) => sum + countImages(child), 0);
}

export default function rehypeImageDimensions({ root } = {}) {
  return tree => {
    // The first optimizable image in the document is the likely largest
    // contentful paint, so it is flagged to load eagerly.
    let priorityPending = true;
    function visit(node, columns, inIndex) {
      if (isElement(node, 'img')) {
        const { properties } = node;
        if (properties.width || properties.height) return; // author-sized: leave alone
        const dims = localImageDimensions(properties.src, root);
        if (!dims) return;
        properties.width = dims.width;
        properties.height = dims.height;
        properties.dataOptimize = '';
        if (columns > 1) properties.dataColumns = columns;
        if (priorityPending && !inIndex) {
          properties.dataPriority = '';
          priorityPending = false;
        }
        return;
      }
      if (!node.children) return;
      const nextColumns = hasClass(node, 'markdown-images') ? countImages(node) : columns;
      const nextInIndex = inIndex || hasClass(node, 'report-index');
      for (const child of node.children) visit(child, nextColumns, nextInIndex);
    }
    visit(tree, 1, false);
  };
}
