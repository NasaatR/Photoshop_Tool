'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { createTooltips, placeTooltip } = require('../plugin/ui/tooltips.js');
const { makeDocument, Element } = require('./ui-fixture.cjs');
function clock() {
  let now = 0, id = 0; const tasks = new Map();
  return { set(fn, delay) { tasks.set(++id, { at: now + delay, fn }); return id; }, clear(key) { tasks.delete(key); },
    tick(ms) { now += ms; for (const [key, task] of [...tasks]) if (task.at <= now) { tasks.delete(key); task.fn(); } }, get size() { return tasks.size; } };
}
function fixture() {
  const doc = makeDocument(), root = doc.createElement('div'); root.setAttribute('id', 'photoshoptool');
  doc.defaultView = new Element('window', doc);
  const timer = clock(), tips = createTooltips(doc, root, timer), a = doc.createElement('div'), b = doc.createElement('div');
  root.appendChild(a); root.appendChild(b);
  tips.bind(a, () => ({ title: 'Smart Object', body: 'Convert selected layers; otherwise stamp visible.' }));
  tips.bind(b, () => ({ title: 'Curves', body: 'Add Curves clipped to the selected layer.' }));
  return { root, doc, timer, tips, a, b, tip: root.children[0], title: root.children[0].children[0] };
}
test('hover opens an actual tooltip without title attributes and focus opens it immediately', async () => {
  const f = fixture(); await f.a.fire('mouseenter'); f.timer.tick(179); assert.equal(f.tip.hidden, true);
  f.timer.tick(1); assert.equal(f.tip.hidden, false); assert.equal(f.title.textContent, 'Smart Object');
  assert.equal(f.a.getAttribute('title'), null); assert.equal(f.a.getAttribute('aria-describedby'), 'pt-tooltip');
  f.tips.dismiss(); await f.b.fire('focus'); assert.equal(f.tip.hidden, false); assert.equal(f.title.textContent, 'Curves');
});
test('rapid pointer reversal never opens a stale tooltip or leaves timers after teardown', async () => {
  const f = fixture(); await f.a.fire('mouseenter'); f.timer.tick(100); await f.a.fire('mouseleave'); await f.b.fire('mouseenter');
  f.timer.tick(100); assert.equal(f.tip.hidden, true); f.timer.tick(80); assert.equal(f.title.textContent, 'Curves');
  await f.b.fire('mouseleave'); await f.a.fire('mouseenter'); f.tips.destroy(); f.timer.tick(1000);
  assert.equal(f.tip.hidden, true); assert.equal(f.timer.size, 0);
  await f.a.fire('focus'); assert.equal(f.tip.hidden, true);
});
test('tooltip stays readable across pointer transfer and closes after leaving both surfaces', async () => {
  const f = fixture(); await f.a.fire('mouseenter'); f.timer.tick(180);
  await f.a.fire('mouseleave'); f.timer.tick(70); await f.tip.fire('mouseenter'); f.timer.tick(1000);
  assert.equal(f.tip.hidden, false); await f.tip.fire('mouseleave'); f.timer.tick(140); assert.equal(f.tip.hidden, true);
  assert.equal(f.a.getAttribute('aria-describedby'), null); assert.equal(f.timer.size, 0);
});
test('focus, resize and window/panel dismissal do not leave hidden descriptions or orphan listeners', async () => {
  const f = fixture(); await f.a.fire('focus'); await f.root.fire('mouseleave'); assert.equal(f.tip.hidden, false);
  await f.doc.defaultView.fire('resize'); assert.equal(f.tip.hidden, true); assert.equal(f.a.getAttribute('aria-describedby'), null);
  await f.b.fire('focus'); await f.doc.defaultView.fire('blur'); assert.equal(f.tip.hidden, true);
  f.tips.destroy(); assert.equal(f.doc.defaultView.listeners.resize.length, 0); assert.equal(f.doc.defaultView.listeners.blur.length, 0);
});
test('tooltip placement stays inside narrow, short and offset panels at all anchor edges', () => {
  for (const width of [176, 240, 345]) for (const height of [96, 174, 360]) for (const x of [0, width - 32]) for (const y of [0, height - 32]) {
    const panel = { left: 100, top: 200, width, height }, anchor = { left: 100 + x, top: 200 + y, width: 32, height: 32 };
    const p = placeTooltip(panel, anchor, 270, 140);
    assert.ok(p.left >= 6 && p.top >= 6); assert.ok(p.left + p.width <= width - 6); assert.ok(p.top + p.height <= height - 6);
  }
});
