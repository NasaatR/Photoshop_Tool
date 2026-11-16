'use strict';
const { canonical } = require('../../core/output-access.js');
function localSource(path) {
  const value = String(path || '').replace(/\\/g, '/');
  if (!/^(?:[A-Za-z]:\/|\/\/[^/]+\/[^/]+\/)/.test(value)) return null;
  const split = value.lastIndexOf('/'), name = value.slice(split + 1);
  return name ? { folder: value.slice(0, split), base: name.replace(/\.[^.]+$/, '') || 'Untitled' } : null;
}
function nextPSDName(base, occupied) {
  for (let n = 1; n <= 10000; n++) {
    const suffix = (n === 1 ? '' : ' (' + n + ')') + '.psd';
    let prefix = '';
    for (const char of base) { if (prefix.length + char.length + suffix.length > 240) break; prefix += char; }
    const name = (prefix.replace(/[. ]+$/g, '') || 'Untitled') + suffix;
    if (!occupied.has(name.toLowerCase())) return name;
  }
  throw new Error('Too many PSD files with this name. Choose another name with Save As.');
}
function createPSDService(host, fs, resolveFolder) {
  return { async run(job) {
    const { app } = host, source = app.activeDocument;
    job.record.host = host.version;
    if (!source) throw new Error('Open a document first.');
    const sourceID = source.id, originalPath = source.path || '', local = localSource(originalPath);
    job.record.source = { id: sourceID, width: source.width, height: source.height, depth: source.bitsPerChannel, mode: source.mode, savedLocally: !!local };
    if (source.quickMaskMode) throw new Error('Exit Quick Mask mode first.');
    const existingProject = local && /\.(psd|psb)$/i.test(originalPath);
    if (!existingProject && (source.width > 30000 || source.height > 30000)) throw new Error('This canvas exceeds the PSD size limit. Save it as PSB with Photoshop Save As.');
    let folder = null, chosen = null;
    if (!existingProject) {
      if (local) folder = await resolveFolder(local, job.progress);
      else {
        job.progress('Choose where to save the PSD…');
        chosen = await fs.getFileForSaving('Untitled.psd', { types: ['psd'] });
        if (!chosen) { const error = new Error('PSD save cancelled.'); error.cancelled = true; throw error; }
        if (!chosen.isFile || !/\.psd$/i.test(chosen.name)) throw new Error('Choose a file with the .psd extension.');
        if (app.documents.some(doc => doc.id !== sourceID && canonical(doc.path) === canonical(chosen.nativePath))) throw new Error('Close the destination PSD in Photoshop before replacing it.');
      }
    }
    job.progress('Waiting for Photoshop…');
    await host.modal('Photoshop Tool: Quick PSD', async ctx => {
      host.cancel(ctx);
      if (!app.activeDocument || app.activeDocument.id !== sourceID || !host.byID(sourceID) || (source.path || '') !== originalPath) throw new Error('The document or its save location changed. Run Quick PSD again.');
      if (chosen && app.documents.some(doc => doc.id !== sourceID && canonical(doc.path) === canonical(chosen.nativePath))) throw new Error('Close the destination PSD in Photoshop before replacing it.');
      let file = chosen, owned = false;
      try {
        if (existingProject) {
          job.record.targetFilename = source.name;
          job.progress('Saving the current project…');
          await source.save();
          job.record.psdSaved = true; job.record.filename = source.name;
          job.record.message = /\.psb$/i.test(originalPath) ? 'PSB saved' : 'PSD saved';
          return;
        }
        if (folder) {
          const occupied = new Set((await folder.getEntries()).map(entry => entry.name.toLowerCase()));
          for (const doc of app.documents) { const path = localSource(doc.path); if (path && canonical(path.folder) === canonical(local.folder)) occupied.add(String(doc.path).replace(/\\/g, '/').split('/').pop().toLowerCase()); }
          host.cancel(ctx);
          const name = nextPSDName(local.base, occupied);
          file = await folder.createFile(name, { overwrite: false }); owned = true;
        }
        host.cancel(ctx); job.progress('Saving layers and color profile…');
        job.record.targetFilename = file.name;
        // asCopy=false intentionally makes the new PSD the working document.
        // The original PNG/JPEG/TIFF is never saved or replaced.
        await source.saveAs.psd(file, { layers: true, alphaChannels: true, annotations: true, embedColorProfile: true, maximizeCompatibility: true, spotColor: true }, false);
        job.record.psdSaved = true; job.record.filename = file.name; job.record.psdCreated = true;
        job.record.message = 'PSD saved · continue editing in the PSD';
        job.record.psdVerification = 'native-save-completed';
      } catch (error) {
        if (owned && file && !job.record.psdSaved) {
          // A rejected native save can still leave the document bound to the
          // file. Retain uncertain output rather than delete its backing file.
          if (canonical(source.path) === canonical(file.nativePath)) job.warn('The document now points to ' + file.name + '. Check the saved PSD before retrying.');
          else try { await file.delete(); } catch (cleanup) { job.warn('An incomplete PSD may remain: ' + file.name, cleanup); }
        }
        if (error && typeof error === 'object' && (ctx.isCancelled || error.number === -128 || error.code === -128)) error.cancelled = true;
        throw error;
      }
    });
  } };
}
module.exports = { createPSDService, localSource, nextPSDName };
