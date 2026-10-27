'use strict';
async function findEntry(folder, name) {
  const entries = await folder.getEntries();
  return entries.find(e => e.name.toLowerCase() === name.toLowerCase()) || null;
}
async function commitOutput(folder, stage, name, overwrite, cancel, warn) {
  cancel();
  const old = await findEntry(folder, name);
  if (old && !old.isFile) throw new Error('The output name is occupied by a folder.');
  if (old && !overwrite) throw new Error('PNG already exists. Enable Replace existing PNG to update it.');
  let backup = null;
  if (old) {
    const backupName = '.photoshoptool-backup-' + Date.now() + '-' + Math.random().toString(16).slice(2) + '.png';
    await old.moveTo(folder, { newName: backupName, overwrite: false });
    // Retain the moved handle directly. A failing second lookup must not strand
    // the previous export without recovery context.
    backup = old;
  }
  try { await stage.moveTo(folder, { newName: name, overwrite: false }); }
  catch (primary) {
    if (backup) {
      try { await backup.moveTo(folder, { newName: name, overwrite: false }); }
      catch (e) { warn('Previous PNG retained as ' + backup.name + '. Restore it manually before retrying.', e); }
    }
    throw primary;
  }
  if (backup) try { await backup.delete(); } catch (e) { warn('Previous PNG backup retained: ' + backup.name, e); }
}
module.exports = { findEntry, commitOutput };
