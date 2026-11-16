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
  assert.ok(smart.mask); assert.equal(smart.layerMaskFeather, 0); assert.equal(smart.mask.bakedRadius, 4);
  assert.equal(r.smartAreaMask.baked, true); assert.equal(r.smartAreaMask.liveFeather, 0);
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
  assert.equal(smart.layerMaskFeather, 0); assert.equal(smart.mask.bakedRadius, 108); assert.deepEqual(smart.mask.bounds, { left: 216, top: 216, right: f.source.width - 216, bottom: f.source.height - 216 });
  assert.equal(f.source.selection.bounds, null); assert.equal(r.width, f.source.width); assert.equal(r.height, f.source.height);
});
test('zero feather is respected and tiny or thin areas never accidentally create a Reveal All mask', async () => {
  const f = fixture(), selection = f.source.selection.bounds;
  const hard = await f.run('png.selection-smart', { schema: 1, maskBlurPercent: 0 }); assert.equal(hard.status, 'complete', hard.error);
  const smart = f.source.layers.find(layer => layer.id === hard.smartLayerID);
  assert.equal(smart.layerMaskFeather, 0); assert.deepEqual(smart.mask.bounds, selection); assert.ok(!f.events.includes('contract'));
  assert.ok(!f.events.includes('gaussianBlur'));
  assert.equal(softness({ left: 0, top: 0, right: 1, bottom: 1 }, 5).radius, 0.1);
  const thin = fixture({ thinSelection: true }), result = await thin.run('png.selection-smart');
  assert.equal(result.status, 'complete', result.error); assert.equal(result.smartAreaMask.inset, 0); assert.match(result.warnings[0], /too narrow/);
  assert.deepEqual(thin.source.layers.find(layer => layer.id === result.smartLayerID).mask.bounds, thin.source.selection.bounds);
});
test('soft-mask failures roll back the new object and alpha channel before any PNG or clipboard effect', async () => {
  for (const failure of ['contract', 'makeMask', 'gaussianBlur']) {
    const f = fixture({ [failure]: true }), original = f.source.layers[0], selection = f.source.selection.bounds;
    const r = await f.run('png.selection-smart'); assert.equal(r.status, 'error'); assert.equal(r.failure.step, 'soft-mask');
    assert.equal(r.smartObjectCreated, false); assert.equal(r.smartAreaMask, undefined); assert.equal(r.pngSaved, false); assert.equal(r.imageCopied, false);
    assert.deepEqual(f.source.layers, [original]); assert.equal(f.source.channels.length, 1); assert.equal(f.source.selection.bounds, selection); assert.equal(f.app.documents.length, 1);
  }
});
test('Smart Area settings migrate independently and preserve explicit zero; invalid drafts stay invalid', () => {
  const stored = new Map([['pngrelay.settings.v1', JSON.stringify({ schema: 1, compression: 0, overwrite: false, srgb: true })]]);
  const prefs = createPreferences({ getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) });
  const before = stored.get('pngrelay.settings.v1'); assert.equal(prefs.smartArea().blurPercent, 5);
  prefs.saveSmartArea({ schema: 2, blurPercent: 0 }); assert.equal(prefs.smartArea().blurPercent, 0); assert.equal(stored.get('pngrelay.settings.v1'), before);
  assert.equal(readSmartAreaDraft({ compression: '0', smartAreaBlurPercent: '0' }).maskBlurPercent, 0);
  for (const value of ['', '-1', '101', 'nope']) assert.throws(() => readSmartAreaDraft({ compression: '6', smartAreaBlurPercent: value }), /blur/);
});
test('percentage scales with region dimensions, respects native radius limits and retains a nonempty core', () => {
  const rect = { left: 10, top: 20, right: 1010, bottom: 620 }, a = softness(rect, 5);
  assert.equal(a.radius, 30); assert.equal(a.reference, 'shorter-side'); assert.equal(a.radiusLimited, false);
  const b = softness({ left: 0, top: 0, right: 2000, bottom: 1200 }, 5); assert.equal(b.radius, a.radius * 2);
  const capped = softness({ left: 0, top: 0, right: 10000, bottom: 8000 }, 100);
  assert.equal(capped.radius, 250); assert.equal(capped.radiusLimited, true);
  assert.ok(softness(rect, 100).inset * 2 < 600);
  assert.throws(() => softness(null, 5), /no maskable pixels/);
});
test('one native mask-only blur is baked once; later painting has no live feather or automatic reprocessing', async () => {
  const f = fixture(), original = f.source.layers[0]; original.pixels = [10, 50, 240];
  const r = await f.run('png.selection-smart', { maskBlurPercent: 10 }); assert.equal(r.status, 'complete', r.error);
  const smart = f.source.layers.find(layer => layer.id === r.smartLayerID), before = f.events.length;
  assert.equal(f.events.filter(event => event === 'gaussianBlur').length, 1);
  assert.equal(smart.layerMaskFeather, 0); smart.mask.pixels = [0, 255, 0];
  assert.deepEqual(smart.mask.pixels, [0, 255, 0]); assert.equal(f.events.length, before); assert.deepEqual(original.pixels, [10, 50, 240]);
  assert.ok(!f.events.includes('open')); assert.equal(r.smartAreaMask.percent, 10);
});
test('percentage settings preserve the old pixel preference without treating pixels as percent', () => {
  const stored = new Map([['photoshoptool.smartArea.v1', JSON.stringify({ schema: 1, feather: 12.5 })]]);
  const legacy = stored.get('photoshoptool.smartArea.v1');
  const prefs = createPreferences({ getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) });
  assert.equal(prefs.smartArea().blurPercent, 5);
  prefs.saveSmartArea({ schema: 2, blurPercent: 7.5 }); assert.equal(prefs.smartArea().blurPercent, 7.5);
  assert.equal(stored.get('photoshoptool.smartArea.v1'), legacy);
  stored.delete('photoshoptool.smartArea.v2'); stored.set('photoshoptool.smartArea.v1', JSON.stringify({ schema: 1, feather: 0 }));
  assert.equal(prefs.smartArea().blurPercent, 0);
});
test('a failed explicit mask target stops before blur; cancellation rolls the owned mask/object back', async () => {
  const f = fixture({ actionError: 'select' }), original = f.source.layers[0];
  const failed = await f.run('png.selection-smart'); assert.equal(failed.status, 'error'); assert.ok(!f.events.includes('gaussianBlur')); assert.deepEqual(f.source.layers, [original]);
  const cancelled = fixture({ gaussianBlur: () => { cancelled.ctx.isCancelled = true; } }), initial = cancelled.source.layers[0], selection = cancelled.source.selection.bounds;
  const r = await cancelled.run('png.selection-smart'); assert.equal(r.status, 'error'); assert.equal(r.smartObjectCreated, false);
  assert.deepEqual(cancelled.source.layers, [initial]); assert.equal(cancelled.source.selection.bounds, selection); assert.equal(cancelled.source.channels.length, 1);
  assert.ok(!cancelled.events.includes('placedLayerEditContents')); assert.equal(r.pngSaved, false); assert.equal(r.imageCopied, false);
});
