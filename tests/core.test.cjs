'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { createRegistry } = require('../plugin/core/registry.js');
const { createRunner } = require('../plugin/core/runner.js');
const { createPreferences, normalizeExport } = require('../plugin/core/preferences.js');
const { createOutputAccess, fileURL } = require('../plugin/core/output-access.js');
const { withHistory } = require('../plugin/core/host.js');
const { location, selectionName } = require('../plugin/tools/png/logic.js');
const definition = (id = 'test.action') => ({ id, commandId: 'testAction', title: 'Test', label: 'Test', icon: 'copy', execute() {} });
function storage(seed = {}) { const values = new Map(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)])); return { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), values }; }
test('registry validates duplicate tool and command IDs before startup', () => {
  assert.throws(() => createRegistry([definition(), definition()]), /Duplicate/);
  assert.throws(() => createRegistry([definition(), definition('other.action')]), /command ID/);
  assert.throws(() => createRegistry([{ ...definition(), execute: null }]), /Incomplete/);
  assert.throws(() => createRegistry([{ ...definition(), id: '../unsafe' }]), /stable/);
});
test('registry is extensible without editing the runner or its services', async () => {
  const custom = { ...definition('custom.action'), execute: ctx => { ctx.record.customResult = ctx.answer; } };
  const registry = createRegistry([custom]); const runner = createRunner(registry, ctx => ({ ...ctx, answer: 42 }), () => {}, 'test');
  const r = await runner.run(custom.id); assert.equal(r.status, 'complete'); assert.equal(r.customResult, 42); assert.ok(Object.isFrozen(registry.get(custom.id)));
});
test('runner releases busy lock even if context creation or presentation fails', async () => {
  const registry = createRegistry([definition()]); let calls = 0;
  const runner = createRunner(registry, ctx => { if (++calls === 1) throw new Error('Context failed'); return ctx; }, () => { throw new Error('Detached UI'); }, 'test');
  assert.equal((await runner.run('test.action')).status, 'error'); assert.equal(runner.busy, false);
  assert.equal((await runner.run('test.action')).status, 'complete');
});
test('legacy PNG preferences preserve zero, false and unrelated tool visibility', () => {
  const old = { schema: 1, compression: 0, overwrite: false, srgb: true }, s = storage({ 'pngrelay.settings.v1': old });
  const prefs = createPreferences(s); assert.deepEqual(prefs.export(), old);
  prefs.saveAppearance({ schema: 1, labels: true, theme: 'light' }); prefs.saveVisibility({ 'png.copy-only': true });
  assert.deepEqual(prefs.export(), old); assert.equal(prefs.visibility()['png.copy-only'], true);
  assert.equal(prefs.appearance().labels, true); assert.equal(normalizeExport({ schema: 1, compression: 99 }).compression, 6);
});
test('safe Windows names retain Unicode and fit the per-file limit', () => {
  assert.deepEqual(location('C:\\Art\\План.v2.PSD'), { folder: 'C:/Art', base: 'План.v2' });
  assert.throws(() => location('cloud:id')); assert.throws(() => location('C:/Temp/Layer.psb'));
  const name = selectionName('😀'.repeat(200), 'bad/:*?name', 99); assert.ok(name.length <= 240); assert.ok(name.endsWith('99.png')); assert.ok(!name.includes('/'));
});
test('history cleanup keeps primary errors, including thrown falsy values', async () => {
  for (const error of [new Error('primary'), false, null, 0]) {
    let actual, notes = [];
    const ctx = { hostControl: { suspendHistory: async () => 1, resumeHistory: async () => { throw new Error('cleanup'); } } };
    try { await withHistory(ctx, 1, 'Test', async () => { throw error; }, note => notes.push(note)); } catch (e) { actual = e; }
    assert.equal(actual, error); assert.equal(notes.length, 1);
  }
});
function folderFixture(pref = storage()) {
  const folder = { isFolder: true, nativePath: 'C:\\Art', async getEntries() { return []; } }; let picks = 0;
  const urls = [];
  const fs = { async getFolder() { picks++; throw new Error('Unexpected picker'); }, async getEntryWithUrl(url) { urls.push(url); return folder; } };
  return { folder, fs, pref, urls, resolve: createOutputAccess(fs, pref), picks: () => picks };
}
test('project folder resolves directly on first use and after reload without a picker', async () => {
  const f = folderFixture(); assert.equal(await f.resolve({ folder: 'C:/Art' }, () => {}), f.folder); await f.resolve({ folder: 'C:/Art' }, () => {});
  const reloaded = createOutputAccess(f.fs, f.pref); await reloaded({ folder: 'c:/ART' }, () => {});
  assert.deepEqual(f.urls, ['file:/C:/Art', 'file:/C:/Art', 'file:/c:/ART']); assert.equal(f.picks(), 0); assert.equal(f.pref.values.size, 0);
});
test('wrong or inaccessible project folder fails with its cause and never launches a picker', async () => {
  const f = folderFixture(); f.folder.nativePath = 'C:/Other';
  await assert.rejects(f.resolve({ folder: 'C:/Art' }, () => {}), e => /Cannot access/.test(e.message) && /different location/.test(e.cause.message));
  const cause = Object.assign(new Error('Access denied'), { number: -42 }); f.fs.getEntryWithUrl = async () => { throw cause; };
  await assert.rejects(f.resolve({ folder: 'C:/Art' }, () => {}), e => e.cause === cause); assert.equal(f.picks(), 0);
});
test('new project locations are resolved again and old token preferences stay untouched', async () => {
  const pref = storage({ 'pngrelay.outputAccess.v1': { schema: 1, folders: { 'c:/art': 'old-token' } } }), f = folderFixture(pref);
  const before = pref.getItem('pngrelay.outputAccess.v1'); await f.resolve({ folder: 'C:/Art' }, () => {});
  f.folder.nativePath = 'D:/Moved'; await f.resolve({ folder: 'D:/Moved' }, () => {});
  assert.equal(f.urls[1], 'file:/D:/Moved'); assert.equal(pref.getItem('pngrelay.outputAccess.v1'), before);
});
test('UXP path conversion preserves native Unicode, spaces, percent and hash; supports drive root and UNC', () => {
  assert.equal(fileURL('C:\\Проекты\\100% #1'), 'file:/C:/Проекты/100% #1');
  assert.equal(fileURL('C:'), 'file:/C:/'); assert.equal(fileURL('\\\\server\\share\\Art'), 'file://server/share/Art');
  assert.throws(() => fileURL('../Art'), /absolute/); assert.throws(() => fileURL('cloud:id'), /absolute/);
});
test('copy-only option handling ignores unrelated invalid PNG compression', () => {
  const registry = require('../plugin/tools/index.js');
  assert.equal(registry.get('png.copy-only').readOptions({ compression: '', srgb: true }).srgb, true);
  assert.throws(() => registry.get('png.export-copy').readOptions({ compression: '', srgb: true }), /Compression/);
});
test('unreadable preferences surface a bounded problem without deleting stored data', () => {
  const s = storage(); s.getItem = () => '{bad json';
  const prefs = createPreferences(s); prefs.export(); assert.equal(prefs.problems().length, 1); assert.equal(s.values.size, 0);
});
test('Copy visibility migration preserves export settings and surfaces storage failure without blocking the button', () => {
  const s = storage({ 'pngrelay.settings.v1': { schema: 1, compression: 0, overwrite: false, srgb: false } });
  const before = s.getItem('pngrelay.settings.v1'), prefs = createPreferences(s);
  s.setItem = () => { throw new Error('Storage full'); };
  const visible = prefs.exposeCopyButton({ 'png.copy-only': false, 'png.selection-smart': false });
  assert.equal(visible['png.copy-only'], true); assert.equal(visible['png.selection-smart'], false);
  assert.equal(s.getItem('pngrelay.settings.v1'), before); assert.match(prefs.problems().join('\n'), /visibility could not be saved/);
});
