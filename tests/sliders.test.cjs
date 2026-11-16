'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { bindSlider } = require('../plugin/ui/sliders.js');
const { makeDocument } = require('./ui-fixture.cjs');
function fixture(overrides = {}) {
  const doc = makeDocument(), input = doc.createElement('input'), slider = doc.createElement('sp-slider'), previews = [], commits = [];
  input.value = '8'; const binding = bindSlider(input, slider, { min: 1, max: 500, step: 1, railMax: 64, reset: 8, preview: v => previews.push(v), commit: v => commits.push(v), ...overrides });
  return { input, slider, previews, commits, binding };
}
test('native slider previews without saving on every tick and commits an exact current value on release', async () => {
  const f = fixture(); f.slider.value = 12; await f.slider.fire('input'); f.slider.value = 16; await f.slider.fire('input');
  assert.equal(f.input.value, '16'); assert.deepEqual(f.previews, [12, 16]); assert.deepEqual(f.commits, []);
  await f.slider.fire('change'); assert.deepEqual(f.commits, [16]);
});
test('exact values extend the convenience rail without shrinking it under a moving thumb', async () => {
  const f = fixture(); f.input.value = '500'; await f.input.fire('input'); assert.equal(f.slider.value, 500); assert.equal(f.slider.getAttribute('max'), '500');
  f.binding.sync(120); assert.equal(f.slider.getAttribute('max'), '500'); assert.equal(f.slider.value, 120);
  f.input.value = '1.5'; await f.input.fire('input'); assert.equal(f.input.value, '1.5'); assert.equal(f.slider.value, 120);
  f.input.value = ''; await f.input.fire('input'); assert.equal(f.slider.value, 120);
});
test('double-click reset synchronizes both values and late release cannot restore the previous drag', async () => {
  const f = fixture(); f.input.value = '500'; await f.input.fire('input'); await f.slider.fire('dblclick');
  assert.equal(f.input.value, '8'); assert.equal(f.slider.value, 8); assert.equal(f.slider.getAttribute('max'), '64');
  await f.slider.fire('change'); assert.deepEqual(f.commits, [8, 8]);
  f.binding.disable(true); f.slider.value = 40; await f.slider.fire('input'); await f.slider.fire('dblclick'); assert.equal(f.input.value, '8');
  assert.equal(f.slider.getAttribute('disabled'), ''); f.binding.disable(false); assert.equal(f.slider.getAttribute('disabled'), null);
});
test('zero and fractional action settings retain exact values and presets can define reset dynamically', async () => {
  const f = fixture({ min: 0, max: 100, step: 0.1, reset: () => 5 });
  f.input.value = '0'; await f.input.fire('input'); assert.equal(f.slider.value, 0);
  f.slider.value = 12.5; await f.slider.fire('input'); assert.equal(f.input.value, '12.5');
  await f.slider.fire('dblclick'); assert.equal(f.input.value, '5'); assert.equal(f.commits.at(-1), 5);
});
