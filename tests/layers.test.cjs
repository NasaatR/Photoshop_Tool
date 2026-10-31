'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { layerFixture } = require('./layer-fixture.cjs');
const registry = require('../plugin/tools/index.js');
test('six layer tools have independent commands/options and distinct export labels', () => {
  const tools = registry.list().filter(tool => tool.group === 'Layers'); assert.equal(tools.length, 6);
  tools.forEach(tool => assert.equal(tool.readOptions, undefined));
  assert.notEqual(registry.get('png.selection-smart').label, registry.get('layers.smart-object').label);
});
test('whole-layer conversion embeds selected pixels/text/groups/multiple layers using fresh IDs', async () => {
  for (const scenario of ['pixel', 'text', 'group', 'multiple']) {
    const f = layerFixture(); const originalHandle = f.layer(f.original), bounds = f.doc.selection.bounds, mask = f.doc.selection.mask;
    if (scenario === 'text') f.data.get(f.original).kind = f.C.LayerKind.TEXT;
    if (scenario === 'group') { f.data.get(f.original).kind = f.C.LayerKind.GROUP; f.add('Child', f.C.LayerKind.NORMAL, f.original); }
    if (scenario === 'multiple') f.select([f.original, f.add('Another')]);
    const r = await f.run('layers.smart-object'); assert.equal(r.status, 'complete', r.error);
    assert.equal(r.smartObjectCreated, true); assert.equal(r.smartInput, 'selected-layers'); assert.equal(f.data.get(r.layerID).kind, f.C.LayerKind.SMARTOBJECT);
    assert.ok(f.data.has(f.other)); assert.throws(() => originalHandle.name, /does not exist/);
    assert.equal(f.doc.selection.bounds, bounds); assert.equal(f.doc.selection.mask, mask); assert.equal(f.doc.channels.length, 1);
    assert.equal(f.app.documents.length, 1); assert.equal(f.app.activeDocument, f.doc); assert.deepEqual(f.commits, [true]); assert.ok(!f.events.includes('mergeVisible'));
    assert.equal(r.pngSaved, false); assert.equal(r.imageCopied, false); assert.equal(r.host, '28.0.1');
  }
});
test('no layer selected stamps full visible composition, retaining hidden layers and exact selection', async () => {
  const f = layerFixture(), hidden = f.add('Hidden'); f.data.get(hidden).visible = false; f.select([]);
  const before = [...f.data.keys()], bounds = f.doc.selection.bounds, mask = f.doc.selection.mask;
  const r = await f.run('layers.smart-object'); assert.equal(r.status, 'complete', r.error);
  before.forEach(id => assert.ok(f.data.has(id))); assert.equal(f.data.size, before.length + 1); assert.equal(f.data.get(hidden).visible, false);
  assert.equal(r.smartInput, 'visible-composite'); assert.equal(r.smartHelperConsumed, true); assert.equal(f.doc.channels.length, 1);
  assert.equal(f.doc.selection.bounds, bounds); assert.equal(f.doc.selection.mask, mask);
  assert.ok(!f.events.includes('copyToLayer')); assert.ok(!f.events.includes('placedLayerEditContents'));
});
test('existing Smart Objects are reused without nesting or exporting', async () => {
  for (const id of ['layers.smart-object', 'layers.camera-raw']) {
    const f = layerFixture(); f.data.get(f.original).kind = f.C.LayerKind.SMARTOBJECT;
    const r = await f.run(id); assert.equal(r.status, 'complete', r.error); assert.equal(r.layerID, f.original);
    assert.equal(r.smartObjectCreated, false); assert.ok(!f.events.includes('newPlacedLayer')); assert.equal(f.data.size, 2);
    assert.equal(r.mutationCommitted, id === 'layers.camera-raw');
    if (id === 'layers.smart-object') { assert.deepEqual(f.commits, []); assert.ok(!f.events.includes('saveSelection')); }
  }
});
test('Camera Raw runs interactively on a Smart Object as one history command, ignoring pixel selection', async () => {
  for (const none of [false, true]) {
    const f = layerFixture(); if (none) { f.select([]); f.doc.selection.bounds = null; }
    const r = await f.run('layers.camera-raw'); assert.equal(r.status, 'complete', r.error);
    assert.equal(r.cameraRawApplied, true); assert.equal(f.data.get(r.layerID).cameraRaw, true); assert.deepEqual(f.commits, [true]);
    assert.equal(f.modalOptions.interactive, true); assert.equal(r.pngSaved, false);
  }
});
test('Camera Raw cancellation and failures roll back conversion/stamp, selection and channels', async () => {
  for (const none of [false, true]) for (const code of [-128, -1]) {
    const f = layerFixture({ action: 'Adobe Camera Raw Filter', code }); if (none) f.select([]);
    const ids = [...f.data.keys()], bounds = f.doc.selection.bounds, mask = f.doc.selection.mask;
    const r = await f.run('layers.camera-raw'); assert.equal(r.status, code === -128 ? 'cancelled' : 'error');
    assert.deepEqual([...f.data.keys()], ids); assert.equal(r.smartObjectCreated, false); assert.equal(r.cameraRawApplied, undefined);
    assert.equal(f.doc.selection.bounds, bounds); assert.equal(f.doc.selection.mask, mask); assert.equal(f.doc.channels.length, 1); assert.deepEqual(f.commits, [false]);
    assert.ok(!f.statuses.some(([message]) => /Retry PNG/.test(message)));
  }
});
test('unsupported Camera Raw mode/depth fails before mutation without converting source', async () => {
  for (const values of [{ mode: 'CMYK' }, { bitsPerChannel: 32 }]) {
    const f = layerFixture(); Object.assign(f.doc, values); const r = await f.run('layers.camera-raw');
    assert.equal(r.status, 'error'); assert.ok(!f.events.includes('suspend')); assert.equal(f.data.size, 2);
  }
});
test('black mask always uses Hide All and preserves feathered selection, then selects the mask', async () => {
  const f = layerFixture(), mask = f.doc.selection.mask;
  const r = await f.run('layers.black-mask'); assert.equal(r.status, 'complete', r.error);
  assert.equal(r.blackMaskAdded, true); assert.equal(f.data.get(f.original).mask, 'black'); assert.equal(f.data.size, 2);
  assert.equal(f.doc.selection.mask, mask); assert.equal(f.doc.channels.length, 1); assert.equal(f.doc.activeChannels[0].kind, 'mask');
});
test('existing masks, locked/background layers and ambiguous targets are preserved and rejected clearly', async () => {
  for (const values of [{ hasUserMask: true, mask: 'existing' }, { isBackgroundLayer: true }, { allLocked: true }]) {
    const f = layerFixture(); Object.assign(f.data.get(f.original), values); const r = await f.run('layers.black-mask');
    assert.equal(r.status, values.hasUserMask ? 'complete' : 'error'); assert.ok(!f.events.includes('suspend')); for (const [key, value] of Object.entries(values)) assert.equal(f.data.get(f.original)[key], value);
  }
  for (const tool of ['layers.black-mask', 'layers.curves', 'layers.hue-saturation']) for (const ids of [[], ['original', 'other']]) {
    const f = layerFixture(); f.select(ids.map(key => f[key])); const r = await f.run(tool); assert.equal(r.status, 'error'); assert.match(r.error, /exactly one/); assert.ok(!f.events.includes('suspend'));
  }
});
test('Curves and Hue/Saturation clip immediately above the selected layer/group, including nested targets', async () => {
  for (const tool of ['layers.curves', 'layers.hue-saturation']) for (const target of ['pixel', 'group', 'nested']) {
    const f = layerFixture(); let targetID = f.original;
    if (target !== 'pixel') { f.data.get(f.original).kind = f.C.LayerKind.GROUP; if (target === 'nested') targetID = f.add('Nested', f.C.LayerKind.NORMAL, f.original); }
    f.select([targetID]); const mask = f.doc.selection.mask;
    const r = await f.run(tool); assert.equal(r.status, 'complete', r.error);
    const newLayer = f.data.get(r.layerID), base = f.data.get(targetID);
    assert.equal(newLayer.parent, base.parent); assert.equal(newLayer.isClippingMask, true); assert.equal(r.clippedToLayerID, targetID);
    const list = base.parent == null ? f.doc.layers.map(layer => layer.id) : f.data.get(base.parent).children;
    assert.equal(list[list.indexOf(targetID) - 1], r.layerID); assert.equal(f.doc.selection.mask, mask); assert.equal(f.data.get(f.other).isClippingMask, false);
    assert.equal(f.events.filter(event => event === 'move').length, target === 'group' ? 1 : 0);
  }
});
test('a normally inserted Solid Color fill needs no redundant Move command', async () => {
  const f = layerFixture(); const r = await f.run('layers.solid-color');
  assert.equal(r.status, 'complete', r.error); assert.equal(f.events.filter(event => event === 'move').length, 0);
});
test('adjustment clipping or selection restoration failure rolls back owned changes', async () => {
  for (const [tool, fail] of [['layers.curves', { clip: true }], ['layers.black-mask', { restore: true }], ['layers.smart-object', { restore: true }]]) {
    const f = layerFixture(fail), ids = [...f.data.keys()], mask = f.doc.selection.mask; const r = await f.run(tool);
    assert.equal(r.status, 'error'); assert.deepEqual([...f.data.keys()], ids); assert.equal(f.doc.channels.length, 1); assert.equal(f.doc.selection.mask, mask);
    assert.equal(r.smartObjectCreated, false); assert.equal(r.blackMaskAdded, undefined); assert.equal(f.data.get(f.original).hasUserMask, false); assert.deepEqual(f.commits, [false]);
  }
});
test('Solid Color uses fractional picker RGB values without saving or changing foreground; no layer selection is allowed', async () => {
  const f = layerFixture(); f.select([]); const r = await f.run('layers.solid-color'); assert.equal(r.status, 'complete', r.error);
  assert.equal(r.fillCreated, true); assert.deepEqual(f.data.get(r.layerID).type.color, { _obj: 'RGBColor', red: 10.25, grain: 128.75, blue: 250.5 });
  assert.equal(f.data.get(r.layerID).isClippingMask, false); assert.equal(f.modalOptions.interactive, true); assert.ok(!f.events.includes('set'));
});
test('Solid Color preserves an existing clipping chain when adding an unclipped fill', async () => {
  for (const selected of ['base', 'clipped']) {
    const f = layerFixture(), clipA = f.add('Clip A'), clipB = f.add('Clip B');
    f.data.get(clipA).isClippingMask = true; f.data.get(clipB).isClippingMask = true; f.select([selected === 'base' ? f.other : clipA]);
    const r = await f.run('layers.solid-color'); assert.equal(r.status, 'complete', r.error);
    assert.equal(f.data.get(clipA).isClippingMask, true); assert.equal(f.data.get(clipB).isClippingMask, true); assert.equal(f.data.get(r.layerID).isClippingMask, false);
    assert.equal(f.doc.layers[0].id, r.layerID); assert.equal(f.doc.layers[1].id, clipB);
  }
});
test('cancelled or malformed color pickers create no fill layer', async () => {
  for (const picker of [{ value: false }, { RGBFloatColor: { red: 0, grain: NaN, blue: 1 } }, {}]) {
    const f = layerFixture({ picker }), r = await f.run('layers.solid-color'); assert.equal(r.status, picker.value === false ? 'cancelled' : 'error');
    assert.equal(f.data.size, 2); assert.equal(r.fillCreated, undefined); assert.deepEqual(f.commits, [false]);
  }
});
test('modal acquisition rejects a changed document and reads the layer selection inside the modal scope', async () => {
  const f = layerFixture({ onModal({ app }) { app.activeDocument = { id: 99 }; } });
  assert.equal((await f.run('layers.smart-object')).status, 'error'); assert.ok(!f.events.includes('suspend'));
  const g = layerFixture({ onModal({ select }) { select([]); } });
  const r = await g.run('layers.smart-object'); assert.equal(r.status, 'complete', r.error); assert.equal(r.smartInput, 'visible-composite');
});
test('layer actions resolve the layer even when its mask or an alpha channel is active', async () => {
  for (const id of ['layers.smart-object', 'layers.camera-raw', 'layers.curves', 'layers.hue-saturation', 'layers.solid-color']) {
    const f = layerFixture(); f.doc.activeChannels = [{ name: 'Mask', kind: 'mask' }];
    const r = await f.run(id); assert.equal(r.status, 'complete', r.error);
  }
});
test('a mask channel with unsupported DOM getters still targets its owner for every layer tool', async () => {
  for (const id of ['layers.smart-object', 'layers.camera-raw', 'layers.curves', 'layers.hue-saturation', 'layers.solid-color', 'layers.black-mask']) {
    const f = layerFixture(), mask = { name: 'Layer mask', get kind() { throw new Error('Layer masks have no DOM Channel kind'); } };
    f.data.get(f.original).hasUserMask = true; f.data.get(f.original).mask = 'painted mask';
    let activeChannels = [mask]; Object.defineProperty(f.doc, 'activeChannels', { get: () => activeChannels, set: value => { activeChannels = value; } });
    const descriptor = Object.getOwnPropertyDescriptor(f.doc, 'activeLayers');
    Object.defineProperty(f.doc, 'activeLayers', { get() { if (activeChannels[0] === mask) throw new Error('DOM active layer unavailable with mask focus'); return descriptor.get.call(f.doc); }, set: descriptor.set });
    const r = await f.run(id); assert.equal(r.status, 'complete', r.error); assert.equal(r.targetResolution, 'native-layer-ids');
    assert.deepEqual(r.source.activeLayerIDs, [f.original]); assert.ok(!f.events.includes('mergeVisible'));
  }
});
test('Black mask → Curves → Hue/Saturation works without manually switching mask thumbnails', async () => {
  const f = layerFixture(); assert.equal((await f.run('layers.black-mask')).status, 'complete');
  const curves = await f.run('layers.curves'); assert.equal(curves.status, 'complete', curves.error); assert.equal(curves.clippedToLayerID, f.original);
  f.doc.activeChannels = [{ get kind() { throw new Error('Layer mask cannot be read'); } }];
  const hue = await f.run('layers.hue-saturation'); assert.equal(hue.status, 'complete', hue.error); assert.equal(hue.clippedToLayerID, curves.layerID);
  assert.equal(f.data.get(f.original).mask, 'black');
});
test('invalid native target references never broaden the operation to the visible composite', async () => {
  const f = layerFixture({ layerRefs: [{ _ref: 'layer', _id: 9999 }] });
  const r = await f.run('layers.smart-object'); assert.equal(r.status, 'error'); assert.equal(r.failure.step, 'resolve-targets');
  assert.ok(!f.events.includes('suspend')); assert.ok(!f.events.includes('mergeVisible')); assert.equal(f.data.size, 2);
});
