'use strict';
const { withHistory } = require('../../core/host.js');
const { step } = require('../../core/layers.js');
const { readSelectionDraft } = require('../../core/preferences.js');
function validate(doc) {
  if (!doc) throw new Error('Open a document first.');
  if (doc.quickMaskMode) throw new Error('Exit Quick Mask mode first.');
  if (!doc.selection.bounds) throw new Error('Make a pixel selection first.');
}
function createSelectionService(host) {
  return { async expand(job) {
    const { app } = host, source = app.activeDocument;
    job.record.host = host.version;
    const { expandPx } = readSelectionDraft(job.options);
    validate(source); const sourceID = source.id;
    job.progress('Waiting for Photoshop…');
    await host.modal('Photoshop Tool: Expand Selection', async ctx => {
      try {
        host.cancel(ctx);
        if (!app.activeDocument || app.activeDocument.id !== sourceID || !host.byID(sourceID)) throw new Error('The active document changed. Run Expand Selection again.');
        validate(source);
        const bounds = source.selection.bounds;
        job.record.source = { id: sourceID, selection: true, bounds: { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom } };
        await withHistory(ctx, sourceID, 'Photoshop Tool: Expand Selection', async () => {
          await step(job, 'expand-selection', 'Expanding the selection by ' + expandPx + ' px…', async () => {
            host.cancel(ctx);
            // Native Select > Modify > Expand, including its default behavior
            // at the canvas boundary. No layer/channel/pixel editing is needed.
            await source.selection.expand(expandPx, false); host.cancel(ctx);
          });
        }, job.warn);
        job.record.selectionExpanded = true; job.record.expandPx = expandPx;
        job.record.message = 'Selection expanded by ' + expandPx + ' px';
      } catch (error) {
        if (error && typeof error === 'object' && (ctx.isCancelled || error.number === -128)) error.cancelled = true;
        throw error;
      }
    });
  } };
}
module.exports = { createSelectionService };
