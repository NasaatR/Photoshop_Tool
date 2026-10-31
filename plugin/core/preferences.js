'use strict';
const EXPORT_KEY = 'pngrelay.settings.v1';
const APPEARANCE_KEY = 'pngrelay.appearance.v1';
const TOOLS_KEY = 'photoshoptool.tools.v1';
const COPY_BUTTON_KEY = 'photoshoptool.copyButton.v1';
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
    export: () => normalizeExport(read(EXPORT_KEY)), appearance: () => normalizeAppearance(read(APPEARANCE_KEY)),
    saveExport(value) { const next = normalizeExport(value); storage.setItem(EXPORT_KEY, JSON.stringify(next)); return next; },
    saveAppearance(value) { const next = normalizeAppearance(value); storage.setItem(APPEARANCE_KEY, JSON.stringify(next)); return next; },
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
module.exports = { createPreferences, normalizeExport, normalizeAppearance, readExportDraft };
