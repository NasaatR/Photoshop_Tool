'use strict';
const ps = require('photoshop');
const uxp = require('uxp');
const product = require('./product.json');
const registry = require('./tools/index.js');
const { createHost } = require('./core/host.js');
const { createRunner } = require('./core/runner.js');
const { createDiagnostics, formatReport, copyReport } = require('./core/diagnostics.js');
const { createPreferences, readExportDraft } = require('./core/preferences.js');
const { createOutputAccess } = require('./core/output-access.js');
const { createPNGService } = require('./tools/png/service.js');
const { createPanel } = require('./ui/panel.js');
const preferences = createPreferences(localStorage);
const diagnostics = createDiagnostics();
const host = createHost(ps);
const services = { host, png: createPNGService(host, createOutputAccess(uxp.storage.localFileSystem), file => file.read({ format: uxp.storage.formats.binary })) };
let draft = preferences.export(), appearance = preferences.appearance(), visibility = preferences.exposeCopyButton(preferences.visibility());
let view = null, uiBusy = false, pending = preferences.problems().length ? [preferences.problems().join('\n'), 'error'] : ['Ready', 'ready'];
const roots = new WeakSet(), lifecycle = { creates: 0, shows: 0, destroys: 0 };
preferences.problems().forEach(message => diagnostics.event('warning', 'preferences', message));
function status(text, state = 'working') { pending = [text, state]; if (view) view.status(text, state, ps.app.preferences.general.exportClipboard !== true); }
const runner = createRunner(registry, context => ({ ...context, services }), status, product.version, diagnostics);
function failure(scope, error) { diagnostics.error(scope, error); status(error.message || String(error), 'error'); }
function capture() { if (view) { draft = view.values(); appearance = view.appearance(); visibility = view.visibility(); } }
function options() { capture(); return readExportDraft(draft); }
function disable(value) { uiBusy = value; if (view) view.disable(value); }
async function invoke(id, menu) {
  if (runner.busy || uiBusy) return;
  let value;
  try { capture(); const tool = registry.get(id); value = tool.readOptions ? tool.readOptions(draft) : {}; } catch (e) { runner.reject(id, e); status(e.message, 'error'); if (menu) try { await ps.app.showAlert(e.message); } catch (alertError) { diagnostics.error('alert', alertError); } return; }
  disable(true);
  try { const result = await runner.run(id, value); if (menu && result.status === 'error') await ps.app.showAlert(pending[0]); }
  catch (e) { failure('tool invocation', e); }
  finally { disable(false); }
}
async function external() {
  if (uiBusy || runner.busy) return; disable(true);
  try { await host.modal('Photoshop Tool: Enable external paste', async () => { ps.app.preferences.general.exportClipboard = true; }); status('External paste enabled.', 'ready'); }
  catch (e) { failure('external paste preference', e); } finally { disable(false); }
}
function reportText() {
  capture();
  let platform = 'unknown';
  try { platform = navigator.platform || 'unknown'; } catch (_) {}
  return formatReport({ schema: 2, product: product.name, version: product.version, generatedAt: new Date().toISOString(), photoshop: ps.app.version, platform,
    status: pending[0], statusState: pending[1], exportClipboard: ps.app.preferences.general.exportClipboard === true, lastOperation: runner.report(),
    interface: { ...lifecycle, appearance, visibility, width: view ? view.root.clientWidth : null, height: view ? view.root.clientHeight : null, backgroundPolling: false, animations: false },
    tools: registry.list().map(t => t.id), diagnostics: diagnostics.report() });
}
function reportStatus(text) { if (view) view.reportStatus(text); }
async function report(destination) {
  if (uiBusy || runner.busy) return; disable(true);
  try {
    if (destination === 'clipboard') {
      const clipboard = typeof navigator === 'undefined' ? null : navigator.clipboard;
      await copyReport(clipboard, reportText());
      diagnostics.event('info', 'report', 'Report copied to text clipboard.');
      reportStatus('Report copied. Paste it with Ctrl+V.');
      return;
    }
    const file = await uxp.storage.localFileSystem.getFileForSaving('Photoshop-Tool-report.txt', { types: ['txt'] });
    if (!file) { reportStatus('Report save cancelled.'); return; }
    await file.write(reportText());
    diagnostics.event('info', 'report', 'Report saved to a text file.');
    reportStatus('Report saved. Clipboard unchanged.');
  } catch (e) { diagnostics.error('report ' + destination, e); reportStatus('Report not ' + (destination === 'clipboard' ? 'copied' : 'saved') + ': ' + e.message + (destination === 'clipboard' ? ' Use Save report.' : '')); }
  finally { disable(false); }
}
function mount(root) {
  if (!roots.has(root)) {
    if (root.style) Object.assign(root.style, { backgroundColor: 'var(--uxp-host-background-color, #252525)', width: '100%', height: '100%', minWidth: '0', minHeight: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '0', padding: '0', boxSizing: 'border-box' });
    roots.add(root);
  }
  if (!view) view = createPanel(root.ownerDocument || document, registry.list(), draft, appearance, visibility, {
    run: id => invoke(id, false), external, report: () => report('file'), copyReport: () => report('clipboard'), draft: capture,
    changed() { try { draft = preferences.saveExport(options()); } catch (e) { failure('export preferences', e); } },
    appearance(value) { appearance = value; try { preferences.saveAppearance(value); } catch (e) { failure('appearance preferences', e); } },
    visibility(value) { visibility = value; try { preferences.saveVisibility(value); } catch (e) { failure('tool visibility preferences', e); } }
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
