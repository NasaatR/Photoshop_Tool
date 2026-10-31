'use strict';
const assert = require('node:assert/strict');
const registry = require('../plugin/tools/index.js');
const { createHost } = require('../plugin/core/host.js');
const { createPNGService } = require('../plugin/tools/png/service.js');
const { createRunner } = require('../plugin/core/runner.js');
const { createOutputAccess } = require('../plugin/core/output-access.js');
const { normalizeExport } = require('../plugin/core/preferences.js');
const { pngFixture } = require('./png-fixture.cjs');
function fixture(fail = {}) {
  const events = [], files = new Map(), autoClose = new Set(), statuses = [], copied = [], stamps = [];
  let docID = 1, layerID = 100, parentState, folderCalls = 0;
  const C = { DocumentMode: { RGB: 'RGB', GRAYSCALE: 'GRAY' }, BitsPerChannelType: { EIGHT: 'bitDepth8', SIXTEEN: 'bitDepth16' },
    LayerKind: { NORMAL: 'pixel', SMARTOBJECT: 'smart', GROUP: 'group', TEXT: 'text' }, ChannelType: { COMPONENT: 'component' },
    SelectionType: { REPLACE: 'replace' }, ElementPlacement: { PLACEBEFORE: 'before' },
    SaveOptions: { DONOTSAVECHANGES: 0 }, PNGMethod: { QUICK: 'quick' }, ChangeMode: { RGB: 'RGB' }, Intent: { RELATIVECOLORIMETRIC: 'relative' } };
  function hit(name) { events.push(name); if (typeof fail[name] === 'function') return fail[name](); if (fail[name]) throw new Error('Injected ' + name); }
  function allLayers(layers) { return layers.flatMap(layer => [layer, ...(layer.layers ? allLayers(layer.layers) : [])]); }
  function removeLayer(layers, id) { const at = layers.findIndex(layer => layer.id === id); if (at >= 0) return layers.splice(at, 1); for (const layer of layers) if (layer.layers) removeLayer(layer.layers, id); }
  function makeLayer(doc, name, kind = C.LayerKind.NORMAL) {
    const layer = { id: ++layerID, name, visible: true, kind,
      get boundsNoEffects() { return this.empty ? { left: 0, top: 0, right: 0, bottom: 0 } : { left: 0, top: 0, right: doc.width, bottom: doc.height }; },
      async copy(merged) { hit('copy'); assert.equal(merged, true); copied.push({ docID: doc.id, composition: doc.composition, width: doc.width, height: doc.height, selection: doc.selection.bounds }); },
      async delete() { hit('deleteLayer'); removeLayer(doc.layers, layer.id); doc.activeLayers = doc.activeLayers.filter(active => active.id !== layer.id); },
      async move(target, placement) { hit('moveLayer'); assert.equal(placement, C.ElementPlacement.PLACEBEFORE); removeLayer(doc.layers, layer.id); doc.layers.splice(doc.layers.indexOf(target), 0, layer); }
    };
    return layer;
  }
  class Entry {
    constructor(name, image) { this.name = name; this.image = image; this.isFile = true; }
    async moveTo(folder, options) {
      hit(options.newName === 'Design.png' ? this.name.includes('backup-') ? 'restore' : 'commit' : 'backup');
      if (files.has(options.newName) && !options.overwrite) throw new Error('File exists');
      files.delete(this.name); this.name = options.newName; files.set(this.name, this);
    }
    async delete() { hit('delete'); files.delete(this.name); }
    async read() {
      hit('read');
      const image = this.image;
      let data = pngFixture(fail.badDimensions ? 1 : image.width, image.height, fail.badDepth ? 8 : image.depth === C.BitsPerChannelType.SIXTEEN ? 16 : 8, image.mode === C.DocumentMode.GRAYSCALE ? 4 : 6);
      if (fail.corruptPNG) { data = Buffer.from(data); data[data.length - 5] ^= 1; }
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    }
  }
  const folder = { isFolder: true, nativePath: 'C:/Art', async getEntries() { hit('list'); return Array.from(files.values()); }, async createFile(name) { hit('createFile'); return new Entry(name); } };
  const app = { documents: [], activeDocument: null, version: 'mock-27.x', preferences: { general: { exportClipboard: true } } };
  function makeDoc(name, path, width = 4096, height = 2160, depth = C.BitsPerChannelType.SIXTEEN) {
    const channel = { name: 'RGB', kind: C.ChannelType.COMPONENT };
    const doc = { id: ++docID, name, path, width, height, bitsPerChannel: depth, mode: C.DocumentMode.RGB, quickMaskMode: false,
      componentChannels: [channel], activeChannels: [channel], channels: [channel], layers: [], activeLayers: [],
      selection: { bounds: { left: 5, top: 7, right: 105, bottom: 87 }, mask: [0, 64, 128, 255],
        async deselect() { hit('deselect'); this.bounds = null; this.mask = null; }, async selectAll() { hit('selectAll'); },
        async selectRectangle(bounds, mode) { hit('selectRectangle'); assert.equal(mode, C.SelectionType.REPLACE); this.bounds = { ...bounds }; this.mask = 'canvas'; },
        async save(name) { hit('saveSelection'); const saved = { name, kind: 'alpha', bounds: this.bounds, mask: this.mask, async remove() { hit('deleteChannel'); doc.channels = doc.channels.filter(channel => channel !== saved); } }; doc.channels.push(saved); },
        async load(channel) { hit('loadSelection'); this.bounds = channel.bounds; this.mask = channel.mask; }
      },
      async createLayer(kind, options) { hit('createLayer'); const layer = makeLayer(this, options.name, kind); layer.empty = true;
        if (fail.nestedHelper && this.layers[0].layers) this.layers[0].layers.unshift(layer); else this.layers.unshift(layer);
        this.activeLayers = [layer]; return layer;
      },
      async duplicate(name, merged) { hit('duplicate'); assert.equal(merged, true); const copy = makeDoc(name, '', this.width, this.height, this.bitsPerChannel); copy.mode = this.mode; copy.composition = this.layers.filter(layer => layer.visible !== false).map(layer => layer.id); return copy; },
      async close() { hit('close'); app.documents = app.documents.filter(d => d !== this); if (app.activeDocument === this) app.activeDocument = app.documents[0]; },
      async changeMode() { hit('mode'); this.mode = C.DocumentMode.RGB; }, async convertProfile() { hit('profile'); },
      saveAs: { async png(entry, options, copy) { hit('save'); assert.equal(copy, true); assert.equal(options.compression, 6); entry.image = { width: doc.width, height: doc.height, depth: doc.bitsPerChannel, mode: doc.mode }; files.set(entry.name, entry); } } };
    const layer = makeLayer(doc, 'Cutout');
    doc.layers = [layer]; doc.activeLayers = [layer]; app.documents.push(doc); app.activeDocument = doc; return doc;
  }
  const source = makeDoc('Design.psd', 'C:\\Art\\Design.psd');
  app.open = async () => { hit('open'); assert.fail('Export must not reopen PNG documents'); };
  const ctx = { isCancelled: false, hostControl: {
    async registerAutoCloseDocument(id) { autoClose.add(id); }, async unregisterAutoCloseDocument(id) { autoClose.delete(id); },
    async suspendHistory() { hit('suspend'); parentState = { layers: source.layers.slice(), children: allLayers(source.layers).filter(layer => layer.layers).map(layer => [layer, layer.layers.slice()]), channels: source.channels.slice(), active: source.activeLayers.slice(), bounds: source.selection.bounds, mask: source.selection.mask }; return 1; },
    async resumeHistory(id, commit) { hit('resume'); if (!commit) { source.layers = parentState.layers; parentState.children.forEach(([layer, children]) => { layer.layers = children; }); source.channels = parentState.channels; source.activeLayers = parentState.active; source.selection.bounds = parentState.bounds; source.selection.mask = parentState.mask; } }
  } };
  const ps = { app, constants: C, core: { async executeAsModal(fn) {
    hit('modal');
    if (fail.changedDocument) makeDoc('Other.psd', 'C:/Art/Other.psd');
    try { return await fn(ctx); } finally { app.documents = app.documents.filter(d => !autoClose.has(d.id)); autoClose.clear(); }
  } }, action: { async batchPlay(commands) {
    const c = commands[0]; hit(c._obj);
    if (fail.actionError === c._obj) return [{ _obj: 'error', result: -1, message: 'Action unavailable' }];
    if (c._obj === 'mergeVisible') {
      assert.equal(c.duplicate, true); assert.equal(source.selection.bounds, null);
      const composition = allLayers(source.layers).filter(layer => layer.visible !== false && !layer.empty).map(layer => layer.id); stamps.push(composition);
      if (fail.stampNoop) return [{}];
      if (fail.destructiveStamp) source.layers = [];
      const stamped = fail.stampReusesHelper ? source.activeLayers[0] : makeLayer(source, 'Composite'); stamped.empty = false; stamped.composition = composition;
      if (!fail.stampReusesHelper) source.layers.unshift(stamped); source.activeLayers = [stamped];
    }
    if (c._obj === 'copyToLayer') { const original = source.activeLayers[0], copied = makeLayer(source, original.name); const b = source.selection.bounds;
      copied.region = b ? { width: b.right - b.left, height: b.bottom - b.top } : { width: source.width, height: source.height };
      copied.composition = original.composition; source.layers.push(copied); source.activeLayers = [copied];
    }
    if (c._obj === 'newPlacedLayer') source.activeLayers[0].kind = C.LayerKind.SMARTOBJECT;
    if (c._obj === 'placedLayerEditContents') { const region = source.activeLayers[0].region; makeDoc('Cutout.psb', 'C:/Temp/Cutout.psb', region.width, region.height); }
    if (c._obj === 'select') {
      if (c._target[0]._ref === 'document') app.activeDocument = app.documents.find(d => d.id === c._target[0]._id);
      else source.activeLayers = [allLayers(source.layers).find(layer => layer.id === c._target[0]._id)];
    }
    return [{}];
  } } };
  const fs = { async getEntryWithUrl(url) { hit('folder'); folderCalls++; assert.equal(url, 'file:/C:/Art'); if (fail.folderAccess) throw new Error('Access denied'); return folder; }, async getFolder() { assert.fail('PNG tools must not request a folder picker'); } };
  const host = createHost(ps), services = { png: createPNGService(host, createOutputAccess(fs), file => file.read()) };
  const runner = createRunner(registry, context => ({ ...context, services }), (...s) => statuses.push(s), '0.3.3');
  return { app, source, C, files, Entry, folder, events, ctx, statuses, copied, stamps, runner, services, host, makeLayer: (name, kind) => makeLayer(source, name, kind), folderCalls: () => folderCalls,
    run: (id = 'png.export-copy', options) => runner.run(id, normalizeExport(options)) };
}
module.exports = { fixture };
