'use strict';
const { normalizeOrder } = require('./tool-order.js');
const EXPORT_KEY = 'pngrelay.settings.v1';
const APPEARANCE_KEY = 'pngrelay.appearance.v1';
const TOOLS_KEY = 'photoshoptool.tools.v1';
const COPY_BUTTON_KEY = 'photoshoptool.copyButton.v1';
const DESIGN_KEY = 'photoshoptool.designRefresh.v1';
const ORDER_KEY = 'photoshoptool.order.v1';
const SMART_AREA_KEY = 'photoshoptool.smartArea.v2';
const SELECTION_KEY = 'photoshoptool.selection.v1';
const SETTINGS_TAB_KEY = 'photoshoptool.settingsTab.v1';
function normalizeSelection(raw) {
  const r = raw && raw.schema === 1 ? raw : {};
  return { schema: 1, expandPx: Number.isInteger(r.expandPx) && r.expandPx >= 1 && r.expandPx <= 500 ? r.expandPx : 8 };
}
function readSelectionDraft(draft) {
  const raw = draft.expandPx == null ? '8' : String(draft.expandPx), expandPx = Number(raw);
  if (!raw.trim() || !Number.isInteger(expandPx) || expandPx < 1 || expandPx > 500) throw new Error('Expand Selection must be a whole number from 1 to 500 px.');
  return { expandPx };
}
function normalizeSmartArea(raw) {
  const r = raw && raw.schema === 2 ? raw : {};
  const legacyZero = raw && raw.schema === 1 && raw.feather === 0;
  return { schema: 2, blurPercent: typeof r.blurPercent === 'number' && Number.isFinite(r.blurPercent) && r.blurPercent >= 0 && r.blurPercent <= 100 ? r.blurPercent : legacyZero ? 0 : 5 };
}
function readSmartAreaValue(draft) {
  const raw = draft.smartAreaBlurPercent == null ? '5' : String(draft.smartAreaBlurPercent), blurPercent = Number(raw);
  if (!raw.trim() || !Number.isFinite(blurPercent) || blurPercent < 0 || blurPercent > 100) throw new Error('Smart Area edge blur must be from 0 to 100%.');
  return { schema: 2, blurPercent };
}
function readSmartAreaDraft(draft) { return { ...readExportDraft(draft), maskBlurPercent: readSmartAreaValue(draft).blurPercent }; }
function normalizeExport(raw) {
  const r = raw && raw.schema === 1 ? raw : {};
  return { schema: 1, overwrite: r.overwrite !== false, srgb: r.srgb === true,
    compression: Number.isInteger(r.compression) && r.compression >= 0 && r.compression <= 9 ? r.compression : 6 };
}
function normalizeAppearance(raw) {
  const r = raw && raw.schema === 1 ? raw : {};
  return { schema: 1, labels: r.labels === true, size: r.size === 'roomy' ? 'roomy' : 'compact',
    corners: r.corners === 'soft' ? 'soft' : 'square', theme: ['host', 'dark', 'light'].includes(r.theme) ? r.theme : 'host' };
}
function readExportDraft(draft) {
  const raw = String(draft.compression), compression = Number(raw);
  if (!raw.trim() || !Number.isInteger(compression) || compression < 0 || compression > 9) throw new Error('Compression must be a whole number from 0 to 9.');
  return normalizeExport({ schema: 1, overwrite: draft.overwrite, srgb: draft.srgb, compression });
}
function createPreferences(storage) {
  const problems = [];
  function read(key, fallback) { try { return JSON.parse(storage.getItem(key) || 'null'); } catch (_) { if (problems.length < 6) problems.push('Stored preference could not be read: ' + key); return fallback; } }
  return {
    problems: () => problems.slice(),
    settingsTab() { const id = read(SETTINGS_TAB_KEY); return ['view', 'tools', 'export', 'help'].includes(id) ? id : 'export'; },
    saveSettingsTab(id) { if (!['view', 'tools', 'export', 'help'].includes(id)) throw new Error('Unknown settings section.'); storage.setItem(SETTINGS_TAB_KEY, JSON.stringify(id)); return id; },
    export: () => normalizeExport(read(EXPORT_KEY)), appearance: () => normalizeAppearance(read(APPEARANCE_KEY)),
    smartArea: () => normalizeSmartArea(read(SMART_AREA_KEY) ?? read('photoshoptool.smartArea.v1')),
    selection: () => normalizeSelection(read(SELECTION_KEY)),
    saveSelection(value) { const next = normalizeSelection(value); storage.setItem(SELECTION_KEY, JSON.stringify(next)); return next; },
    saveSmartArea(value) { const next = normalizeSmartArea(value); storage.setItem(SMART_AREA_KEY, JSON.stringify(next)); return next; },
    order() { const raw = read(ORDER_KEY); return raw && raw.schema === 1 ? normalizeOrder(raw.ids) : []; },
    saveOrder(value) { const next = normalizeOrder(value); storage.setItem(ORDER_KEY, JSON.stringify({ schema: 1, ids: next })); return next; },
    saveExport(value) { const next = normalizeExport(value); storage.setItem(EXPORT_KEY, JSON.stringify(next)); return next; },
    saveAppearance(value) { const next = normalizeAppearance(value); storage.setItem(APPEARANCE_KEY, JSON.stringify(next)); return next; },
    refreshAppearance(value) {
      if (read(DESIGN_KEY) === 1) return value;
      const next = { ...value, corners: 'soft', labels: true };
      try { storage.setItem(APPEARANCE_KEY, JSON.stringify(next)); storage.setItem(DESIGN_KEY, '1'); }
      catch (_) { problems.push('Updated appearance could not be saved.'); }
      return next;
    },
    visibility() { const r = read(TOOLS_KEY); return r && r.schema === 1 && r.visible && typeof r.visible === 'object' ? { ...r.visible } : {}; },
    exposeCopyButton(visible) {
      if (read(COPY_BUTTON_KEY) === 1) return visible;
      const next = { ...visible, 'png.copy-only': true };
      try { storage.setItem(TOOLS_KEY, JSON.stringify({ schema: 1, visible: next })); storage.setItem(COPY_BUTTON_KEY, '1'); }
      catch (_) { problems.push('Copy button visibility could not be saved.'); }
      return next;
    },
    saveVisibility(visible) { const next = {}; for (const [id, value] of Object.entries(visible)) if (typeof value === 'boolean') next[id] = value; storage.setItem(TOOLS_KEY, JSON.stringify({ schema: 1, visible: next })); return next; }
  };
}
module.exports = { createPreferences, normalizeExport, normalizeAppearance, readExportDraft, normalizeSmartArea, readSmartAreaDraft, readSmartAreaValue, normalizeSelection, readSelectionDraft };
