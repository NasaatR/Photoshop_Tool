'use strict';
const KEY = 'pngrelay.outputAccess.v1';
const canonical = path => String(path || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
function createOutputAccess(fs, storage) {
  const remembered = new Map();
  let saved = { schema: 1, folders: {} };
  try { const r = JSON.parse(storage.getItem(KEY) || 'null'); if (r && r.schema === 1 && r.folders && typeof r.folders === 'object' && !Array.isArray(r.folders)) saved = r; } catch (_) {}
  return async (root, progress) => {
    const expected = canonical(root.folder);
    const verify = async folder => {
      if (!folder || !folder.isFolder || canonical(folder.nativePath) !== expected) throw new Error('Folder moved or inaccessible.');
      await folder.getEntries(); return folder;
    };
    if (remembered.has(expected)) {
      try { return await verify(remembered.get(expected)); } catch (_) { remembered.delete(expected); }
    }
    if (typeof saved.folders[expected] === 'string') {
      try { const folder = await verify(await fs.getEntryForPersistentToken(saved.folders[expected])); remembered.set(expected, folder); return folder; } catch (_) {}
    }
    progress('Choose this PSD folder once:\n' + root.folder);
    const folder = await fs.getFolder();
    if (!folder) throw new Error('Folder access cancelled. Nothing was exported.');
    if (!folder.isFolder || canonical(folder.nativePath) !== expected) throw new Error('Choose the PSD folder exactly: ' + root.folder);
    await folder.getEntries();
    const token = await fs.createPersistentToken(folder);
    const next = { schema: 1, folders: { ...saved.folders, [expected]: token } };
    storage.setItem(KEY, JSON.stringify(next)); saved = next; remembered.set(expected, folder); return folder;
  };
}
module.exports = { createOutputAccess, canonical };
