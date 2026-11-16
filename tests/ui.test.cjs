'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const registry = require('../plugin/tools/index.js');
const { createPanel } = require('../plugin/ui/panel.js');
const { normalizeAppearance, normalizeExport } = require('../plugin/core/preferences.js');
const { makeDocument } = require('./ui-fixture.cjs');
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
  const ps = { app: { version: fail.noAppVersion ? undefined : 'mock-host', documents: [], activeDocument: null, preferences: { general: { exportClipboard: true } }, async showAlert() { alerts++; } }, constants: {}, core: {}, action: {} };
  const uxp = { host: fail.uxpHost, versions: fail.uxpVersions, storage: { localFileSystem: { async getFileForSaving() { pickers++; if (fail.cancelSave) return null; return { async write(text) { if (fail.save) throw new Error('Disk full'); writes = text; } }; } } }, entrypoints: { setup(s) { assert.equal(setup, undefined); setup = s; } } };
  const navigator = { platform: 'Win32', clipboard: { async writeText(text) { clipboardWrites++; if (fail.copy) throw new Error('Clipboard busy'); clipboardText = text; }, readText() { throw new Error('Unexpected clipboard read'); } } };
  const entry = path.resolve(__dirname, '../plugin/main.js');
  vm.runInNewContext(fs.readFileSync(entry, 'utf8'), { document: doc, navigator, localStorage: { getItem: k => stored.get(k) || null, setItem: (k, v) => { if (fail.selectionSave && k === 'photoshoptool.selection.v1') throw new Error('Preference storage failed'); stored.set(k, v); } },
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
  assert.equal(find(f.root, 'png.copy-only').hidden, false); assert.equal(JSON.parse(f.stored.get('pngrelay.appearance.v1')).labels, false); assert.equal(f.stored.has('pngrelay.settings.v1'), false);
});
test('update exposes Copy once even with an old hidden override, then respects later hiding', async () => {
  const f = mainFixture({ stored: { 'photoshoptool.tools.v1': JSON.stringify({ schema: 1, visible: { 'png.copy-only': false, 'png.selection-smart': false } }) } });
  f.setup.panels.relayPanel.create(f.root); assert.equal(find(f.root, 'png.copy-only').hidden, false); assert.equal(find(f.root, 'png.selection-smart').hidden, true);
  const checkbox = find(f.root, 'visible-png.copy-only'); checkbox.checked = false; await checkbox.fire('change');
  f.setup.panels.relayPanel.destroy(); f.setup.panels.relayPanel.show(f.root); assert.equal(find(f.root, 'png.copy-only').hidden, true);
  const reloaded = mainFixture({ stored: Object.fromEntries(f.stored) }); reloaded.setup.panels.relayPanel.create(reloaded.root); assert.equal(find(reloaded.root, 'png.copy-only').hidden, true);
});
test('design refresh enables rounded labeled tools once and retains theme, density and later choices', async () => {
  const old = { schema: 1, labels: false, corners: 'square', size: 'roomy', theme: 'light' };
  const f = mainFixture({ stored: { 'pngrelay.appearance.v1': JSON.stringify(old) } }); f.setup.panels.relayPanel.create(f.root);
  let saved = JSON.parse(f.stored.get('pngrelay.appearance.v1'));
  assert.equal(saved.labels, true); assert.equal(saved.corners, 'soft'); assert.equal(saved.theme, 'light'); assert.equal(saved.size, 'roomy');
  await find(f.root, 'labels').fire('click'); await find(f.root, 'corners-square').fire('click');
  const next = mainFixture({ stored: Object.fromEntries(f.stored) }); next.setup.panels.relayPanel.create(next.root);
  saved = JSON.parse(next.stored.get('pngrelay.appearance.v1')); assert.equal(saved.labels, false); assert.equal(saved.corners, 'square'); assert.equal(saved.theme, 'light');
});
test('rounded toolbar exposes distinct image/report actions, grid layout and busy state', async () => {
  const { view } = panel(); assert.equal(view.root.attributes['data-tool-layout'], 'grid');
  assert.equal(view.elements['png.export-copy'].parentNode.attributes['data-layout'], 'grid');
  assert.equal(view.elements['layers.curves'].parentNode.attributes['data-layout'], 'grid');
  view.elements['visible-png.export-only'].checked = true; await view.elements['visible-png.export-only'].fire('change');
  assert.equal(view.root.attributes['data-tool-layout'], 'grid'); view.disable(true); assert.equal(view.root.attributes['aria-busy'], 'true');
  assert.notEqual(view.elements['png.copy-only'].attributes['aria-label'], view.elements.copyReport.attributes['aria-label']);
  for (const node of [view.elements['png.selection-smart'].children[0], view.elements.settings.children[0]]) assert.equal(node.attributes.viewBox, '0 0 24 24');
});
test('local diagnostics include tool IDs and lifecycle counters without touching clipboard', async () => {
  const f = mainFixture(); f.setup.panels.relayPanel.create(f.root); await find(f.root, 'report').fire('click');
  const report = f.report(); assert.equal(report.tools.length, registry.list().length); assert.equal(report.interface.backgroundPolling, false); assert.equal(report.interface.creates, 1); assert.equal(f.alerts(), 0);
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
test('copied report and operation both include the UXP host version when app.version is absent', async () => {
  const f = mainFixture({ noAppVersion: true, uxpHost: { name: 'Photoshop', version: '28.0.1' }, uxpVersions: { uxp: '9.4.0' } });
  f.setup.panels.relayPanel.create(f.root); await f.setup.commands.selectionSmart(); await find(f.root, 'copyReport').fire('click');
  const r = f.copied(); assert.equal(r.photoshop, '28.0.1'); assert.equal(r.lastOperation.host, '28.0.1');
  assert.equal(r.environment.versionSource, 'uxp.host.version'); assert.equal(r.environment.uxp, '9.4.0');
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
test('new layer section preserves hidden overrides and disappears when all its tools are hidden', async () => {
  const { view } = panel(); const section = view.elements['layers.smart-object'].parentNode.parentNode;
  assert.equal(section.hidden, false);
  for (const tool of registry.list().filter(tool => tool.group === 'Layers')) {
    assert.equal(view.elements[tool.id].children[0].attributes.viewBox, '0 0 24 24');
    const checkbox = view.elements['visible-' + tool.id]; checkbox.checked = false; await checkbox.fire('change');
  }
  assert.equal(section.hidden, true); assert.equal(view.elements['png.export-copy'].hidden, false);
});
test('layer commands are independent of an invalid PNG draft and report the actual host preflight', async () => {
  const f = mainFixture(); f.setup.panels.relayPanel.create(f.root); find(f.root, 'compression').value = '';
  await f.setup.commands.convertSmartObject(); await find(f.root, 'copyReport').fire('click');
  const r = f.copied(); assert.equal(r.lastOperation.tool, 'layers.smart-object');
  assert.match(r.lastOperation.error, /Open a document/); assert.doesNotMatch(r.lastOperation.error, /Compression/);
  assert.equal(f.pickers(), 0);
});
test('icon-only tools expose real hover/focus hints; Escape dismisses the hint before Options', async () => {
  const { view } = panel();
  await view.elements.settings.fire('click'); assert.equal(view.elements.options.hidden, false);
  await view.elements['layers.curves'].fire('focus');
  const hint = find(view.root, 'pt-tooltip');
  assert.equal(hint.hidden, false); assert.match(find(view.root, 'pt-tooltip-title').textContent, /Curves/);
  assert.equal(find(view.root, 'pt-tooltip-body'), null);
  await view.root.fire('keydown', { key: 'Escape' }); assert.equal(hint.hidden, true); assert.equal(view.elements.options.hidden, false);
  await view.root.fire('keydown', { key: 'Escape' }); assert.equal(view.elements.options.hidden, true);
  await view.elements['layers.black-mask'].fire('focus'); view.disable(true); assert.equal(hint.hidden, true);
  view.dispose();
});
test('compact layer toolbar preserves icon-only appearance and tool visibility through the version migration', async () => {
  const appearance = { schema: 1, labels: false, size: 'compact', corners: 'soft', theme: 'light' };
  const f = mainFixture({ stored: { 'pngrelay.appearance.v1': JSON.stringify(appearance), 'photoshoptool.designRefresh.v1': '1',
    'photoshoptool.tools.v1': JSON.stringify({ schema: 1, visible: { 'layers.curves': false } }) } });
  f.setup.panels.relayPanel.create(f.root);
  assert.equal(find(f.root, 'layers.curves').hidden, true); assert.equal(find(f.root, 'labels').getAttribute('aria-pressed'), 'false');
  assert.equal(find(f.root, 'layers.smart-object').parentNode.getAttribute('data-density'), 'compact');
  assert.equal(find(f.root, 'png.export-copy').parentNode.getAttribute('data-density'), 'standard');
  assert.deepEqual(JSON.parse(f.stored.get('pngrelay.appearance.v1')), appearance);
  await find(f.root, 'report').fire('click'); const report = f.report();
  assert.equal(report.version, require('../plugin/product.json').version); assert.equal(report.displayVersion, require('../plugin/product.json').displayVersion);
  f.setup.panels.relayPanel.hide(); f.setup.panels.relayPanel.destroy();
});
test('Arrange never runs a Photoshop tool and updates the actual toolbar before saving', async () => {
  const { view, runs } = panel(); const actions = view.elements['layers.smart-object'].parentNode;
  await view.elements.arrange.fire('click'); assert.equal(view.elements.arrangeBar.hidden, false);
  await view.elements['layers.smart-object'].fire('click'); await view.elements['layers.curves'].fire('click');
  assert.equal(runs.length, 0); assert.ok(actions.children.indexOf(view.elements['layers.smart-object']) > actions.children.indexOf(view.elements['layers.curves']));
  await view.elements.arrangeReset.fire('click'); assert.equal(actions.children[0].id, 'layers.smart-object');
  await view.elements.arrangeDone.fire('click'); await view.elements['layers.smart-object'].fire('click'); assert.deepEqual(runs, ['layers.smart-object']); view.dispose();
});
test('button order survives recreation/reload and keeps export settings and visibility', async () => {
  const f = mainFixture(); f.setup.panels.relayPanel.create(f.root);
  await find(f.root, 'arrange').fire('click'); await find(f.root, 'layers.smart-object').fire('click'); await find(f.root, 'layers.curves').fire('click');
  const saved = JSON.parse(f.stored.get('photoshoptool.order.v1')); assert.equal(saved.schema, 1);
  assert.ok(saved.ids.indexOf('layers.smart-object') > saved.ids.indexOf('layers.curves')); assert.equal(f.stored.has('pngrelay.settings.v1'), false);
  f.setup.panels.relayPanel.destroy();
  const reloaded = mainFixture({ stored: Object.fromEntries(f.stored) }); reloaded.setup.panels.relayPanel.create(reloaded.root);
  const actions = find(reloaded.root, 'layers.smart-object').parentNode;
  assert.ok(actions.children.indexOf(find(reloaded.root, 'layers.smart-object')) > actions.children.indexOf(find(reloaded.root, 'layers.curves')));
  await find(reloaded.root, 'report').fire('click'); assert.deepEqual(reloaded.report().interface.order, saved.ids);
  assert.ok(reloaded.report().interface.tooltip); reloaded.setup.panels.relayPanel.destroy();
});
test('compact Settings tabs keep independent drafts, roving keyboard navigation and synchronized label controls', async () => {
  const { view } = panel(); await view.elements.settings.fire('click');
  assert.equal(view.elements['settings-view'].hidden, true); assert.equal(view.elements['settings-export'].hidden, false);
  view.elements.compression.value = ''; await view.elements['tab-export'].fire('click');
  assert.equal(view.elements['settings-export'].hidden, false); assert.equal(view.elements['tab-export'].getAttribute('aria-selected'), 'true');
  await view.elements['tab-export'].fire('keydown', { key: 'ArrowRight' }); assert.equal(view.elements['settings-help'].hidden, false);
  await view.elements['tab-help'].fire('keydown', { key: 'Home' }); assert.equal(view.elements['settings-view'].hidden, false);
  view.elements['appearance-labels'].checked = true; await view.elements['appearance-labels'].fire('change'); assert.equal(view.appearance().labels, true);
  await view.elements.labels.fire('click'); assert.equal(view.elements['appearance-labels'].checked, false); assert.equal(view.values().compression, '');
  await view.elements.settingsClose.fire('click'); assert.equal(view.elements.options.hidden, true); view.dispose();
});
test('panel mount recovers content sizing after a zero-height create without rebuilding tools or settings', async () => {
  const f = mainFixture(); f.root.clientHeight = 0; f.root.rect = { height: 0 };
  f.setup.panels.relayPanel.create(f.root); const scroll = find(f.root, 'scroll'), button = find(f.root, 'layers.black-mask');
  assert.equal(scroll.style.height, undefined);
  const footer = f.root.children[0].children.find(node => node.getAttribute('class') === 'pt-footer'); footer.rect = { height: 19 };
  f.root.clientHeight = 174; f.setup.panels.relayPanel.show(f.root);
  assert.equal(scroll.style.height, '139px'); assert.equal(scroll.style.flex, '0 0 auto');
  assert.equal(find(f.root, 'layers.black-mask'), button); assert.equal(button.hidden, false);
  await find(f.root, 'report').fire('click'); const layout = f.report().interface.scroll.layout;
  assert.equal(layout.mode, 'measured-normal-flow'); assert.equal(layout.hostHeight, 174); assert.equal(layout.height, 139);
  f.setup.panels.relayPanel.destroy();
});

test('new controls keep stable Smart Area identity, large Fill and independent Quick PSD options', async () => {
  const { view } = panel();
  assert.equal(view.elements['png.selection-smart'].getAttribute('aria-label'), 'Smart Area');
  assert.equal(registry.get('png.selection-smart').commandId, 'selectionSmart');
  assert.equal(view.elements['layers.fill-current'].parentNode.getAttribute('data-density'), 'standard');
  assert.equal(view.elements['psd.quick-save'].hidden, false);
  assert.equal(registry.get('psd.quick-save').readOptions, undefined);
  view.elements.smartAreaBlurPercent.value = ''; await view.elements['tab-help'].fire('click'); await view.elements['tab-export'].fire('click');
  assert.equal(view.values().smartAreaBlurPercent, '');
  view.disable(true); assert.equal(view.elements.smartAreaBlurPercent.disabled, true); view.disable(false);
  assert.equal(view.values().smartAreaBlurPercent, ''); view.dispose();
});
test('Smart Area feather persists through recreation without changing legacy export values or hiding new tools', async () => {
  const f = mainFixture({ stored: { 'photoshoptool.smartArea.v1': JSON.stringify({ schema: 1, feather: 0 }) } }); f.setup.panels.relayPanel.create(f.root);
  assert.equal(find(f.root, 'smartAreaBlurPercent').value, '0');
  find(f.root, 'smartAreaBlurPercent').value = '12.5'; await find(f.root, 'smartAreaBlurPercent').fire('change');
  assert.equal(JSON.parse(f.stored.get('photoshoptool.smartArea.v2')).blurPercent, 12.5);
  assert.equal(f.stored.has('pngrelay.settings.v1'), false);
  const reloaded = mainFixture({ stored: Object.fromEntries(f.stored) }); reloaded.setup.panels.relayPanel.create(reloaded.root);
  assert.equal(find(reloaded.root, 'smartAreaBlurPercent').value, '12.5');
  find(reloaded.root, 'smartAreaBlurPercent').value = '-1'; await find(reloaded.root, 'png.selection-smart').fire('click');
  await find(reloaded.root, 'copyReport').fire('click'); assert.match(reloaded.copied().lastOperation.error, /blur/);
  await find(reloaded.root, 'png.export-copy').fire('click'); await find(reloaded.root, 'copyReport').fire('click');
  assert.match(reloaded.copied().lastOperation.error, /Open a document/);
  for (const key of ['layers.fill-current', 'psd.quick-save']) assert.equal(find(reloaded.root, key).hidden, false);
  f.setup.panels.relayPanel.destroy(); reloaded.setup.panels.relayPanel.destroy();
});

test('PNG/PSD format names remain inside distinct glyphs with captions hidden; area tools share the large tier', () => {
  const { view } = panel();
  for (const [id, format] of [['png.export-copy', 'PNG'], ['png.export-only', 'PNG'], ['psd.quick-save', 'PSD']]) {
    const glyph = view.elements[id].children[0]; assert.equal(glyph.getAttribute('class'), 'pt-format-icon');
    assert.equal(glyph.children[1].textContent, format); assert.equal(glyph.children[1].getAttribute('class'), 'pt-format-tag');
  }
  const area = view.elements['selection.expand'].parentNode;
  assert.equal(area, view.elements['layers.fill-current'].parentNode); assert.equal(area.getAttribute('data-density'), 'standard');
  assert.equal(view.elements['layers.curves'].parentNode.getAttribute('data-density'), 'compact');
  assert.equal(view.elements['png.selection-smart'].parentNode.getAttribute('data-density'), 'standard');
  assert.equal(view.elements.expandPx.value, '8'); assert.equal(view.elements.expandPx.getAttribute('max'), '500');
  view.dispose();
});
test('action values autosave/reset independently of invalid PNG/Smart Area drafts and survive reload', async () => {
  const f = mainFixture(); f.setup.panels.relayPanel.create(f.root);
  assert.equal(find(f.root, 'settings-export').hidden, false);
  find(f.root, 'compression').value = ''; find(f.root, 'smartAreaBlurPercent').value = '';
  find(f.root, 'expandPx').value = '16'; await find(f.root, 'expandPx').fire('change');
  assert.equal(JSON.parse(f.stored.get('photoshoptool.selection.v1')).expandPx, 16);
  assert.equal(f.stored.has('pngrelay.settings.v1'), false); assert.equal(f.stored.has('photoshoptool.smartArea.v2'), false);
  assert.equal(find(f.root, 'settingsStatus').textContent, 'Saved');
  await find(f.root, 'reset-expandPx').fire('click'); assert.equal(find(f.root, 'expandPx').value, '8');
  assert.equal(find(f.root, 'compression').value, ''); assert.equal(find(f.root, 'smartAreaBlurPercent').value, '');
  await find(f.root, 'reset-smartAreaBlurPercent').fire('click'); assert.equal(JSON.parse(f.stored.get('photoshoptool.smartArea.v2')).blurPercent, 5);
  assert.equal(find(f.root, 'compression').value, '');
  await f.setup.commands.expandSelection(); await find(f.root, 'copyReport').fire('click'); assert.match(f.copied().lastOperation.error, /Open a document/);
  find(f.root, 'expandPx').value = '32'; await find(f.root, 'expandPx').fire('change');
  await find(f.root, 'tab-tools').fire('click');
  const reloaded = mainFixture({ stored: Object.fromEntries(f.stored) }); reloaded.setup.panels.relayPanel.create(reloaded.root);
  assert.equal(find(reloaded.root, 'expandPx').value, '32'); assert.equal(find(reloaded.root, 'settings-tools').hidden, false);
  assert.equal(find(reloaded.root, 'tab-tools').getAttribute('aria-selected'), 'true');
  f.setup.panels.relayPanel.destroy(); reloaded.setup.panels.relayPanel.destroy();
});
test('invalid Expand input keeps its draft, reports the error and leaves the saved value unchanged', async () => {
  const f = mainFixture({ stored: { 'photoshoptool.selection.v1': JSON.stringify({ schema: 1, expandPx: 12 }) } }); f.setup.panels.relayPanel.create(f.root);
  find(f.root, 'expandPx').value = '0'; await find(f.root, 'expandPx').fire('change');
  assert.equal(JSON.parse(f.stored.get('photoshoptool.selection.v1')).expandPx, 12);
  assert.equal(find(f.root, 'expandPx').value, '0'); assert.match(find(f.root, 'settingsStatus').textContent, /Not saved/);
  await find(f.root, 'selection.expand').fire('click'); await find(f.root, 'copyReport').fire('click');
  assert.match(f.copied().lastOperation.error, /1 to 500 px/);
  f.setup.panels.relayPanel.destroy();
});
test('failed settings storage never claims Saved or clears the draft, and reset is disabled during a tool run', async () => {
  const f = mainFixture({ selectionSave: true, stored: { 'photoshoptool.selection.v1': JSON.stringify({ schema: 1, expandPx: 8 }) } }); f.setup.panels.relayPanel.create(f.root);
  find(f.root, 'expandPx').value = '24'; await find(f.root, 'expandPx').fire('change');
  assert.equal(find(f.root, 'expandPx').value, '24'); assert.match(find(f.root, 'settingsStatus').textContent, /Not saved/);
  assert.equal(JSON.parse(f.stored.get('photoshoptool.selection.v1')).expandPx, 8);
  await find(f.root, 'copyReport').fire('click'); assert.ok(f.copied().diagnostics.events.some(event => event.scope === 'action preferences' && /storage failed/.test(event.message)));
  const { view } = panel(); view.elements.expandPx.value = '24'; view.disable(true); await view.elements['reset-expandPx'].fire('click'); assert.equal(view.elements.expandPx.value, '24');
  view.disable(false); await view.elements['reset-expandPx'].fire('click'); assert.equal(view.elements.expandPx.value, '8');
  view.dispose(); f.setup.panels.relayPanel.destroy();
});
