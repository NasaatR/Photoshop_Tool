'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { normalizeOrder, orderTools, moveTool } = require('../plugin/core/tool-order.js');
const { createPreferences } = require('../plugin/core/preferences.js');
const { createReorder } = require('../plugin/ui/reorder.js');
const { makeDocument } = require('./ui-fixture.cjs');
const tools = [{ id: 'a.one', group: 'A' }, { id: 'a.two', group: 'A' }, { id: 'a.three', group: 'A' }, { id: 'b.one', group: 'B' }];
function fixture() {
  const doc = makeDocument(), nodes = {}, saved = [], applied = [];
  tools.forEach((tool, i) => { nodes[tool.id] = doc.createElement('div'); nodes[tool.id].rect = { left: i * 40, top: 0, width: 32, height: 32 }; });
  const reorder = createReorder(doc, tools, nodes, [], { apply: items => applied.push(items.map(t => t.id)), save: ids => saved.push(ids), state() {} });
  return { doc, nodes, saved, applied, reorder };
}
test('order normalization, unknown/hidden tools and section boundaries survive updates', () => {
  assert.deepEqual(normalizeOrder(['a.one', 'a.one', null, 'Bad ID', 'future.tool']), ['a.one', 'future.tool']);
  assert.deepEqual(orderTools(tools, ['b.one', 'a.three', 'a.one']).map(t => t.id), ['a.three', 'a.one', 'a.two', 'b.one']);
  assert.equal(moveTool(tools, [], 'a.one', 'b.one'), null);
  assert.deepEqual(moveTool(tools, ['future.tool'], 'a.one', 'a.three'), ['a.two', 'a.three', 'a.one', 'b.one', 'future.tool']);
});
test('order storage is independent of visibility/export/appearance and reset changes only order', () => {
  const stored = new Map([['pngrelay.settings.v1', 'keep-export'], ['photoshoptool.tools.v1', 'keep-visible']]);
  const prefs = createPreferences({ getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) });
  prefs.saveOrder(['a.two', 'a.one']); assert.deepEqual(prefs.order(), ['a.two', 'a.one']);
  prefs.saveOrder([]); assert.deepEqual(prefs.order(), []); assert.equal(stored.get('pngrelay.settings.v1'), 'keep-export'); assert.equal(stored.get('photoshoptool.tools.v1'), 'keep-visible');
});
test('two-click and keyboard arrangement moves without executing tools or crossing sections', async () => {
  const f = fixture(); assert.equal(f.reorder.activate('a.one'), false); f.reorder.setActive(true);
  assert.equal(f.reorder.activate('a.one'), true); f.reorder.activate('a.three');
  assert.deepEqual(f.applied.at(-1), ['a.two', 'a.three', 'a.one', 'b.one']); assert.equal(f.saved.length, 1);
  await f.nodes['a.one'].fire('keydown', { key: 'ArrowLeft' }); assert.deepEqual(f.applied.at(-1), ['a.two', 'a.one', 'a.three', 'b.one']);
  f.reorder.activate('b.one'); assert.equal(f.saved.length, 2);
  f.reorder.escape(); assert.equal(f.reorder.active, false); f.reorder.destroy();
});
test('drag commits once on drop; click after drag is consumed and outside/Escape cancels safely', async () => {
  const f = fixture(); f.reorder.setActive(true);
  await f.nodes['a.one'].fire('mousedown', { clientX: 10, clientY: 10, button: 0 });
  await f.doc.fire('mousemove', { clientX: 90, clientY: 10 }); assert.equal(f.saved.length, 0);
  await f.doc.fire('mouseup', { clientX: 90, clientY: 10 }); assert.equal(f.saved.length, 1);
  assert.deepEqual(f.applied.at(-1), ['a.two', 'a.three', 'a.one', 'b.one']); assert.equal(f.reorder.activate('a.one'), true);
  await f.nodes['a.two'].fire('mousedown', { clientX: 45, clientY: 10 }); await f.doc.fire('mousemove', { clientX: 500, clientY: 300 });
  await f.doc.fire('mouseup', { clientX: 500, clientY: 300 }); assert.equal(f.saved.length, 1);
  await f.nodes['a.one'].fire('mousedown', { clientX: 10, clientY: 10 }); f.reorder.escape(); await f.doc.fire('mouseup', { clientX: 90, clientY: 10 }); assert.equal(f.saved.length, 1);
  await f.nodes['a.one'].fire('mousedown', { clientX: 10, clientY: 10 }); await f.doc.fire('mousemove', { clientX: 90, clientY: 10, buttons: 0 }); await f.doc.fire('mouseup', { clientX: 90, clientY: 10 }); assert.equal(f.saved.length, 1);
  f.reorder.reset(); assert.deepEqual(f.saved.at(-1), []); f.reorder.destroy();
});
