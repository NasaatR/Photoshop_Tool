'use strict';
const { withHistory } = require('../../core/host.js');
const { selectionName } = require('./logic.js');
const { layersByID, requireLayer, step, selectLayer, removeOwnedLayer, onlyNewPixel, stampVisible, savedChannel } = require('../../core/layers.js');
function selectionPlan(doc, C) {
  if (doc.activeChannels.length !== doc.componentChannels.length || doc.activeChannels.some(c => c.kind !== C.ChannelType.COMPONENT)) throw new Error('Select the RGB/Grayscale composite channel, not a mask or one channel.');
  const bounds = doc.selection.bounds;
  const layers = doc.activeLayers.map(layer => ({ id: layer.id, kind: layer.kind }));
  return { layers, bounds: bounds ? [bounds.left, bounds.top, bounds.right, bounds.bottom] : null,
    composite: !bounds || layers.length !== 1 || layers[0].kind !== C.LayerKind.NORMAL };
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
