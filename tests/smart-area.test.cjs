'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { fixture } = require('./fixture.cjs');
const { softness } = require('../plugin/tools/png/soft-mask.js');
const { readSmartAreaDraft, createPreferences } = require('../plugin/core/preferences.js');
test('Smart Area adds its mask to the parent object, retains exact selection and exports unmasked contents', async () => {
  const f = fixture(), original = f.source.layers[0], selection = f.source.selection.bounds, pixels = f.source.selection.mask;
  const r = await f.run('png.selection-smart');
  assert.equal(r.status, 'complete', r.error); assert.equal(original.mask, undefined);
  const smart = f.source.layers.find(layer => layer.id === r.smartLayerID);
  assert.ok(smart.mask); assert.ok(smart.layerMaskFeather > 0);
  assert.ok(smart.mask.bounds.left > selection.left); assert.ok(smart.mask.bounds.right < selection.right);
  assert.equal(f.source.selection.bounds, selection); assert.equal(f.source.selection.mask, pixels); assert.equal(f.source.channels.length, 1);
  assert.equal(r.smartAreaMask.placement, 'parent-smart-object'); assert.equal(r.smartAreaMask.exportIncludesMask, false);
  assert.equal(r.width, 100); assert.equal(r.height, 80); assert.equal(r.pngSaved, true); assert.equal(r.imageCopied, true);
  assert.equal(f.app.activeDocument.layers[0].mask, undefined);
  assert.ok(f.events.indexOf('makeMask') < f.events.indexOf('placedLayerEditContents'));
});
test('full-canvas Smart Area also softens canvas edges without leaving a pixel selection', async () => {
  const f = fixture(); f.source.selection.bounds = null; f.source.selection.mask = null;
  const r = await f.run('png.selection-smart'); assert.equal(r.status, 'complete', r.error);
  const smart = f.source.layers.find(layer => layer.id === r.smartLayerID);
  assert.equal(smart.layerMaskFeather, 24); assert.deepEqual(smart.mask.bounds, { left: 48, top: 48, right: f.source.width - 48, bottom: f.source.height - 48 });
  assert.equal(f.source.selection.bounds, null); assert.equal(r.width, f.source.width); assert.equal(r.height, f.source.height);
});
test('zero feather is respected and tiny or thin areas never accidentally create a Reveal All mask', async () => {
  const f = fixture(), selection = f.source.selection.bounds;
  const hard = await f.run('png.selection-smart', { schema: 1, maskFeather: 0 }); assert.equal(hard.status, 'complete', hard.error);
  const smart = f.source.layers.find(layer => layer.id === hard.smartLayerID);
  assert.equal(smart.layerMaskFeather, 0); assert.deepEqual(smart.mask.bounds, selection); assert.ok(!f.events.includes('contract'));
  assert.equal(softness({ left: 0, top: 0, right: 1, bottom: 1 }, 1000).feather, 0);
  const thin = fixture({ thinSelection: true }), result = await thin.run('png.selection-smart');
  assert.equal(result.status, 'complete', result.error); assert.equal(result.smartAreaMask.inset, 0); assert.match(result.warnings[0], /too narrow/);
  assert.deepEqual(thin.source.layers.find(layer => layer.id === result.smartLayerID).mask.bounds, thin.source.selection.bounds);
});
test('soft-mask failures roll back the new object and alpha channel before any PNG or clipboard effect', async () => {
  for (const failure of ['contract', 'makeMask']) {
    const f = fixture({ [failure]: true }), original = f.source.layers[0], selection = f.source.selection.bounds;
    const r = await f.run('png.selection-smart'); assert.equal(r.status, 'error'); assert.equal(r.failure.step, 'soft-mask');
    assert.equal(r.smartObjectCreated, false); assert.equal(r.smartAreaMask, undefined); assert.equal(r.pngSaved, false); assert.equal(r.imageCopied, false);
    assert.deepEqual(f.source.layers, [original]); assert.equal(f.source.channels.length, 1); assert.equal(f.source.selection.bounds, selection); assert.equal(f.app.documents.length, 1);
  }
});
test('Smart Area settings migrate independently and preserve explicit zero; invalid drafts stay invalid', () => {
  const stored = new Map([['pngrelay.settings.v1', JSON.stringify({ schema: 1, compression: 0, overwrite: false, srgb: true })]]);
  const prefs = createPreferences({ getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) });
  const before = stored.get('pngrelay.settings.v1'); assert.equal(prefs.smartArea().feather, 24);
  prefs.saveSmartArea({ schema: 1, feather: 0 }); assert.equal(prefs.smartArea().feather, 0); assert.equal(stored.get('pngrelay.settings.v1'), before);
  assert.equal(readSmartAreaDraft({ compression: '0', smartAreaFeather: '0' }).maskFeather, 0);
  for (const value of ['', '-1', '1001', 'nope']) assert.throws(() => readSmartAreaDraft({ compression: '6', smartAreaFeather: value }), /feather/);
});
