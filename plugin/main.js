'use strict';
const ps = require('photoshop');
const uxp = require('uxp');
const product = require('./product.json');
const registry = require('./tools/index.js');
const { createHost } = require('./core/host.js');
const { createRunner } = require('./core/runner.js');
const { createPreferences, readExportDraft } = require('./core/preferences.js');
const { createOutputAccess } = require('./core/output-access.js');
const { createPNGService } = require('./tools/png/service.js');
const { createPanel } = require('./ui/panel.js');
const preferences = createPreferences(localStorage);
const host = createHost(ps);
const services = { host, png: createPNGService(host, createOutputAccess(uxp.storage.localFileSystem, localStorage)) };
let draft = preferences.export(), appearance = preferences.appearance(), visibility = preferences.visibility();
let view = null, uiBusy = false, pending = preferences.problems().length ? [preferences.problems().join('\n'), 'error'] : ['Ready', 'ready'];
const roots = new WeakSet(), lifecycle = { creates: 0, shows: 0, destroys: 0 };
function status(text, state = 'working') { pending = [text, state]; if (view) view.status(text, state, ps.app.preferences.general.exportClipboard !== true); }
const runner = createRunner(registry, context => ({ ...context, services }), status, product.version);
function capture() { if (view) { draft = view.values(); appearance = view.appearance(); visibility = view.visibility(); } }
function options() { capture(); return readExportDraft(draft); }
function disable(value) { uiBusy = value; if (view) view.disable(value); }
async function invoke(id, menu) {
  if (runner.busy || uiBusy) return;
  let value;
  try { capture(); const tool = registry.get(id); value = tool.readOptions ? tool.readOptions(draft) : {}; } catch (e) { status(e.message, 'error'); if (menu) await ps.app.showAlert(e.message); return; }
  disable(true);
  try { const result = await runner.run(id, value); if (menu && result.status === 'error') await ps.app.showAlert(pending[0]); }
  catch (e) { status(e.message, 'error'); }
  finally { disable(false); }
}
async function external() {
  if (uiBusy || runner.busy) return; disable(true);
  try { await host.modal('Photoshop Tool: Enable external paste', async () => { ps.app.preferences.general.exportClipboard = true; }); status('External paste enabled.', 'ready'); }
  catch (e) { status(e.message, 'error'); } finally { disable(false); }
}
async function report() {
  if (uiBusy || runner.busy) return; disable(true);
  try {
    const file = await uxp.storage.localFileSystem.getFileForSaving('Photoshop-Tool-report.txt', { types: ['txt'] });
    if (!file) return;
    await file.write(JSON.stringify({ product: product.name, version: product.version, photoshop: ps.app.version, lastOperation: runner.report(),
      interface: { ...lifecycle, appearance, backgroundPolling: false, animations: false }, tools: registry.list().map(t => t.id) }, null, 2));
    if (view) view.elements.reportStatus.textContent = 'Report saved. Clipboard unchanged.';
  } catch (e) { if (view) view.elements.reportStatus.textContent = 'Report not saved: ' + e.message; }
  finally { disable(false); }
}
function mount(root) {
  if (!roots.has(root)) {
    if (root.style) Object.assign(root.style, { backgroundColor: 'var(--uxp-host-background-color, #252525)', height: '100vh', overflow: 'hidden', margin: '0', padding: '0', boxSizing: 'border-box' });
    roots.add(root);
  }
  if (!view) view = createPanel(root.ownerDocument || document, registry.list(), draft, appearance, visibility, {
    run: id => invoke(id, false), external, report, draft: capture,
    changed() { try { draft = preferences.saveExport(options()); } catch (e) { status('Options not saved: ' + e.message, 'error'); } },
    appearance(value) { appearance = value; try { preferences.saveAppearance(value); } catch (e) { status('Appearance not saved: ' + e.message, 'error'); } },
    visibility(value) { visibility = value; try { preferences.saveVisibility(value); } catch (e) { status('Tool buttons not saved: ' + e.message, 'error'); } }
  }, product.version);
  if (view.root.parentNode !== root) root.appendChild(view.root);
  view.disable(uiBusy); status(pending[0], pending[1]);
}
const commands = {};
registry.list().forEach(tool => { commands[tool.commandId] = () => invoke(tool.id, true); });
uxp.entrypoints.setup({ commands, panels: { relayPanel: {
  create(root) { lifecycle.creates++; mount(root); }, show(root) { lifecycle.shows++; mount(root); },
  destroy() { lifecycle.destroys++; capture(); if (view && view.root.parentNode) view.root.parentNode.removeChild(view.root); view = null; }
} } });
