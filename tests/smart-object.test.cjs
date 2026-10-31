'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { fixture } = require('./fixture.cjs');
test('Smart Object preserves the direct selected-pixel-layer path', async () => {
  const f = fixture(); const r = await f.run('png.selection-smart');
  assert.equal(r.status, 'complete'); assert.equal(r.smartInput, 'selected-pixel-layer'); assert.equal(r.smartScope, 'pixel-selection');
  assert.ok(!f.events.includes('mergeVisible')); assert.ok(!f.events.includes('saveSelection')); assert.equal(f.source.layers.length, 2);
});
test('non-pixel, multiple or no active layers stamp visible pixels and preserve the exact selection', async () => {
  for (const scenario of ['text', 'group', 'smart', 'none', 'multiple']) {
    const f = fixture(), original = f.source.layers[0], bounds = f.source.selection.bounds, mask = f.source.selection.mask;
    const hidden = f.makeLayer('Hidden'); hidden.visible = false; f.source.layers.push(hidden);
    if (scenario === 'none') f.source.activeLayers = [];
    else if (scenario === 'multiple') f.source.activeLayers = [original, hidden];
    else { original.kind = scenario === 'text' ? f.C.LayerKind.TEXT : scenario === 'group' ? f.C.LayerKind.GROUP : f.C.LayerKind.SMARTOBJECT; if (scenario === 'group') original.layers = []; }
    const r = await f.run('png.selection-smart'); assert.equal(r.status, 'complete', scenario);
    assert.equal(r.smartInput, 'visible-composite'); assert.equal(r.smartScope, 'pixel-selection'); assert.deepEqual(f.stamps, [[original.id]]);
    assert.equal(f.source.layers.length, 3); assert.ok(f.source.layers.includes(original)); assert.ok(f.source.layers.includes(hidden)); assert.equal(hidden.visible, false);
    assert.equal(f.source.channels.length, 1); assert.equal(f.source.selection.bounds, bounds); assert.equal(f.source.selection.mask, mask);
    assert.equal(r.width, 100); assert.equal(r.height, 80); assert.equal(r.imageCopied, true); assert.equal(r.pngSaved, true); assert.equal(f.app.documents.length, 2);
    assert.ok(f.events.indexOf('saveSelection') < f.events.indexOf('mergeVisible')); assert.ok(f.events.indexOf('loadSelection') < f.events.indexOf('copyToLayer'));
  }
});
test('no pixel selection uses a visible composite of the entire canvas, then restores no selection', async () => {
  const f = fixture(); f.source.selection.bounds = null; f.source.selection.mask = null; f.source.activeLayers = [];
  const r = await f.run('png.selection-smart'); assert.equal(r.status, 'complete'); assert.equal(r.smartScope, 'full-canvas'); assert.equal(r.smartInput, 'visible-composite');
  assert.equal(r.width, f.source.width); assert.equal(r.height, f.source.height); assert.equal(f.source.selection.bounds, null); assert.equal(f.source.channels.length, 1);
  assert.equal(f.source.layers.length, 2); assert.ok(f.events.includes('selectRectangle')); assert.ok(!f.events.includes('saveSelection'));
});
test('temporary helper is moved out of a nested group before stamping; original tree stays intact', async () => {
  const f = fixture({ nestedHelper: true }); const group = f.source.layers[0]; group.kind = f.C.LayerKind.GROUP; group.layers = [f.makeLayer('Child')];
  const child = group.layers[0]; const r = await f.run('png.selection-smart'); assert.equal(r.status, 'complete');
  assert.ok(f.events.includes('moveLayer')); assert.deepEqual(group.layers, [child]); assert.equal(f.source.layers.length, 2);
});
test('Stamp Visible variants that fill the owned helper still preserve every original layer', async () => {
  const f = fixture({ stampReusesHelper: true }); f.source.activeLayers = []; const original = f.source.layers[0];
  const r = await f.run('png.selection-smart'); assert.equal(r.status, 'complete'); assert.equal(f.source.layers.length, 2); assert.ok(f.source.layers.includes(original));
});
test('failures at composite/selection/conversion steps roll back owned layers and channels', async () => {
  for (const fail of [{ createLayer: true }, { actionError: 'mergeVisible' }, { stampNoop: true }, { destructiveStamp: true }, { loadSelection: true }, { actionError: 'copyToLayer' }, { deleteLayer: true }, { actionError: 'newPlacedLayer' }, { deleteChannel: true }, { actionError: 'placedLayerEditContents' }]) {
    const f = fixture(fail); const original = f.source.layers[0], bounds = f.source.selection.bounds, mask = f.source.selection.mask; f.source.activeLayers = [];
    const r = await f.run('png.selection-smart'); assert.equal(r.status, 'error', JSON.stringify(fail)); assert.equal(r.smartObjectCreated, false);
    assert.deepEqual(f.source.layers, [original]); assert.equal(f.source.channels.length, 1); assert.equal(f.source.selection.bounds, bounds); assert.equal(f.source.selection.mask, mask);
    assert.equal(f.files.size, 0); assert.equal(f.app.documents.length, 1); assert.equal(f.app.activeDocument, f.source);
  }
});
test('failed PNG after composite extraction retains exactly one Smart Object for retry', async () => {
  const f = fixture({ save: true }); f.source.activeLayers = [];
  const r = await f.run('png.selection-smart'); assert.equal(r.status, 'error'); assert.equal(r.smartObjectCreated, true);
  assert.equal(f.source.layers.length, 2); assert.equal(f.source.channels.length, 1); assert.equal(f.app.activeDocument.name, 'Cutout.psb');
});
test('cancellation during stamping rolls back before copying or saving', async () => {
  const f = fixture({ mergeVisible: () => { f.ctx.isCancelled = true; } }); f.source.activeLayers = []; const original = f.source.layers[0];
  const r = await f.run('png.selection-smart'); assert.equal(r.status, 'error'); assert.deepEqual(f.source.layers, [original]);
  assert.equal(f.source.channels.length, 1); assert.ok(!f.events.includes('copyToLayer')); assert.ok(!f.events.includes('save'));
});
