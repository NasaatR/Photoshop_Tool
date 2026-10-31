'use strict';
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
function directlyAbove(host, doc, id, targetID) {
  const current = layersByID(doc, host.C), layer = current.get(id), target = current.get(targetID);
  if (!layer || !target) throw new Error('The layer to position or its target is no longer present.');
  const parent = layer.parent, targetParent = target.parent;
  if ((parent ? parent.id : null) !== (targetParent ? targetParent.id : null)) return false;
  const siblings = targetParent ? targetParent.layers : doc.layers;
  let previous = null;
  for (const sibling of siblings) { if (sibling.id === targetID) return previous === id; previous = sibling.id; }
  return false;
}
async function step(job, id, message, work) {
  job.record.operationStep = id; job.record.smartStep = id; job.progress(message);
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
module.exports = { layersByID, requireLayer, directlyAbove, step, selectLayer, removeOwnedLayer, onlyNewPixel, stampVisible, savedChannel };
