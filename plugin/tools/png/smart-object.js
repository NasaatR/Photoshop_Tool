'use strict';
const { withHistory } = require('../../core/host.js');
const { selectionName } = require('./logic.js');
function layersByID(doc, C) {
  const result = new Map();
  function visit(layers) { for (const layer of layers) { result.set(layer.id, layer); if (layer.kind === C.LayerKind.GROUP) visit(layer.layers); } }
  visit(doc.layers); return result;
}
function requireLayer(host, doc, id) {
  const layer = layersByID(doc, host.C).get(id);
  if (!layer) throw new Error('Expected layer ' + id + ' is no longer present.');
  return layer;
}
function selectionPlan(doc, C) {
  if (doc.activeChannels.length !== doc.componentChannels.length || doc.activeChannels.some(c => c.kind !== C.ChannelType.COMPONENT)) throw new Error('Select the RGB/Grayscale composite channel, not a mask or one channel.');
  const bounds = doc.selection.bounds;
  const layers = doc.activeLayers.map(layer => ({ id: layer.id, kind: layer.kind }));
  return { layers, bounds: bounds ? [bounds.left, bounds.top, bounds.right, bounds.bottom] : null,
    composite: !bounds || layers.length !== 1 || layers[0].kind !== C.LayerKind.NORMAL };
}
async function step(job, id, message, work) {
  job.record.smartStep = id; job.progress(message);
  try { return await work(); }
  catch (cause) {
    const error = new Error(message + '\n' + String(cause && cause.message != null ? cause.message : cause));
    error.cause = cause; error.step = id;
    if (cause && cause.number != null) error.number = cause.number;
    if (cause && cause.code != null) error.code = cause.code;
    throw error;
  }
}
async function selectLayer(host, doc, id) {
  requireLayer(host, doc, id);
  if (doc.activeLayers.length !== 1 || doc.activeLayers[0].id !== id) await host.batch({ _obj: 'select', _target: [{ _ref: 'layer', _id: id }], makeVisible: false });
}
async function removeOwnedLayer(host, doc, id, originals) {
  if (originals.has(id)) throw new Error('Refusing to remove an original layer.');
  // A native merge may already have consumed the helper. Never reuse its old wrapper.
  const current = layersByID(doc, host.C).get(id);
  if (current) await current.delete();
}
function onlyNewPixel(host, doc, before, message) {
  const added = [...layersByID(doc, host.C)].filter(([id]) => !before.has(id));
  if (added.length !== 1 || added[0][1].kind !== host.C.LayerKind.NORMAL) throw new Error(message);
  return added[0][0];
}
async function stampVisible(host, ctx, doc, job, originals) {
  host.cancel(ctx);
  const helperID = await step(job, 'create-helper', 'Creating temporary pixel layer…', async () => {
    // Native make avoids relying on a DOM createLayer return handle with no active layer.
    await host.batch({ _obj: 'make', _target: [{ _ref: 'layer' }], using: { _obj: 'layer', name: 'Photoshop Tool: Composite' } });
    host.cancel(ctx);
    return onlyNewPixel(host, doc, originals, 'Could not identify one new temporary pixel layer.');
  });
  job.record.smartLayerIDs = { helper: helperID };
  await step(job, 'position-helper', 'Positioning the composite layer…', async () => {
    const top = doc.layers.find(layer => layer.id !== helperID), topID = top ? top.id : null;
    if (topID != null && doc.layers[0].id !== helperID) await requireLayer(host, doc, helperID).move(requireLayer(host, doc, topID), host.C.ElementPlacement.PLACEBEFORE);
    host.cancel(ctx); await selectLayer(host, doc, helperID);
  });
  const stampedID = await step(job, 'stamp-visible', 'Stamping visible layers…', async () => {
    host.cancel(ctx); await host.batch({ _obj: 'mergeVisible', duplicate: true }); host.cancel(ctx);
    const current = layersByID(doc, host.C);
    if ([...originals].some(id => !current.has(id))) throw new Error('Stamp Visible changed existing layers. The operation will be rolled back.');
    const added = [...current].filter(([id]) => !originals.has(id) && id !== helperID);
    const id = added.length ? (added.length === 1 ? added[0][0] : null) : helperID;
    const stamped = current.get(id);
    if (!stamped || stamped.kind !== host.C.LayerKind.NORMAL) throw new Error('Stamp Visible did not create one identifiable pixel layer.');
    const bounds = stamped.boundsNoEffects;
    if (!bounds || bounds.right <= bounds.left || bounds.bottom <= bounds.top) throw new Error('The visible composition has no pixels to extract.');
    job.record.smartLayerIDs.stamp = id;
    job.record.smartHelperConsumed = !current.has(helperID);
    return id;
  });
  await step(job, 'remove-helper', 'Removing the temporary helper…', async () => {
    host.cancel(ctx);
    if (stampedID !== helperID) await removeOwnedLayer(host, doc, helperID, originals);
    host.cancel(ctx); await selectLayer(host, doc, stampedID);
  });
  return stampedID;
}
function savedChannel(host, doc, name) {
  const channel = doc.channels.find(item => item.name === name);
  if (!channel || channel.kind === host.C.ChannelType.COMPONENT) throw new Error('The owned selection channel is unavailable.');
  return channel;
}
async function createSelectionSmartObject(host, ctx, source, plan, root, job) {
  const { app, C } = host;
  let content, targetName, smartID;
  await withHistory(ctx, source.id, 'Photoshop Tool: Selection to Smart Object', async () => {
    let stampedID = null, channelName = null;
    const originals = new Set(layersByID(source, C).keys());
    if (plan.composite) {
      if (plan.bounds) await step(job, 'save-selection', 'Preserving the pixel selection…', async () => {
        const name = 'PT selection ' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
        if (source.channels.some(channel => channel.name === name)) throw new Error('Temporary selection name already exists.');
        await source.selection.save(name); host.cancel(ctx); savedChannel(host, source, name); channelName = name;
      });
      await step(job, 'prepare-composite', 'Preparing the visible composition…', async () => {
        host.cancel(ctx); await source.selection.deselect(); host.cancel(ctx); source.activeChannels = source.componentChannels;
      });
      stampedID = await stampVisible(host, ctx, source, job, originals);
      await step(job, 'load-selection', 'Applying the extraction region…', async () => {
        host.cancel(ctx);
        if (channelName) await source.selection.load(savedChannel(host, source, channelName));
        else await source.selection.selectRectangle({ left: 0, top: 0, right: source.width, bottom: source.height }, C.SelectionType.REPLACE);
      });
    }
    const copiedID = await step(job, 'copy-region', plan.bounds ? 'Copying the selected region…' : 'Copying the full canvas…', async () => {
      host.cancel(ctx); const before = new Set(layersByID(source, C).keys());
      await host.batch({ _obj: 'copyToLayer' }); host.cancel(ctx);
      return onlyNewPixel(host, source, before, 'Layer via Copy did not create one new pixel layer.');
    });
    job.record.smartLayerIDs = { ...job.record.smartLayerIDs, region: copiedID };
    await step(job, 'remove-stamp', 'Removing the temporary composite…', async () => {
      host.cancel(ctx);
      if (stampedID != null) await removeOwnedLayer(host, source, stampedID, originals);
      host.cancel(ctx); await selectLayer(host, source, copiedID);
    });
    let smartName;
    await step(job, 'convert-smart', 'Converting the region to a Smart Object…', async () => {
      host.cancel(ctx); await host.batch({ _obj: 'newPlacedLayer' }); host.cancel(ctx);
      const owned = [...layersByID(source, C)].filter(([id]) => !originals.has(id));
      if (owned.length !== 1 || owned[0][1].kind !== C.LayerKind.SMARTOBJECT) throw new Error('Photoshop did not create one new Smart Object.');
      smartID = owned[0][0]; smartName = plan.composite ? (plan.bounds ? 'Composite selection' : 'Composite') : owned[0][1].name;
      job.record.smartLayerIDs.smart = smartID;
      if (plan.composite) requireLayer(host, source, smartID).name = smartName;
    });
    await step(job, 'restore-selection', 'Restoring the original selection…', async () => {
      host.cancel(ctx);
      if (channelName) { await source.selection.load(savedChannel(host, source, channelName)); host.cancel(ctx); await savedChannel(host, source, channelName).remove(); }
      else if (!plan.bounds) await source.selection.deselect();
    });
    targetName = selectionName(root.base, smartName, smartID);
    await step(job, 'open-contents', 'Opening Smart Object contents…', async () => {
      host.cancel(ctx); requireLayer(host, source, smartID);
      const before = new Set(app.documents.map(doc => doc.id));
      await host.batch({ _obj: 'placedLayerEditContents', documentID: source.id, layerID: smartID });
      content = app.activeDocument;
      if (!content || content.id === source.id || before.has(content.id)) throw new Error('No new Smart Object contents document was opened.');
      await host.own(ctx, content); host.validate(content, true); host.cancel(ctx);
    });
  }, job.warn);
  job.record.smartLayerID = smartID;
  job.record.smartInput = plan.composite ? 'visible-composite' : 'selected-pixel-layer';
  job.record.smartScope = plan.bounds ? 'pixel-selection' : 'full-canvas';
  return { content, targetName };
}
module.exports = { selectionPlan, createSelectionSmartObject };
