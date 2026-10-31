'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const registry = require('../plugin/tools/index.js');
const { createPanel } = require('../plugin/ui/panel.js');
const { normalizeAppearance, normalizeExport } = require('../plugin/core/preferences.js');
class Element {
  constructor(tag, doc) { this.tagName = tag; this.ownerDocument = doc; this.children = []; this.attributes = {}; this.listeners = {}; this.style = {}; this.hidden = false; this.parentNode = null; this.textContent = ''; }
  set textContent(v) { this._text = String(v); this.writes = (this.writes || 0) + 1; } get textContent() { return this._text; }
  setAttribute(k, v) { this.attributes[k] = String(v); if (k === 'id') this.id = v; }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); this.children.push(c); c.parentNode = this; return c; }
  removeChild(c) { this.children.splice(this.children.indexOf(c), 1); c.parentNode = null; }
  addEventListener(k, fn) { (this.listeners[k] ||= []).push(fn); }
  async fire(k, event = {}) { event.preventDefault ||= () => {}; for (const fn of this.listeners[k] || []) await fn(event); }
  set innerHTML(_) { throw new Error('HTML injection'); }
}
const makeDocument = () => { const d = { createElement: tag => new Element(tag, d), createElementNS: (_, tag) => new Element(tag, d) }; return d; };
function panel(overrides = {}) {
  let runs = [];
  const view = createPanel(makeDocument(), registry.list(), normalizeExport(null), normalizeAppearance(null), {}, { run: id => runs.push(id), external() {}, report() {}, copyReport() {}, draft() {}, changed() {}, appearance() {}, visibility() {}, ...overrides }, '0.3.1');
  return { view, runs };
}
test('panel shows Copy beside PNG + Copy; optional PNG only can be revealed without rebuilding', async () => {
  const { view } = panel(); assert.equal(view.elements['png.export-copy'].hidden, false); assert.equal(view.elements['png.copy-only'].hidden, false); assert.equal(view.elements['png.export-only'].hidden, true);
  const first = view.elements['png.export-copy']; view.elements['visible-png.export-only'].checked = true; await view.elements['visible-png.export-only'].fire('change');
  assert.equal(view.elements['png.export-only'].hidden, false); assert.equal(view.elements['png.export-copy'], first);
});
test('custom action keyboard supports Enter/Space without repeat or disabled activations', async () => {
  const { view, runs } = panel(), node = view.elements['png.export-copy'];
  await node.fire('keydown', { key: 'Enter' }); await node.fire('keydown', { key: 'Enter', repeat: true });
  await node.fire('keydown', { key: ' ' }); await node.fire('keyup', { key: ' ' }); assert.equal(runs.length, 2);
  view.disable(true); await node.fire('click'); await node.fire('keydown', { key: 'Enter' }); assert.equal(runs.length, 2); assert.equal(node.attributes.tabindex, '-1');
  view.disable(false); assert.equal(node.attributes.tabindex, '0');
});
test('status no-op does not repaint; errors keep full details accessible', () => {
  const { view } = panel(); view.status('Ready', 'ready', false); const writes = view.elements.statusText.writes;
  for (let i = 0; i < 50; i++) view.status('Ready', 'ready', false);
  assert.equal(view.elements.statusText.writes, writes);
  view.status('Failure\nFull original error', 'error', false); assert.equal(view.elements.details.hidden, false); assert.match(view.elements.details.textContent, /original error/);
});
test('appearance changes retain controls and invalid input drafts', async () => {
  const { view } = panel(); const original = view.elements['png.export-copy']; view.elements.compression.value = '';
  await view.elements.labels.fire('click'); await view.elements['theme-light'].fire('click'); assert.equal(view.elements['png.export-copy'], original); assert.equal(view.values().compression, ''); assert.equal(view.appearance().theme, 'light');
});
function find(root, id) { if (root.id === id) return root; for (const child of root.children) { const result = find(child, id); if (result) return result; } return null; }
function mainFixture(fail = {}) {
  const doc = makeDocument(), root = doc.createElement('root'), stored = new Map(Object.entries(fail.stored || {})); let setup, alerts = 0, writes = '', clipboardText = '', clipboardWrites = 0, pickers = 0;
  const ps = { app: { version: 'mock-host', documents: [], activeDocument: null, preferences: { general: { exportClipboard: true } }, async showAlert() { alerts++; } }, constants: {}, core: {}, action: {} };
  const uxp = { storage: { localFileSystem: { async getFileForSaving() { pickers++; if (fail.cancelSave) return null; return { async write(text) { if (fail.save) throw new Error('Disk full'); writes = text; } }; } } }, entrypoints: { setup(s) { assert.equal(setup, undefined); setup = s; } } };
  const navigator = { platform: 'Win32', clipboard: { async writeText(text) { clipboardWrites++; if (fail.copy) throw new Error('Clipboard busy'); clipboardText = text; }, readText() { throw new Error('Unexpected clipboard read'); } } };
  const entry = path.resolve(__dirname, '../plugin/main.js');
  vm.runInNewContext(fs.readFileSync(entry, 'utf8'), { document: doc, navigator, localStorage: { getItem: k => stored.get(k) || null, setItem: (k, v) => stored.set(k, v) },
    require: id => id === 'photoshop' ? ps : id === 'uxp' ? uxp : require(path.resolve(path.dirname(entry), id)) });
  return { root, stored, setup, alerts: () => alerts, pickers: () => pickers, clipboardWrites: () => clipboardWrites,
    report: () => JSON.parse(writes.slice(writes.indexOf('{'))), copied: () => JSON.parse(clipboardText.slice(clipboardText.indexOf('{'))) };
}
test('main loads all registry menu commands without HTML and performs no idle document work', () => {
  const f = mainFixture(); assert.equal(Object.keys(f.setup.commands).length, registry.list().length);
  f.setup.panels.relayPanel.create(f.root); const tree = f.root.children[0], status = find(tree, 'statusText'), writes = status.writes;
  for (let i = 0; i < 50; i++) f.setup.panels.relayPanel.show(f.root);
  assert.equal(f.root.children.length, 1); assert.equal(f.root.children[0], tree); assert.equal(status.writes, writes); assert.equal(f.alerts(), 0); assert.equal(f.root.style.height, '100%');
});
test('tool visibility and appearance survive recreation separately from export settings', async () => {
  const f = mainFixture(); f.setup.panels.relayPanel.create(f.root);
  await find(f.root, 'labels').fire('click'); const checkbox = find(f.root, 'visible-png.copy-only'); checkbox.checked = true; await checkbox.fire('change');
  f.setup.panels.relayPanel.destroy(); f.setup.panels.relayPanel.show(f.root);
  assert.equal(find(f.root, 'png.copy-only').hidden, false); assert.equal(JSON.parse(f.stored.get('pngrelay.appearance.v1')).labels, true); assert.equal(f.stored.has('pngrelay.settings.v1'), false);
});
test('update exposes Copy once even with an old hidden override, then respects later hiding', async () => {
  const f = mainFixture({ stored: { 'photoshoptool.tools.v1': JSON.stringify({ schema: 1, visible: { 'png.copy-only': false, 'png.selection-smart': false } }) } });
  f.setup.panels.relayPanel.create(f.root); assert.equal(find(f.root, 'png.copy-only').hidden, false); assert.equal(find(f.root, 'png.selection-smart').hidden, true);
  const checkbox = find(f.root, 'visible-png.copy-only'); checkbox.checked = false; await checkbox.fire('change');
  f.setup.panels.relayPanel.destroy(); f.setup.panels.relayPanel.show(f.root); assert.equal(find(f.root, 'png.copy-only').hidden, true);
  const reloaded = mainFixture({ stored: Object.fromEntries(f.stored) }); reloaded.setup.panels.relayPanel.create(reloaded.root); assert.equal(find(reloaded.root, 'png.copy-only').hidden, true);
});
test('local diagnostics include tool IDs and lifecycle counters without touching clipboard', async () => {
  const f = mainFixture(); f.setup.panels.relayPanel.create(f.root); await find(f.root, 'report').fire('click');
  const report = f.report(); assert.equal(report.tools.length, 4); assert.equal(report.interface.backgroundPolling, false); assert.equal(report.interface.creates, 1); assert.equal(f.alerts(), 0);
  assert.equal(f.clipboardWrites(), 0);
});
test('one-click report includes preflight errors and needs no file picker or clipboard read', async () => {
  const f = mainFixture(); f.setup.panels.relayPanel.create(f.root);
  await f.setup.commands.exportCopy();
  await find(f.root, 'copyReport').fire('click');
  const r = f.copied(); assert.equal(r.lastOperation.status, 'error'); assert.match(r.lastOperation.failure.message, /Open a document/);
  assert.ok(r.diagnostics.events.some(e => e.level === 'error')); assert.equal(r.platform, 'Win32');
  assert.equal(f.pickers(), 0); assert.equal(f.clipboardWrites(), 1); assert.match(find(f.root, 'reportStatus').textContent, /copied/);
  assert.equal(find(f.root, 'reportStatus').hidden, false);
});
test('invalid export input becomes the reported operation instead of leaving a stale previous result', async () => {
  const f = mainFixture(); f.setup.panels.relayPanel.create(f.root); await f.setup.commands.exportCopy();
  find(f.root, 'compression').value = ''; await find(f.root, 'png.export-copy').fire('click');
  await find(f.root, 'copyReport').fire('click'); const r = f.copied();
  assert.equal(r.lastOperation.phase, 'Validating options'); assert.match(r.lastOperation.failure.message, /Compression/);
  assert.equal(r.diagnostics.operations.length, 2);
});
test('clipboard failure offers file export and preserves both report error and original failure', async () => {
  const f = mainFixture({ copy: true }); f.setup.panels.relayPanel.create(f.root); await f.setup.commands.exportCopy();
  await find(f.root, 'copyReport').fire('click'); assert.match(find(f.root, 'reportStatus').textContent, /Use Save report/);
  await find(f.root, 'report').fire('click'); const r = f.report();
  assert.match(r.lastOperation.failure.message, /Open a document/); assert.ok(r.diagnostics.events.some(e => e.scope === 'report clipboard' && /Clipboard busy/.test(e.error.message)));
  assert.equal(find(f.root, 'copyReport').attributes['aria-disabled'], 'false');
});
test('report save cancellation does not leave a stale success or block subsequent actions', async () => {
  const f = mainFixture({ cancelSave: true }); f.setup.panels.relayPanel.create(f.root); await find(f.root, 'report').fire('click');
  assert.match(find(f.root, 'reportStatus').textContent, /cancelled/); await find(f.root, 'copyReport').fire('click'); assert.equal(f.clipboardWrites(), 1);
});
test('failed report file write is captured in the next copied report without overwriting the tool failure', async () => {
  const f = mainFixture({ save: true }); f.setup.panels.relayPanel.create(f.root); await f.setup.commands.exportCopy();
  await find(f.root, 'report').fire('click'); assert.match(find(f.root, 'reportStatus').textContent, /not saved: Disk full/);
  await find(f.root, 'copyReport').fire('click'); const r = f.copied();
  assert.match(r.lastOperation.failure.message, /Open a document/); assert.ok(r.diagnostics.events.some(e => e.scope === 'report file' && e.error.message === 'Disk full'));
});
test('explicit resize range and one scroll body keep settings and reporting inside the panel', () => {
  const { createManifest } = require('../scripts/build.cjs'); const m = createManifest({ name: 'Test', id: 'test', version: '0.3.1' }, registry.list()), p = m.entrypoints[0];
  assert.ok(p.maximumSize.width > p.preferredFloatingSize.width * 4); assert.ok(p.maximumSize.height > p.preferredFloatingSize.height * 4);
  const { view } = panel(); const toolbar = view.elements.settings.parentNode.parentNode;
  assert.equal(toolbar.parentNode, view.elements.options.parentNode); assert.equal(view.elements.copyReport.parentNode.parentNode, toolbar.parentNode);
  assert.doesNotMatch(require('../plugin/ui/styles.js'), /100vh/);
});
