'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { createPSDService, nextPSDName } = require('../plugin/tools/psd/service.js');
const { createOutputAccess } = require('../plugin/core/output-access.js');
const { createHost } = require('../plugin/core/host.js');
const { createRunner } = require('../plugin/core/runner.js');
const registry = require('../plugin/tools/index.js');
function fixture(fail = {}) {
  const files = new Map(), events = [], nativeSaves = [];
  class Entry {
    constructor(name, content = '') { this.name = name; this.content = content; this.nativePath = 'C:/Art/' + name; this.isFile = true; }
    async delete() { events.push('delete'); if (fail.cleanup) throw new Error('Cleanup failed'); files.delete(this.name.toLowerCase()); }
  }
  const folder = { isFolder: true, nativePath: 'C:/Art', async getEntries() { return [...files.values()]; }, async createFile(name, options) {
    events.push('create'); assert.equal(options.overwrite, false);
    if (fail.race) { files.set(name.toLowerCase(), new Entry(name, 'concurrent work')); throw new Error('File exists'); }
    assert.equal(files.has(name.toLowerCase()), false); const file = new Entry(name); files.set(name.toLowerCase(), file); return file;
  } };
  const original = new Entry('Poster.png', 'original image'); files.set('poster.png', original);
  const source = { id: 1, name: 'Poster.png', path: 'C:\\Art\\Poster.png', width: 3000, height: 2000, layers: [{ id: 10 }, { id: 11 }], profile: 'Display P3', bitsPerChannel: 16,
    async save() { events.push('save'); if (fail.save) throw Object.assign(new Error('Native save failed'), { number: -54 }); },
    saveAs: { async psd(file, options, copy) {
      events.push('saveAs'); nativeSaves.push({ file, options, copy });
      if (fail.saveAs) { file.content = 'partial'; if (fail.bindOnError) source.path = file.nativePath; throw Object.assign(new Error('PSD write failed'), { number: fail.code || -36 }); }
      file.content = { layers: source.layers.slice(), profile: source.profile, depth: source.bitsPerChannel }; files.set(file.name.toLowerCase(), file);
      source.path = file.nativePath; source.name = file.name;
    } }
  };
  const app = { activeDocument: source, documents: [source] }, ctx = { isCancelled: false };
  const host = createHost({ app, constants: {}, action: {}, core: { async executeAsModal(work) { events.push('modal'); if (fail.onModal) fail.onModal({ app, source }); return work(ctx); } } }, { photoshop: '28.0.1' });
  const fs = { async getEntryWithUrl(url) { events.push('folder'); assert.equal(url, 'file:/C:/Art'); if (fail.access) throw new Error('Access denied'); return folder; }, async getFileForSaving(name, options) { events.push('picker'); assert.equal(name, 'Untitled.psd'); assert.deepEqual(options.types, ['psd']); return fail.cancel ? null : fail.chosen || new Entry('Untitled.psd'); } };
  const service = createPSDService(host, fs, createOutputAccess(fs));
  const runner = createRunner(registry, job => ({ ...job, services: { psd: service } }), () => {}, '1.4.0');
  return { source, app, files, events, nativeSaves, original, Entry, run: () => runner.run('psd.quick-save', {}) };
}
test('Quick PSD saves all editable layers/profile/depth beside the image and switches the working path', async () => {
  const f = fixture(), layers = f.source.layers;
  const r = await f.run(); assert.equal(r.status, 'complete', r.error); assert.equal(r.psdSaved, true); assert.equal(r.psdCreated, true);
  assert.equal(r.filename, 'Poster.psd'); assert.equal(f.source.path, 'C:/Art/Poster.psd'); assert.equal(f.source.layers, layers); assert.equal(f.original.content, 'original image');
  assert.deepEqual(f.files.get('poster.psd').content, { layers, profile: 'Display P3', depth: 16 });
  assert.deepEqual(f.nativeSaves[0].options, { layers: true, alphaChannels: true, annotations: true, embedColorProfile: true, maximizeCompatibility: true, spotColor: true }); assert.equal(f.nativeSaves[0].copy, false);
  assert.ok(!f.events.includes('picker')); assert.equal(r.pngSaved, false); assert.equal(r.imageCopied, false); assert.equal(f.app.documents.length, 1);
  const next = await f.run(); assert.equal(next.status, 'complete'); assert.equal(next.psdCreated, undefined); assert.equal(f.nativeSaves.length, 1); assert.ok(f.events.includes('save'));
});
test('Quick PSD never overwrites same-name PSDs or an open destination; Windows case collisions count', async () => {
  const f = fixture(), old = new f.Entry('POSTER.PSD', 'previous project'); f.files.set('poster.psd', old);
  f.app.documents.push({ id: 2, path: 'C:/Art/Poster (2).psd' });
  const r = await f.run(); assert.equal(r.status, 'complete', r.error); assert.equal(r.filename, 'Poster (3).psd'); assert.equal(old.content, 'previous project');
  assert.equal(nextPSDName('😀'.repeat(200), new Set()).endsWith('.psd'), true); assert.ok(nextPSDName('😀'.repeat(200), new Set()).length <= 240);
});
test('existing PSD/PSB saves in place without a picker or copy and retains native save errors', async () => {
  for (const extension of ['psd', 'psb']) {
    const f = fixture(); f.source.path = 'C:/Art/Project.' + extension; f.source.name = 'Project.' + extension;
    const r = await f.run(); assert.equal(r.status, 'complete'); assert.equal(r.message, extension.toUpperCase() + ' saved'); assert.deepEqual(f.events, ['modal', 'save']);
  }
  const f = fixture({ save: true }); f.source.path = 'C:/Art/Project.psd';
  const r = await f.run(); assert.equal(r.status, 'error'); assert.equal(r.code, -54); assert.equal(r.psdSaved, undefined);
});
test('unknown source location uses one PSD picker; cancellation never starts saving', async () => {
  const f = fixture(); f.source.path = '';
  const r = await f.run(); assert.equal(r.status, 'complete', r.error); assert.equal(f.source.name, 'Untitled.psd'); assert.equal(f.events.filter(e => e === 'picker').length, 1);
  const cancel = fixture({ cancel: true }); cancel.source.path = ''; const cancelled = await cancel.run();
  assert.equal(cancelled.status, 'cancelled'); assert.deepEqual(cancel.events, ['picker']); assert.equal(cancel.source.name, 'Poster.png');
});
test('Quick PSD revalidates document/location and stops before output on access, race or size failures', async () => {
  const f = fixture({ onModal: ({ source }) => { source.path = 'C:/Art/Changed.png'; } });
  assert.equal((await f.run()).status, 'error'); assert.ok(!f.events.includes('create')); assert.ok(!f.events.includes('saveAs'));
  const denied = fixture({ access: true }); assert.equal((await denied.run()).status, 'error'); assert.ok(!denied.events.includes('modal'));
  const race = fixture({ race: true }); assert.equal((await race.run()).status, 'error'); assert.equal(race.files.get('poster.psd').content, 'concurrent work'); assert.ok(!race.events.includes('delete'));
  const big = fixture(); big.source.width = 30001; assert.match((await big.run()).error, /PSB/); assert.equal(big.events.length, 0);
});
test('failed PSD saves remove only owned partial files and retain uncertain document-backed output', async () => {
  const f = fixture({ saveAs: true }), r = await f.run();
  assert.equal(r.status, 'error'); assert.equal(r.code, -36); assert.equal(r.psdSaved, undefined); assert.equal(f.files.has('poster.psd'), false); assert.equal(f.original.content, 'original image');
  const uncertain = fixture({ saveAs: true, bindOnError: true }), result = await uncertain.run();
  assert.equal(result.status, 'error'); assert.equal(uncertain.files.get('poster.psd').content, 'partial'); assert.match(result.warnings[0], /Check the saved PSD/); assert.ok(!uncertain.events.includes('delete'));
  const cleanup = fixture({ saveAs: true, cleanup: true }), failed = await cleanup.run();
  assert.equal(failed.code, -36); assert.match(failed.cleanupErrors[0].message, /Cleanup failed/);
});
test('native PSD cancellation is reported as cancellation and late-opened dialog destinations are rejected', async () => {
  const f = fixture({ saveAs: true, code: -128 });
  const cancelled = await f.run(); assert.equal(cancelled.status, 'cancelled'); assert.equal(f.files.has('poster.psd'), false);
  const conflict = fixture({ onModal: ({ app }) => { app.documents.push({ id: 2, path: 'C:/Art/Untitled.psd' }); } }); conflict.source.path = '';
  const r = await conflict.run(); assert.equal(r.status, 'error'); assert.match(r.error, /Close the destination/); assert.ok(!conflict.events.includes('saveAs'));
});
