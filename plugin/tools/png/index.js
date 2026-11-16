'use strict';
const { readExportDraft, normalizeExport, readSmartAreaDraft } = require('../../core/preferences.js');
module.exports = [
  { group: 'Export & copy', id: 'png.export-copy', commandId: 'exportCopy', title: 'Export PNG + Copy', label: 'PNG + Copy', icon: 'export', format: 'PNG', emphasis: 'primary', defaultVisible: true,
    readOptions: readExportDraft, description: 'Save PNG beside the PSD and copy the full visible composition as one image', execute: ctx => ctx.services.png.run('document', ctx) },
  { group: 'Export & copy', id: 'png.copy-only', commandId: 'copyImageOnly', title: 'Copy Composition', label: 'Copy', icon: 'copy', defaultVisible: true,
    readOptions: draft => normalizeExport({ schema: 1, srgb: draft.srgb }), description: 'Copy the full visible composition as one image, ignoring the selection. No files are saved.', execute: ctx => ctx.services.png.run('copy', ctx) },
  { group: 'Export & copy', id: 'png.selection-smart', commandId: 'selectionSmart', title: 'Smart Area', label: 'Smart Area', icon: 'selection', defaultVisible: true,
    readOptions: readSmartAreaDraft, description: 'Extract to a Smart Object with a soft parent-layer mask, open contents, save PNG and copy. Uses a visible composite when needed.', execute: ctx => ctx.services.png.run('selection', ctx) },
  { group: 'Export & copy', id: 'png.export-only', commandId: 'exportPngOnly', title: 'Export PNG Only', label: 'PNG only', icon: 'export', format: 'PNG', defaultVisible: false,
    readOptions: readExportDraft, description: 'Save the full-resolution PNG without replacing the image clipboard', execute: ctx => ctx.services.png.run('save', ctx) }
];
