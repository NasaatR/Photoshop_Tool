'use strict';
const assert = require('node:assert/strict');
const registry = require('../plugin/tools/index.js');
const { createHost } = require('../plugin/core/host.js');
const { createPNGService } = require('../plugin/tools/png/service.js');
const { createRunner } = require('../plugin/core/runner.js');
const { normalizeExport } = require('../plugin/core/preferences.js');
function fixture(fail = {}) {
  const events = [], files = new Map(), autoClose = new Set(), statuses = [];
  let docID = 1, layerID = 100, parentLayers, folderCalls = 0;
  const C = { DocumentMode: { RGB: 'RGB', GRAYSCALE: 'GRAY' }, BitsPerChannelType: { EIGHT: 'bitDepth8', SIXTEEN: 'bitDepth16' },
    LayerKind: { NORMAL: 'pixel', SMARTOBJECT: 'smart' }, ChannelType: { COMPONENT: 'component' },
    SaveOptions: { DONOTSAVECHANGES: 0 }, PNGMethod: { QUICK: 'quick' }, ChangeMode: { RGB: 'RGB' }, Intent: { RELATIVECOLORIMETRIC: 'relative' } };
  function hit(name) { events.push(name); if (typeof fail[name] === 'function') return fail[name](); if (fail[name]) throw new Error('Injected ' + name); }
  class Entry {
    constructor(name, image) { this.name = name; this.image = image; this.isFile = true; }
    async moveTo(folder, options) {
      hit(options.newName === 'Design.png' ? this.name.includes('backup-') ? 'restore' : 'commit' : 'backup');
      if (files.has(options.newName) && !options.overwrite) throw new Error('File exists');
      files.delete(this.name); this.name = options.newName; files.set(this.name, this);
    }
    async delete() { hit('delete'); files.delete(this.name); }
  }
  const folder = { isFolder: true, async getEntries() { hit('list'); return Array.from(files.values()); }, async createFile(name) { hit('createFile'); return new Entry(name); } };
  const app = { documents: [], activeDocument: null, version: 'mock-27.x', preferences: { general: { exportClipboard: true } } };
  function makeDoc(name, path, width = 4096, height = 2160, depth = C.BitsPerChannelType.SIXTEEN) {
    const channel = { kind: C.ChannelType.COMPONENT };
    const doc = { id: ++docID, name, path, width, height, bitsPerChannel: depth, mode: C.DocumentMode.RGB, quickMaskMode: false,
      componentChannels: [channel], activeChannels: [channel], layers: [], activeLayers: [],
      selection: { bounds: { left: 5, top: 7, right: 105, bottom: 87 }, async deselect() { hit('deselect'); this.bounds = null; }, async selectAll() { hit('selectAll'); } },
      async duplicate(name, merged) { hit('duplicate'); assert.equal(merged, true); return makeDoc(name, '', this.width, this.height, this.bitsPerChannel); },
      async close() { hit('close'); app.documents = app.documents.filter(d => d !== this); if (app.activeDocument === this) app.activeDocument = app.documents[0]; },
      async changeMode() { hit('mode'); this.mode = C.DocumentMode.RGB; }, async convertProfile() { hit('profile'); },
      saveAs: { async png(entry, options, copy) { hit('save'); assert.equal(copy, true); assert.equal(options.compression, 6); entry.image = { width, height, depth }; files.set(entry.name, entry); } } };
    const layer = { id: ++layerID, name: 'Cutout', kind: C.LayerKind.NORMAL, async copy(merged) { hit('copy'); assert.equal(merged, true); } };
    doc.layers = [layer]; doc.activeLayers = [layer]; app.documents.push(doc); app.activeDocument = doc; return doc;
  }
  const source = makeDoc('Design.psd', 'C:\\Art\\Design.psd');
  app.open = async entry => { hit('open'); return makeDoc(entry.name, 'C:/Art/' + entry.name, fail.badDimensions ? 1 : entry.image.width, entry.image.height, entry.image.depth); };
  const ctx = { isCancelled: false, hostControl: {
    async registerAutoCloseDocument(id) { autoClose.add(id); }, async unregisterAutoCloseDocument(id) { autoClose.delete(id); },
    async suspendHistory() { hit('suspend'); parentLayers = source.layers.slice(); return 1; },
    async resumeHistory(id, commit) { hit('resume'); if (!commit) { source.layers = parentLayers; source.activeLayers = [source.layers[0]]; } }
  } };
  const ps = { app, constants: C, core: { async executeAsModal(fn) {
    hit('modal');
    if (fail.changedDocument) makeDoc('Other.psd', 'C:/Art/Other.psd');
    try { return await fn(ctx); } finally { app.documents = app.documents.filter(d => !autoClose.has(d.id)); autoClose.clear(); }
  } }, action: { async batchPlay(commands) {
    const c = commands[0]; hit(c._obj);
    if (fail.actionError === c._obj) return [{ _obj: 'error', result: -1, message: 'Action unavailable' }];
    if (c._obj === 'copyToLayer') { const copied = { ...source.activeLayers[0], id: ++layerID }; source.layers.push(copied); source.activeLayers = [copied]; }
    if (c._obj === 'newPlacedLayer') source.activeLayers[0].kind = C.LayerKind.SMARTOBJECT;
    if (c._obj === 'placedLayerEditContents') makeDoc('Cutout.psb', 'C:/Temp/Cutout.psb', 100, 80);
    if (c._obj === 'select') app.activeDocument = app.documents.find(d => d.id === c._target[0]._id);
    return [{}];
  } } };
  const host = createHost(ps), services = { png: createPNGService(host, async root => { hit('folder'); folderCalls++; assert.equal(root.folder, 'C:/Art'); if (fail.folderCancel) throw new Error('Folder access cancelled'); return folder; }) };
  const runner = createRunner(registry, context => ({ ...context, services }), (...s) => statuses.push(s), '0.3.0');
  return { app, source, C, files, Entry, folder, events, ctx, statuses, runner, services, host, folderCalls: () => folderCalls,
    run: (id = 'png.export-copy', options) => runner.run(id, normalizeExport(options)) };
}
module.exports = { fixture };
