'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { layerFixture } = require('./layer-fixture.cjs');
const { readSelectionDraft, createPreferences } = require('../plugin/core/preferences.js');
const registry = require('../plugin/tools/index.js');
test('Expand Selection defaults to 8 px, repeats on current selection and leaves layers/channels intact', async () => {
  const f = layerFixture(), original = structuredClone(f.data), bounds = { ...f.doc.selection.bounds }, channel = f.doc.activeChannels;
  f.select([]);
  for (let n = 1; n <= 2; n++) {
    const r = await f.run('selection.expand'); assert.equal(r.status, 'complete', r.error);
    assert.equal(r.expandPx, 8); assert.equal(r.selectionExpanded, true);
    assert.deepEqual(f.doc.selection.bounds, { left: bounds.left - 8 * n, top: bounds.top - 8 * n, right: bounds.right + 8 * n, bottom: bounds.bottom + 8 * n });
    assert.equal(r.pngSaved, false); assert.equal(r.imageCopied, false); assert.equal(r.smartObjectCreated, false);
  }
  assert.deepEqual(f.data, original); assert.deepEqual(f.active, []); assert.equal(f.doc.activeChannels, channel);
  assert.equal(f.doc.channels.length, 1); assert.deepEqual(f.commits, [true, true]);
  assert.deepEqual(f.descriptors, []); assert.ok(!f.events.includes('saveSelection'));
});
test('Expand uses supported exact pixel values and does not depend on PNG options or mask DOM', async () => {
  for (const expandPx of [1, 16, 500]) {
    const f = layerFixture(); const mask = [new Proxy({}, { get() { throw new Error('Mask DOM must not be read'); } })]; f.doc.activeChannels = mask;
    const r = await f.run('selection.expand', { expandPx }); assert.equal(r.status, 'complete', r.error); assert.equal(r.expandPx, expandPx); assert.equal(f.doc.activeChannels, mask);
  }
  assert.deepEqual(registry.get('selection.expand').readOptions({ compression: '', smartAreaBlurPercent: '', expandPx: '8' }), { expandPx: 8 });
});
test('missing selection, invalid values and Quick Mask never broaden selection or mutate history', async () => {
  for (const value of [0, -1, 501, 1.5, '', 'bad']) {
    const f = layerFixture(), before = f.doc.selection.bounds;
    const r = await f.run('selection.expand', { expandPx: value }); assert.equal(r.status, 'error'); assert.equal(f.doc.selection.bounds, before); assert.equal(f.commits.length, 0);
  }
  for (const kind of ['none', 'quick-mask']) {
    const f = layerFixture(); if (kind === 'none') f.doc.selection.bounds = null; else f.doc.quickMaskMode = true;
    assert.equal((await f.run('selection.expand')).status, 'error'); assert.ok(!f.events.includes('expand')); assert.equal(f.commits.length, 0);
  }
});
test('Expand revalidates focus and selection after acquiring Photoshop; native failure/cancel rolls back', async () => {
  const changed = layerFixture({ onModal: ({ app }) => { app.activeDocument = { id: 99 }; } });
  assert.equal((await changed.run('selection.expand')).status, 'error'); assert.ok(!changed.events.includes('expand'));
  const removed = layerFixture({ onModal: ({ doc }) => { doc.selection.bounds = null; } });
  assert.equal((await removed.run('selection.expand')).status, 'error'); assert.ok(!removed.events.includes('expand'));
  for (const failure of ['expand', 'cancelExpand']) {
    const f = layerFixture({ [failure]: true }), bounds = f.doc.selection.bounds, pixels = f.doc.selection.mask;
    const r = await f.run('selection.expand'); assert.equal(r.status, failure === 'cancelExpand' ? 'cancelled' : 'error'); assert.equal(r.selectionExpanded, undefined);
    assert.equal(f.doc.selection.bounds, bounds); assert.equal(f.doc.selection.mask, pixels); assert.deepEqual(f.commits, [false]);
    if (failure === 'expand') { assert.equal(r.code, -42); assert.match(r.failure.cause.message, /Injected expand failure/); }
  }
});
test('Expand settings have independent acknowledged persistence and a strict native range', () => {
  const stored = new Map([['pngrelay.settings.v1', 'unchanged'], ['photoshoptool.smartArea.v2', 'keep']]);
  const prefs = createPreferences({ getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) });
  assert.equal(prefs.selection().expandPx, 8); prefs.saveSelection({ schema: 1, expandPx: 500 }); assert.equal(prefs.selection().expandPx, 500);
  assert.equal(stored.get('pngrelay.settings.v1'), 'unchanged'); assert.equal(stored.get('photoshoptool.smartArea.v2'), 'keep');
  assert.deepEqual(readSelectionDraft({ expandPx: '1' }), { expandPx: 1 });
  for (const value of ['0', '1.5', '', '501']) assert.throws(() => readSelectionDraft({ expandPx: value }), /1 to 500 px/);
});
