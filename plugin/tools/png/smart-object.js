'use strict';
const { withHistory } = require('../../core/host.js');
const { selectionName } = require('./logic.js');
function layerIDs(layers, C, result = new Set()) {
  for (const layer of layers) { result.add(layer.id); if (layer.kind === C.LayerKind.GROUP) layerIDs(layer.layers, C, result); }
  return result;
}
function selectionPlan(doc, C) {
  if (doc.activeChannels.length !== doc.componentChannels.length || doc.activeChannels.some(c => c.kind !== C.ChannelType.COMPONENT)) throw new Error('Select the RGB/Grayscale composite channel, not a mask or one channel.');
  const bounds = doc.selection.bounds;
  const layers = doc.activeLayers.map(layer => ({ id: layer.id, kind: layer.kind }));
  return { layers, bounds: bounds ? [bounds.left, bounds.top, bounds.right, bounds.bottom] : null,
    composite: !bounds || layers.length !== 1 || layers[0].kind !== C.LayerKind.NORMAL };
}
async function selectLayer(host, doc, layer) {
  if (doc.activeLayers.length !== 1 || doc.activeLayers[0].id !== layer.id) await host.batch({ _obj: 'select', _target: [{ _ref: 'layer', _id: layer.id }], makeVisible: false });
}
async function stampVisible(host, ctx, doc) {
  host.cancel(ctx);
  const originals = layerIDs(doc.layers, host.C);
  // An owned empty pixel layer makes Stamp Visible available even with no active layer.
  const helper = await doc.createLayer(host.C.LayerKind.NORMAL, { name: 'Photoshop Tool: Composite' });
  host.cancel(ctx);
  if (!helper || originals.has(helper.id)) throw new Error('Could not create a safe composite layer.');
  const top = doc.layers.find(layer => layer.id !== helper.id);
  if (top && doc.layers[0].id !== helper.id) await helper.move(top, host.C.ElementPlacement.PLACEBEFORE);
  await selectLayer(host, doc, helper); host.cancel(ctx);
  // Native Shift+Ctrl+Alt+E: duplicate=true preserves every original layer.
  await host.batch({ _obj: 'mergeVisible', duplicate: true });
  host.cancel(ctx);
  const retained = layerIDs(doc.layers, host.C);
  if ([...originals].some(id => !retained.has(id))) throw new Error('Stamp Visible changed existing layers. The operation will be rolled back.');
  const stamped = doc.activeLayers[0];
  if (!stamped || stamped.kind !== host.C.LayerKind.NORMAL || originals.has(stamped.id)) throw new Error('Stamp Visible did not create a new pixel layer.');
  const bounds = stamped.boundsNoEffects;
  if (!bounds || bounds.right <= bounds.left || bounds.bottom <= bounds.top) throw new Error('The visible composition has no pixels to extract.');
  if (stamped.id !== helper.id) await helper.delete();
  await selectLayer(host, doc, stamped);
  return stamped;
}
async function createSelectionSmartObject(host, ctx, source, plan, root, job) {
  const { app, C } = host;
  let content, targetName, smartID;
  await withHistory(ctx, source.id, 'Photoshop Tool: Selection to Smart Object', async () => {
    let stamped, savedSelection;
    const originalLayers = layerIDs(source.layers, C);
    if (plan.composite) {
      job.progress('Creating a merged copy of visible layers…');
      if (plan.bounds) {
        const channelName = 'PT selection ' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
        const before = new Set(source.channels.map(channel => channel.name));
        await source.selection.save(channelName);
        host.cancel(ctx);
        savedSelection = source.channels.find(channel => channel.name === channelName && !before.has(channel.name));
        if (!savedSelection) throw new Error('Could not preserve the original pixel selection.');
      }
      // Stamp the full composition, then apply the exact selection once (including feathering).
      await source.selection.deselect();
      host.cancel(ctx);
      source.activeChannels = source.componentChannels;
      stamped = await stampVisible(host, ctx, source);
      host.cancel(ctx);
      if (savedSelection) await source.selection.load(savedSelection);
      else await source.selection.selectRectangle({ left: 0, top: 0, right: source.width, bottom: source.height }, C.SelectionType.REPLACE);
    }
    job.progress(plan.bounds ? 'Creating Smart Object from selection…' : 'Creating Smart Object from the canvas…');
    host.cancel(ctx);
    const beforeCopy = layerIDs(source.layers, C);
    await host.batch({ _obj: 'copyToLayer' });
    host.cancel(ctx);
    const copied = source.activeLayers[0];
    if (!copied || copied.kind !== C.LayerKind.NORMAL || beforeCopy.has(copied.id)) throw new Error('Layer via Copy did not create a new pixel layer.');
    // Only the final Smart Object is kept; the owned full-canvas stamp is disposable.
    if (stamped) await stamped.delete();
    host.cancel(ctx);
    await selectLayer(host, source, copied); host.cancel(ctx);
    await host.batch({ _obj: 'newPlacedLayer' });
    host.cancel(ctx);
    const smart = source.activeLayers[0];
    if (!smart || smart.kind !== C.LayerKind.SMARTOBJECT || originalLayers.has(smart.id)) throw new Error('Photoshop did not create a new Smart Object.');
    smartID = smart.id;
    if (plan.composite) smart.name = plan.bounds ? 'Composite selection' : 'Composite';
    if (savedSelection) { await source.selection.load(savedSelection); await savedSelection.remove(); }
    else if (!plan.bounds) await source.selection.deselect();
    targetName = selectionName(root.base, smart.name, smart.id);
    const beforeDocuments = new Set(app.documents.map(doc => doc.id));
    host.cancel(ctx);
    await host.batch({ _obj: 'placedLayerEditContents', documentID: source.id, layerID: smart.id });
    content = app.activeDocument;
    if (!content || content.id === source.id || beforeDocuments.has(content.id)) throw new Error('No new Smart Object contents document was opened.');
    await host.own(ctx, content); host.validate(content, true); host.cancel(ctx);
  }, job.warn);
  job.record.smartLayerID = smartID;
  job.record.smartInput = plan.composite ? 'visible-composite' : 'selected-pixel-layer';
  job.record.smartScope = plan.bounds ? 'pixel-selection' : 'full-canvas';
  return { content, targetName };
}
module.exports = { selectionPlan, createSelectionSmartObject };
