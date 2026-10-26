'use strict';
function assertResults(results) {
  if (!Array.isArray(results)) throw new Error('Photoshop returned no action result.');
  for (const result of results) if (result && (result._obj === 'error' || typeof result.result === 'number' && result.result < 0)) {
    const e = new Error(result.message || 'Photoshop action failed.'); e.number = result.result; throw e;
  }
  return results;
}
async function withHistory(ctx, documentID, name, work, warn) {
  const id = await ctx.hostControl.suspendHistory({ documentID, name });
  let value, error, failed = false;
  try { value = await work(); } catch (e) { failed = true; error = e; }
  try { await ctx.hostControl.resumeHistory(id, !failed); }
  catch (e) { if (!failed) throw e; try { warn('History cleanup failed: ' + String(e.message || e)); } catch (_) {} }
  if (failed) throw error; return value;
}
function createHost(ps) {
  const { app, core, constants: C, action } = ps;
  const byID = id => app.documents.find(d => d.id === id);
  const cancel = ctx => { if (ctx.isCancelled) throw new Error('Cancelled.'); };
  const batch = async descriptor => assertResults(await action.batchPlay([{ ...descriptor, _options: { dialogOptions: 'dontDisplay' } }], {}));
  return { app, C, byID, cancel, batch,
    async modal(name, work) { return core.executeAsModal(work, { commandName: name, timeOut: 2 }); },
    async select(id) { if (!byID(id)) throw new Error('The operation document was closed.'); if (app.activeDocument && app.activeDocument.id === id) return; await batch({ _obj: 'select', _target: [{ _ref: 'document', _id: id }] }); },
    async own(ctx, doc) { await ctx.hostControl.registerAutoCloseDocument(doc.id); return doc; },
    async close(ctx, doc) { if (!doc || !byID(doc.id) || ctx.isCancelled) return; const id = doc.id; await doc.close(C.SaveOptions.DONOTSAVECHANGES); await ctx.hostControl.unregisterAutoCloseDocument(id); },
    validate(doc, copy) {
      if (!doc) throw new Error('Open a document first.');
      if (doc.quickMaskMode) throw new Error('Exit Quick Mask mode first.');
      if (![C.DocumentMode.RGB, C.DocumentMode.GRAYSCALE].includes(doc.mode)) throw new Error('Use RGB or Grayscale. Original color mode is not converted automatically.');
      if (![C.BitsPerChannelType.EIGHT, C.BitsPerChannelType.SIXTEEN].includes(doc.bitsPerChannel)) throw new Error('Use 8 or 16 bits per channel. 32-bit HDR is not converted automatically.');
      if (copy && app.preferences.general.exportClipboard !== true) throw new Error('Enable external paste in the panel, then try again.');
    }
  };
}
module.exports = { createHost, assertResults, withHistory };
