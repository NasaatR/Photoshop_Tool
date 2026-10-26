'use strict';
const { readExportDraft, normalizeExport } = require('../../core/preferences.js');
module.exports = [
  { id: 'png.export-copy', commandId: 'exportCopy', title: 'Export PNG + Copy', label: 'PNG + Copy', icon: 'export', defaultVisible: true,
    readOptions: readExportDraft, description: 'Export full-resolution PNG beside PSD and copy the image', execute: ctx => ctx.services.png.run('document', ctx) },
  { id: 'png.selection-smart', commandId: 'selectionSmart', title: 'Selection to Smart Object + PNG + Copy', label: 'Smart Object', icon: 'selection', defaultVisible: true,
    readOptions: readExportDraft, description: 'Ctrl+J → Smart Object → Open → PNG + Copy', execute: ctx => ctx.services.png.run('selection', ctx) },
  { id: 'png.export-only', commandId: 'exportPngOnly', title: 'Export PNG Only', label: 'PNG only', icon: 'export', defaultVisible: false,
    readOptions: readExportDraft, description: 'Save the full-resolution PNG without replacing the image clipboard', execute: ctx => ctx.services.png.run('save', ctx) },
  { id: 'png.copy-only', commandId: 'copyImageOnly', title: 'Copy Image Only', label: 'Copy only', icon: 'copy', defaultVisible: false,
    readOptions: draft => normalizeExport({ schema: 1, srgb: draft.srgb }), description: 'Copy visible artwork without writing PNG files or asking for a folder', execute: ctx => ctx.services.png.run('copy', ctx) }
];
