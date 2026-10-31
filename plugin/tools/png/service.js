'use strict';
const { findEntry, commitOutput } = require('../../core/safe-output.js');
const { location, dimensions } = require('./logic.js');
const { selectionPlan, createSelectionSmartObject } = require('./smart-object.js');
const { verifyPNG } = require('./verify-file.js');
const { canonical } = require('../../core/output-access.js');
function createPNGService(host, resolveFolder, readBinary) {
  const roots = new Map();
  const { app, C } = host;
  async function close(ctx, doc, warn) { try { await host.close(ctx, doc); } catch (e) { warn('Temporary document cleanup failed: ' + e.message, e); } }
  async function prepareCopy(doc, options) {
    doc.activeChannels = doc.componentChannels;
    await doc.selection.deselect();
    if (options.srgb) {
      if (doc.mode !== C.DocumentMode.RGB) await doc.changeMode(C.ChangeMode.RGB);
      await doc.convertProfile('sRGB IEC61966-2.1', C.Intent.RELATIVECOLORIMETRIC, true, true);
    }
  }
  async function copyPixels(ctx, doc, record) {
    host.cancel(ctx);
    await doc.selection.selectAll();
    if (!doc.layers.length) throw new Error('No copyable image content.');
    await doc.layers[0].copy(true); record.imageCopied = true;
  }
  async function exportImage(ctx, source, root, name, folder, copy, job) {
    const { options, record, progress, warn } = job;
    const target = canonical(root.folder + '/' + name);
    if (app.documents.some(d => canonical(d.path || '') === target)) throw new Error('Close the existing output PNG in Photoshop before replacing it.');
    const existing = await findEntry(folder, name);
    if (existing && !existing.isFile) throw new Error('The output name is occupied by a folder.');
    if (existing && !options.overwrite) throw new Error('PNG already exists. Enable Replace existing PNG to update it.');
    let scratch, stage, committed = false;
    const stagingName = '.photoshoptool-export-' + Date.now() + '-' + Math.random().toString(16).slice(2) + '.png';
    record.targetFilename = name;
    try {
      host.cancel(ctx); progress('Preparing full-resolution image…');
      scratch = await source.duplicate('Photoshop Tool export', true);
      await host.own(ctx, scratch); await prepareCopy(scratch, options);
      const expected = dimensions(scratch);
      const bitDepth = expected.depth === C.BitsPerChannelType.SIXTEEN ? 16 : 8;
      const mode = scratch.mode === C.DocumentMode.RGB ? 'RGB' : 'Grayscale';
      host.cancel(ctx);
      stage = await folder.createFile(stagingName, { overwrite: false });
      progress('Saving lossless PNG…');
      await scratch.saveAs.png(stage, { method: C.PNGMethod.QUICK, compression: options.compression, interlaced: false }, true);
      host.cancel(ctx);
      progress('Verifying saved PNG…');
      record.verification = verifyPNG(await readBinary(stage), { width: expected.width, height: expected.height, bitDepth, mode }, () => host.cancel(ctx));
      host.cancel(ctx);
      let copyError, copyFailed = false;
      if (copy) {
        progress('Copying image…');
        try { await copyPixels(ctx, scratch, record); } catch (e) { copyError = e; copyFailed = true; }
      }
      await host.close(ctx, scratch); scratch = null; host.cancel(ctx);
      progress('Finishing PNG…');
      await commitOutput(folder, stage, name, options.overwrite, () => host.cancel(ctx), warn);
      committed = true; record.pngSaved = true; record.filename = name; Object.assign(record, expected);
      if (copyFailed) throw copyError;
    } finally {
      await close(ctx, scratch, warn);
      // A successful or uncertain move must never cause deletion of a final PNG.
      if (stage && !committed && stage.name === stagingName) try { await stage.delete(); } catch (e) { warn('A temporary PNG may remain beside the PSD.', e); }
    }
  }
  async function copyOnly(ctx, source, job) {
    let scratch;
    try {
      host.cancel(ctx); job.progress('Preparing image for the clipboard…');
      scratch = await source.duplicate('Photoshop Tool copy', true); await host.own(ctx, scratch);
      await prepareCopy(scratch, job.options); await copyPixels(ctx, scratch, job.record);
      Object.assign(job.record, dimensions(scratch));
    } finally { await close(ctx, scratch, job.warn); }
  }
  return { async run(mode, job) {
    if (!['document', 'selection', 'save', 'copy'].includes(mode)) throw new Error('Unknown PNG operation: ' + mode);
    const copy = mode !== 'save';
    const source = app.activeDocument;
    job.record.host = app.version; job.record.mode = mode;
    if (source) job.record.source = { id: source.id, ...dimensions(source), mode: source.mode, savedLocally: !!source.path,
      activeLayerIDs: source.activeLayers.map(layer => layer.id), selection: !!source.selection.bounds };
    host.validate(source, copy);
    const sourceID = source.id;
    const selection = mode === 'selection' ? selectionPlan(source, C) : null;
    const root = mode === 'copy' ? null : roots.get(sourceID) || location(source.path);
    const folder = root ? await resolveFolder(root, job.progress) : null;
    job.progress('Waiting for Photoshop…');
    await host.modal('Photoshop Tool: ' + (selection ? 'Selection to Smart Object' : mode === 'copy' ? 'Copy Image' : 'Export PNG'), async ctx => {
      if (!app.activeDocument || app.activeDocument.id !== sourceID) throw new Error('The active document changed. Run the tool again on the intended document.');
      host.validate(source, copy);
      let finishOn = sourceID;
      try {
        if (mode === 'copy') return await copyOnly(ctx, source, job);
        if (selection) {
          const current = selectionPlan(source, C);
          if (JSON.stringify(current) !== JSON.stringify(selection)) throw new Error('Layer or selection changed while preparing the export. Run the tool again.');
          const { content, targetName } = await createSelectionSmartObject(host, ctx, source, selection, root, job);
          finishOn = content.id; job.record.smartObjectCreated = true;
          const mapped = { folder: root.folder, base: targetName.replace(/\.png$/i, '') };
          roots.set(content.id, mapped);
          await ctx.hostControl.unregisterAutoCloseDocument(content.id);
          await exportImage(ctx, content, mapped, targetName, folder, true, job);
        } else await exportImage(ctx, source, root, root.base + '.png', folder, copy, job);
      } finally {
        if (!ctx.isCancelled && host.byID(finishOn)) try { await host.select(finishOn); } catch (e) { job.warn('Could not restore document focus: ' + e.message, e); }
      }
    });
  } };
}
module.exports = { createPNGService };
