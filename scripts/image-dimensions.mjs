// Record the pixel dimensions of every optimizable image under public/images
// in config/image-dimensions.json. The Markdown renderer reads that manifest
// instead of the files, so the serverless function never has to trace
// public/images (which would drag hundreds of megabytes into the bundle).
//
// Runs automatically before `npm run dev` and `npm run build`.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { imageSize } from 'image-size';

const OPTIMIZABLE = /\.(jpe?g|png|webp|avif)$/i;
const root = process.cwd();
const imagesDir = join(root, 'public', 'images');
const out = join(root, 'config', 'image-dimensions.json');

const manifest = {};
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!OPTIMIZABLE.test(entry.name)) continue;
    try {
      const { width, height } = imageSize(readFileSync(file));
      if (width && height) manifest['/' + relative(join(root, 'public'), file)] = [width, height];
    } catch (error) {
      console.warn(`Could not read dimensions of ${file}: ${error.message}`);
    }
  }
}
walk(imagesDir);

const sorted = Object.fromEntries(Object.keys(manifest).sort().map(key => [key, manifest[key]]));
const json = JSON.stringify(sorted, null, 0).replace(/],"/g, '],\n"').replace('{"', '{\n"').replace(/]}$/, ']\n}') + '\n';
const previous = existsSync(out) ? readFileSync(out, 'utf8') : '';
if (previous !== json) {
  writeFileSync(out, json);
  console.log(`Wrote dimensions for ${Object.keys(sorted).length} images to ${relative(root, out)}`);
}
