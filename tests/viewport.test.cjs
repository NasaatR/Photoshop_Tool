'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { viewportHeight, createViewport } = require('../plugin/ui/viewport.js');
const { makeDocument, Element } = require('./ui-fixture.cjs');
function fixture(options = {}) {
  const doc = makeDocument(), host = doc.createElement('div'), scroll = doc.createElement('div'), footer = doc.createElement('div');
  host.clientHeight = options.height ?? 174; footer.rect = { height: 19 };
  const tasks = new Map(); let serial = 0, callback, observed = 0, disconnected = 0;
  class Observer { constructor(fn) { callback = fn; if (options.reject) throw new Error('Observer unavailable'); } observe() { observed++; } disconnect() { disconnected++; } }
  doc.defaultView = new Element('window', doc);
  const viewport = createViewport(doc, scroll, footer, { Observer, timers: { set(fn) { tasks.set(++serial, fn); return serial; }, clear(id) { tasks.delete(id); } } });
  return { host, scroll, footer, doc, viewport, tasks, observed: () => observed, disconnected: () => disconnected,
    resize(height) { host.clientHeight = height; callback([{ target: host, contentRect: { height } }]); },
    flush() { for (const [key, fn] of [...tasks]) { tasks.delete(key); fn(); } } };
}
test('viewport uses actual panel height and keeps content/footer in normal flow at small sizes', () => {
  assert.equal(viewportHeight(174), 139); assert.equal(viewportHeight(96), 61); assert.equal(viewportHeight(360), 325);
  assert.equal(viewportHeight(0), null); assert.equal(viewportHeight(NaN), null);
  const f = fixture(); f.viewport.mount(f.host); assert.equal(f.scroll.style.height, '139px'); assert.equal(f.scroll.style.flex, '0 0 auto');
  f.resize(96); assert.equal(f.scroll.style.height, '61px'); f.resize(360); assert.equal(f.scroll.style.height, '325px');
  f.viewport.destroy(); assert.equal(f.tasks.size, 0); assert.equal(f.doc.defaultView.listeners.resize.length, 0);
});
test('zero-height startup/hide never assigns a collapsed height; mount/show recovers after layout', () => {
  const f = fixture({ height: 0 }); f.host.rect = { height: 0 }; f.viewport.mount(f.host); assert.equal(f.scroll.style.height, undefined);
  f.host.clientHeight = 174; f.flush(); assert.equal(f.scroll.style.height, '139px');
  f.resize(0); assert.equal(f.scroll.style.height, '139px'); f.resize(240); assert.equal(f.scroll.style.height, '205px');
  f.viewport.destroy();
});
test('observer failure preserves the normal-flow fallback and is visible in diagnostics', async () => {
  const f = fixture({ reject: true }); f.viewport.mount(f.host); assert.equal(f.scroll.style.height, '139px'); assert.match(f.viewport.report().warning, /Observer unavailable/);
  f.host.clientHeight = 200; await f.doc.defaultView.fire('resize'); assert.equal(f.scroll.style.height, '165px');
  f.viewport.destroy();
});
test('repeated show reuses one observer and one pending layout pass', () => {
  const f = fixture(); for (let i = 0; i < 30; i++) f.viewport.mount(f.host);
  assert.equal(f.observed(), 1); assert.equal(f.tasks.size, 1); assert.equal(f.doc.defaultView.listeners.resize.length, 1);
  f.viewport.destroy(); assert.equal(f.disconnected(), 1); f.resize(300); assert.equal(f.scroll.style.height, '139px');
});
