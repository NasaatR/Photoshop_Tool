'use strict';
const { withHistory } = require('../../core/host.js');
const { findEntry, commitOutput } = require('../../core/safe-output.js');
const { location, selectionName, dimensions, verifyDimensions } = require('./logic.js');
const { canonical } = require('../../core/output-access.js');
function createPNGService(host, resolveFolder) {
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
    let scratch, reopened, stage, committed = false;
    const stagingName = '.photoshoptool-export-' + Date.now() + '-' + Math.random().toString(16).slice(2) + '.png';
    record.targetFilename = name;
    try {
      host.cancel(ctx); progress('Preparing full-resolution image…');
      scratch = await source.duplicate('Photoshop Tool export', true);
      await host.own(ctx, scratch); await prepareCopy(scratch, options);
      const expected = dimensions(scratch); host.cancel(ctx);
      stage = await folder.createFile(stagingName, { overwrite: false });
      progress('Saving lossless PNG…');
      await scratch.saveAs.png(stage, { method: C.PNGMethod.QUICK, compression: options.compression, interlaced: false }, true);
      await host.close(ctx, scratch); scratch = null; host.cancel(ctx);
      progress('Verifying saved PNG…');
      reopened = await app.open(stage); await host.own(ctx, reopened);
      verifyDimensions(expected, dimensions(reopened));
      let copyError, copyFailed = false;
      if (copy) {
        progress('Copying image…');
        try { await copyPixels(ctx, reopened, record); } catch (e) { copyError = e; copyFailed = true; }
      }
      await host.close(ctx, reopened); reopened = null; host.cancel(ctx);
      progress('Finishing PNG…');
      await commitOutput(folder, stage, name, options.overwrite, () => host.cancel(ctx), warn);
      committed = true; record.pngSaved = true; record.filename = name; Object.assign(record, expected);
      if (copyFailed) throw copyError;
    } finally {
      for (const doc of [reopened, scratch]) await close(ctx, doc, warn);
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
  function validateSelection(doc) {
    if (doc.activeLayers.length !== 1 || doc.activeLayers[0].kind !== C.LayerKind.NORMAL) throw new Error('Select exactly one raster (pixel) layer.');
    if (!doc.selection.bounds) throw new Error('Make a pixel selection first.');
    if (doc.activeChannels.length !== doc.componentChannels.length || doc.activeChannels.some(c => c.kind !== C.ChannelType.COMPONENT)) throw new Error('Select the RGB/Grayscale composite channel, not a mask or one channel.');
    const b = doc.selection.bounds;
    return { layer: doc.activeLayers[0].id, bounds: [b.left, b.top, b.right, b.bottom].join(',') };
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
    const selection = mode === 'selection' ? validateSelection(source) : null;
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
          const current = validateSelection(source);
          if (current.layer !== selection.layer || current.bounds !== selection.bounds) throw new Error('Layer or selection changed while preparing the export. Run the tool again.');
          let content, targetName;
          await withHistory(ctx, sourceID, 'Photoshop Tool: Selection to Smart Object', async () => {
            job.progress('Creating Smart Object from selection…');
            host.cancel(ctx); await host.batch({ _obj: 'copyToLayer' });
            const copied = source.activeLayers[0];
            if (!copied || copied.id === selection.layer) throw new Error('Layer via Copy did not create a layer.');
            await host.batch({ _obj: 'newPlacedLayer' });
            const smart = source.activeLayers[0];
            if (!smart || smart.kind !== C.LayerKind.SMARTOBJECT) throw new Error('Photoshop did not create a Smart Object.');
            targetName = selectionName(root.base, smart.name, smart.id);
            const before = new Set(app.documents.map(d => d.id));
            await host.batch({ _obj: 'placedLayerEditContents', documentID: sourceID, layerID: smart.id });
            content = app.activeDocument;
            if (!content || content.id === sourceID || before.has(content.id)) throw new Error('No new Smart Object contents document was opened.');
            await host.own(ctx, content); host.validate(content, true);
            job.record.smartLayerID = smart.id;
          }, job.warn);
          await ctx.hostControl.unregisterAutoCloseDocument(content.id);
          finishOn = content.id; job.record.smartObjectCreated = true;
          const mapped = { folder: root.folder, base: targetName.replace(/\.png$/i, '') };
          roots.set(content.id, mapped);
          await exportImage(ctx, content, mapped, targetName, folder, true, job);
        } else await exportImage(ctx, source, root, root.base + '.png', folder, copy, job);
      } finally {
        if (!ctx.isCancelled && host.byID(finishOn)) try { await host.select(finishOn); } catch (e) { job.warn('Could not restore document focus: ' + e.message, e); }
      }
    });
  } };
}
module.exports = { createPNGService };
