const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function load(file) {
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  vm.runInThisContext(`(function(require, module, exports) {${outputText}\n})`, { filename: file })(require, module, module.exports);
  return module.exports;
}
const { isLoopingVideo, getVideoInfo } = load(path.join(root, 'src/utils/mediaDetection.ts'));

test('local mp4 and webm files are looping videos; images and embeds are not', () => {
  assert.equal(isLoopingVideo('/images/thisland.mp4'), true);
  assert.equal(isLoopingVideo('/images/clip.webm?v=2'), true);
  assert.equal(isLoopingVideo('/images/thisland.gif'), false);
  assert.equal(isLoopingVideo('https://youtu.be/abc123'), false);
  assert.equal(isLoopingVideo(undefined), false);
  assert.equal(getVideoInfo('/images/thisland.mp4').isVideo, false);
});
