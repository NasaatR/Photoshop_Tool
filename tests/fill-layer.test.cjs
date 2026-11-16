'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { layerFixture } = require('./layer-fixture.cjs');
test('Fill Current Layer covers and centers portrait/landscape/off-canvas content without distorting', async () => {
  for (const b of [{ left: 100, top: -50, right: 300, bottom: 450 }, { left: -100, top: 300, right: 700, bottom: 400 }, { left: -5000, top: -5000, right: 5000, bottom: 5000 }]) {
    const f = layerFixture(), selection = f.doc.selection.bounds, mask = f.doc.selection.mask, other = structuredClone(f.data.get(f.other));
    f.data.get(f.original).bounds = b; f.data.get(f.original).kind = f.C.LayerKind.SMARTOBJECT;
    const r = await f.run('layers.fill-current'); assert.equal(r.status, 'complete', r.error);
    const result = f.layer(f.original).boundsNoEffects;
    assert.ok(result.left <= 0.00001 && result.top <= 0.00001 && result.right >= f.doc.width - 0.00001 && result.bottom >= f.doc.height - 0.00001);
    assert.ok(Math.abs((result.left + result.right) / 2 - f.doc.width / 2) < 0.00001);
    assert.ok(Math.abs((result.top + result.bottom) / 2 - f.doc.height / 2) < 0.00001);
    assert.ok(Math.abs((result.right - result.left) / (result.bottom - result.top) - (b.right - b.left) / (b.bottom - b.top)) < 0.00001);
    assert.equal(f.layer(f.original).kind, f.C.LayerKind.SMARTOBJECT); assert.deepEqual(f.data.get(f.other), other);
    assert.equal(f.doc.selection.bounds, selection); assert.equal(f.doc.selection.mask, mask); assert.equal(f.doc.channels.length, 1);
    assert.equal(r.layerFilled, true); assert.equal(r.pngSaved, false); assert.equal(r.imageCopied, false); assert.deepEqual(f.commits, [true]);
  }
});
test('Fill targets the image owner when a mask was focused and ignores a pixel selection', async () => {
  const f = layerFixture(); f.data.get(f.original).bounds = { left: 10, top: 10, right: 110, bottom: 110 };
  f.doc.activeChannels = [new Proxy({}, { get() { throw new Error('Mask channel DOM cannot be read'); } })];
  const r = await f.run('layers.fill-current'); assert.equal(r.status, 'complete', r.error); assert.deepEqual(f.active, [f.original]); assert.ok(f.events.includes('scale'));
});
test('Fill rejects ambiguous/empty/locked/linked targets before transformation', async () => {
  for (const scenario of ['none', 'multiple', 'empty', 'locked', 'linked', 'background']) {
    const f = layerFixture();
    if (scenario === 'none') f.select([]);
    if (scenario === 'multiple') f.select([f.original, f.other]);
    if (scenario === 'empty') f.data.get(f.original).empty = true;
    if (scenario === 'locked') f.data.get(f.original).locked = true;
    if (scenario === 'linked') f.data.get(f.original).linkedLayers = [{ id: f.other }];
    if (scenario === 'background') f.data.get(f.original).isBackgroundLayer = true;
    const r = await f.run('layers.fill-current'); assert.equal(r.status, 'error', scenario); assert.ok(!f.events.includes('scale')); assert.equal(f.commits.length, 0);
  }
});
test('Fill rolls scale and translation back together on failure, restoring exact selection', async () => {
  for (const failure of ['scale', 'translate', 'restore']) {
    const f = layerFixture({ [failure]: true }), b = { left: 10, top: 20, right: 110, bottom: 220 }, selection = f.doc.selection.bounds;
    f.data.get(f.original).bounds = b;
    const r = await f.run('layers.fill-current'); assert.equal(r.status, 'error'); assert.equal(r.layerFilled, undefined);
    assert.deepEqual(f.layer(f.original).boundsNoEffects, b); assert.equal(f.doc.selection.bounds, selection); assert.equal(f.doc.channels.length, 1); assert.deepEqual(f.commits, [false]);
  }
});
