'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { fixture } = require('./fixture.cjs');
test('full export keeps 16-bit full canvas and source state; one PNG open', async () => {
  const f = fixture(), selection = f.source.selection.bounds;
  const r = await f.run(); assert.equal(r.status, 'complete'); assert.equal(r.width, 4096); assert.equal(r.height, 2160); assert.equal(r.depth, 'bitDepth16');
  assert.equal(r.pngSaved, true); assert.equal(r.imageCopied, true); assert.equal(typeof r.durationMs, 'number');
  assert.equal(f.source.layers.length, 1); assert.equal(f.source.selection.bounds, selection); assert.equal(f.app.activeDocument, f.source); assert.equal(f.app.documents.length, 1);
  assert.equal(f.events.filter(e => e === 'open').length, 1); assert.deepEqual([...f.files.keys()], ['Design.png']);
});
test('PNG only works when Export Clipboard is disabled and does not copy', async () => {
  const f = fixture(); f.app.preferences.general.exportClipboard = false;
  const r = await f.run('png.export-only'); assert.equal(r.status, 'complete'); assert.equal(r.pngSaved, true); assert.equal(r.imageCopied, false); assert.ok(!f.events.includes('copy'));
});
test('copy only works on an unsaved document without folder, disk, save or PNG open', async () => {
  const f = fixture(); f.source.path = ''; f.source.name = 'Untitled';
  const r = await f.run('png.copy-only'); assert.equal(r.status, 'complete'); assert.equal(r.imageCopied, true); assert.equal(r.pngSaved, false);
  assert.equal(f.folderCalls(), 0); assert.equal(f.files.size, 0);
  for (const event of ['save', 'createFile', 'open', 'list']) assert.ok(!f.events.includes(event), event);
  assert.equal(f.app.activeDocument, f.source); assert.equal(f.app.documents.length, 1);
});
test('reopened PNG mismatch does not replace an existing image or copy', async () => {
  const f = fixture({ badDimensions: true }); const old = new f.Entry('Design.png'); f.files.set(old.name, old);
  const r = await f.run(); assert.equal(r.status, 'error'); assert.equal(r.pngSaved, false); assert.equal(r.imageCopied, false); assert.equal(f.files.get('Design.png'), old); assert.equal(f.files.size, 1);
});
test('failed save preserves original export and closes operation-owned documents', async () => {
  const f = fixture({ save: true }); const old = new f.Entry('Design.png'); f.files.set(old.name, old);
  const r = await f.run(); assert.equal(r.status, 'error'); assert.equal(f.files.get('Design.png'), old); assert.equal(f.app.documents.length, 1); assert.equal(f.app.activeDocument, f.source);
});
test('copy failure still commits valid PNG and reports partial success', async () => {
  const f = fixture({ copy: true }); const r = await f.run();
  assert.equal(r.pngSaved, true); assert.equal(r.imageCopied, false); assert.equal(r.status, 'error'); assert.ok(f.files.has('Design.png')); assert.match(f.statuses.at(-1)[0], /PNG saved/);
});
test('replacement failure restores previous PNG while reporting clipboard effect', async () => {
  const f = fixture({ commit: true }); const old = new f.Entry('Design.png'); f.files.set(old.name, old);
  const r = await f.run(); assert.equal(r.pngSaved, false); assert.equal(r.imageCopied, true); assert.equal(f.files.get('Design.png'), old); assert.equal(f.files.size, 1);
  assert.match(f.statuses.at(-1)[0], /Image copied; PNG saving did not finish/);
});
test('failed restoration retains the backup and reports a recovery filename', async () => {
  const f = fixture({ commit: true, restore: true }); const old = new f.Entry('Design.png'); f.files.set(old.name, old);
  const r = await f.run(); assert.equal(r.status, 'error'); assert.equal(f.files.size, 1); assert.ok([...f.files.keys()][0].includes('backup-')); assert.match(r.warnings[0], /Restore it manually/);
});
test('backup deletion failure leaves new output intact and reports retained backup', async () => {
  const f = fixture({ delete: true }); const old = new f.Entry('Design.png'); f.files.set(old.name, old);
  const r = await f.run(); assert.equal(r.status, 'complete'); assert.equal(f.files.size, 2); assert.match(r.warnings[0], /backup retained/);
});
test('overwrite disabled fails before document duplication', async () => {
  const f = fixture(); f.files.set('Design.png', new f.Entry('Design.png'));
  const r = await f.run('png.export-copy', { schema: 1, overwrite: false }); assert.equal(r.status, 'error'); assert.ok(!f.events.includes('duplicate'));
});
test('Smart Object extraction retains source, opens contents and exports beside parent', async () => {
  const f = fixture(); const r = await f.run('png.selection-smart');
  assert.equal(r.status, 'complete'); assert.equal(r.smartObjectCreated, true); assert.equal(f.source.layers.length, 2); assert.equal(f.source.layers[0].kind, f.C.LayerKind.NORMAL);
  assert.equal(f.app.documents.length, 2); assert.equal(f.app.activeDocument.name, 'Cutout.psb'); assert.match(r.filename, /^Design — Cutout — \d+\.png$/); assert.equal(r.width, 100); assert.equal(r.height, 80);
  const repeat = await f.run(); assert.equal(repeat.filename, r.filename); assert.equal(repeat.status, 'complete'); assert.equal(f.source.layers.length, 2);
});
test('Smart Object conversion failure rolls back parent layer creation', async () => {
  const f = fixture({ actionError: 'newPlacedLayer' }); const r = await f.run('png.selection-smart');
  assert.equal(r.status, 'error'); assert.equal(r.smartObjectCreated, false); assert.equal(f.source.layers.length, 1); assert.equal(f.app.documents.length, 1);
});
test('selection export failure retains committed Smart Object for retry', async () => {
  const f = fixture({ save: true }); const r = await f.run('png.selection-smart');
  assert.equal(r.status, 'error'); assert.equal(r.smartObjectCreated, true); assert.equal(f.source.layers.length, 2); assert.equal(f.app.activeDocument.name, 'Cutout.psb'); assert.equal(f.app.documents.length, 2);
});
test('preflight failures perform no document mutation', async () => {
  for (const scenario of ['cloud', 'mode', 'depth', 'clipboard', 'selection', 'layer']) {
    const f = fixture();
    if (scenario === 'cloud') f.source.path = 'cloud:id';
    if (scenario === 'mode') f.source.mode = 'CMYK';
    if (scenario === 'depth') f.source.bitsPerChannel = 'bitDepth32';
    if (scenario === 'clipboard') f.app.preferences.general.exportClipboard = false;
    if (scenario === 'selection') f.source.selection.bounds = null;
    if (scenario === 'layer') f.source.activeLayers[0].kind = f.C.LayerKind.SMARTOBJECT;
    const r = await f.run(['selection', 'layer'].includes(scenario) ? 'png.selection-smart' : 'png.export-copy');
    assert.equal(r.status, 'error', scenario); assert.ok(!f.events.includes('modal'), scenario); assert.equal(f.files.size, 0);
  }
});
test('document changes while acquiring modal never exports the wrong document', async () => {
  const f = fixture({ changedDocument: true }); const r = await f.run(); assert.equal(r.status, 'error'); assert.equal(f.files.size, 0); assert.ok(!f.events.includes('duplicate'));
});
test('folder cancellation stops before any Photoshop mutation', async () => {
  const f = fixture({ folderCancel: true }); const r = await f.run(); assert.equal(r.status, 'error'); assert.ok(!f.events.includes('modal')); assert.equal(f.files.size, 0);
});
test('selection changes during the folder grant are revalidated', async () => {
  const f = fixture({ folder: () => { f.source.selection.bounds.right = 900; } }); const r = await f.run('png.selection-smart');
  assert.equal(r.status, 'error'); assert.match(r.error, /selection changed/); assert.equal(f.source.layers.length, 1);
});
test('cancel after scratch creation uses host auto-close and commits nothing', async () => {
  const f = fixture({ deselect: () => { f.ctx.isCancelled = true; } }); const r = await f.run(); assert.equal(r.status, 'error'); assert.equal(r.pngSaved, false); assert.equal(f.files.size, 0); assert.equal(f.app.documents.length, 1);
});
test('single-flight runner rejects rapid parallel commands without a second modal', async () => {
  let release; const f = fixture(); const duplicate = f.source.duplicate;
  f.source.duplicate = async function (...args) { await new Promise(resolve => { release = resolve; }); return duplicate.apply(this, args); };
  const first = f.run(); while (!release) await new Promise(resolve => setImmediate(resolve));
  const second = await f.run('png.copy-only'); assert.equal(second.status, 'busy'); release(); assert.equal((await first).status, 'complete'); assert.equal(f.events.filter(e => e === 'modal').length, 1);
});
