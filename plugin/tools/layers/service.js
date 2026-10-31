'use strict';
const { withHistory } = require('../../core/host.js');
const { layersByID, requireLayer, directlyAbove, selectLayer, stampVisible, savedChannel, step } = require('../../core/layers.js');
function validate(doc) {
  if (!doc) throw new Error('Open a document first.');
  if (doc.quickMaskMode) throw new Error('Exit Quick Mask mode first.');
}
async function selectedLayerIDs(host, doc) {
  const result = await host.batch({ _obj: 'get', _target: [{ _property: 'targetLayersIDs' }, { _ref: 'document', _id: doc.id }] });
  const refs = result[0].targetLayersIDs;
  if (!Array.isArray(refs)) throw new Error('Photoshop did not return the selected layer IDs.');
  const ids = refs.map(ref => ref && ref._id);
  const current = layersByID(doc, host.C);
  if (ids.some(id => !Number.isInteger(id) || !current.has(id)) || new Set(ids).size !== ids.length) throw new Error('Photoshop returned an invalid target layer.');
  return ids;
}
function oneLayer(ids) {
  if (ids.length !== 1) throw new Error('Select exactly one target layer first.');
  return ids[0];
}
function selectComposite(doc) {
  // A layer mask is not a regular DOM Channel. Do not read its kind/name.
  doc.activeChannels = doc.componentChannels;
}
async function prepareTargets(host, ctx, doc, selected) {
  // Force the owner layer target even when its mask thumbnail was last active.
  if (selected.length === 1) await host.batch({ _obj: 'select', _target: [{ _ref: 'layer', _id: selected[0] }], makeVisible: false });
  else if (selected.length > 1) doc.activeLayers = selected.map(id => requireLayer(host, doc, id));
  host.cancel(ctx); selectComposite(doc); host.cancel(ctx);
}
function newLayerID(host, doc, before) {
  const current = layersByID(doc, host.C);
  if ([...before].some(id => !current.has(id))) throw new Error('Creating the layer changed an existing layer.');
  const ids = [...current.keys()].filter(id => !before.has(id));
  if (ids.length !== 1) throw new Error('Photoshop did not create one identifiable layer.');
  return ids[0];
}
function fillAnchorID(host, doc, selected) {
  const target = selected.length ? requireLayer(host, doc, selected[0]) : doc.layers[0];
  if (!target) return null;
  const parent = target.parent, siblings = parent ? parent.layers : doc.layers;
  let index = siblings.findIndex(layer => layer.id === target.id);
  while (index > 0 && siblings[index - 1].isClippingMask) index--;
  return siblings[index].id;
}
async function preserveSelection(host, ctx, doc, job) {
  if (!doc.selection.bounds) return null;
  const name = 'PT selection ' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  await step(job, 'save-selection', 'Preserving the pixel selection…', async () => {
    if (doc.channels.some(channel => channel.name === name)) throw new Error('Temporary selection name already exists.');
    await doc.selection.save(name); host.cancel(ctx); savedChannel(host, doc, name);
    await doc.selection.deselect(); host.cancel(ctx);
    doc.activeChannels = doc.componentChannels;
  });
  return name;
}
async function restoreSelection(host, ctx, doc, job, name) {
  if (!name) return;
  await step(job, 'restore-selection', 'Restoring the pixel selection…', async () => {
    host.cancel(ctx); await doc.selection.load(savedChannel(host, doc, name)); host.cancel(ctx);
    await savedChannel(host, doc, name).remove(); host.cancel(ctx);
    doc.activeChannels = doc.componentChannels;
  });
}
async function convert(host, ctx, doc, job, selected) {
  let ids = selected;
  if (!ids.length) {
    job.record.smartInput = 'visible-composite';
    const originals = new Set(layersByID(doc, host.C).keys());
    ids = [await stampVisible(host, ctx, doc, job, originals)];
  } else job.record.smartInput = 'selected-layers';
  if (ids.length === 1 && requireLayer(host, doc, ids[0]).kind === host.C.LayerKind.SMARTOBJECT) return { id: ids[0], created: false };
  const before = new Set(layersByID(doc, host.C).keys());
  const unrelated = [...before].filter(id => !ids.includes(id));
  // A selected group's descendants are intentionally embedded by conversion.
  const embedded = new Set();
  function visit(layer) { embedded.add(layer.id); if (layer.kind === host.C.LayerKind.GROUP) layer.layers.forEach(visit); }
  ids.forEach(id => visit(requireLayer(host, doc, id)));
  const id = await step(job, 'convert-smart', 'Converting to a Smart Object…', async () => {
    host.cancel(ctx); await host.batch({ _obj: 'newPlacedLayer' }); host.cancel(ctx);
    const current = layersByID(doc, host.C);
    if (unrelated.some(id => !embedded.has(id) && !current.has(id))) throw new Error('Conversion changed an unrelated layer.');
    const active = doc.activeLayers.map(layer => layer.id);
    if (active.length !== 1 || !current.has(active[0]) || current.get(active[0]).kind !== host.C.LayerKind.SMARTOBJECT || (before.has(active[0]) && !ids.includes(active[0]))) throw new Error('Could not identify the converted Smart Object.');
    return active[0];
  });
  if (!selected.length) requireLayer(host, doc, id).name = 'Composite';
  return { id, created: true };
}
async function adjustment(host, ctx, doc, job, target, type, name) {
  const before = new Set(layersByID(doc, host.C).keys());
  await step(job, 'create-adjustment', 'Adding ' + name + '…', async () => {
    await host.batch({ _obj: 'make', _target: [{ _ref: 'adjustmentLayer' }], using: { _obj: 'adjustmentLayer', name,
      type: { _obj: type, presetKind: { _enum: 'presetKindType', _value: 'presetKindDefault' }, ...(type === 'hueSaturation' ? { colorize: false } : {}) } } });
    host.cancel(ctx);
  });
  const id = newLayerID(host, doc, before);
  await step(job, 'clip-adjustment', 'Clipping ' + name + ' to the target layer…', async () => {
    // Explicit placement also handles a selected group, where native Make may insert inside it.
    if (!directlyAbove(host, doc, id, target)) await requireLayer(host, doc, id).move(requireLayer(host, doc, target), host.C.ElementPlacement.PLACEBEFORE);
    host.cancel(ctx); await selectLayer(host, doc, id);
    requireLayer(host, doc, id).isClippingMask = true;
    host.cancel(ctx);
    if (requireLayer(host, doc, id).isClippingMask !== true) throw new Error('The adjustment was not clipped.');
  });
  return id;
}
function isCancellation(error) {
  for (let item = error, depth = 0; item && depth < 8; item = item.cause, depth++) if (item.number === -128 || item.code === -128) return true;
  return false;
}
function createLayerService(host) {
  async function run(mode, job) {
    const { app, C } = host;
    job.record.host = host.version;
    validate(app.activeDocument);
    const sourceID = app.activeDocument.id;
    const names = { smart: 'Smart Object', camera: 'Smart Object + Camera Raw', mask: 'Black Mask', curves: 'Clipped Curves', hue: 'Clipped Hue/Saturation', color: 'Solid Color' };
    if (!names[mode]) throw new Error('Unknown layer tool.');
    job.progress('Waiting for Photoshop…');
    await host.modal('Photoshop Tool: ' + names[mode], async ctx => {
      try {
        host.cancel(ctx);
        const doc = host.byID(sourceID);
        validate(doc);
        if (!app.activeDocument || app.activeDocument.id !== sourceID) throw new Error('The active document changed. Run the tool again.');
        const selected = await step(job, 'resolve-targets', 'Resolving the target layers…', () => selectedLayerIDs(host, doc));
        job.record.targetResolution = 'native-layer-ids';
        job.record.source = { id: sourceID, mode: doc.mode, depth: doc.bitsPerChannel, activeLayerIDs: selected, selection: !!doc.selection.bounds };
        if (mode === 'camera') host.validate(doc, false);
        const target = ['mask', 'curves', 'hue'].includes(mode) ? oneLayer(selected) : null;
        if (mode === 'mask' && requireLayer(host, doc, target).isBackgroundLayer) throw new Error('Unlock the Background layer before adding a black mask.');
        if (mode === 'mask' && requireLayer(host, doc, target).allLocked) throw new Error('Unlock the selected layer before adding a black mask.');
        let maskExists = false;
        if (mode === 'mask') {
          const result = await host.batch({ _obj: 'get', _target: [{ _property: 'hasUserMask' }, { _ref: 'layer', _id: target }] });
          maskExists = result[0].hasUserMask === true;
          if (typeof result[0].hasUserMask !== 'boolean') throw new Error('Could not check whether the layer already has a mask.');
        }
        if (mode === 'smart' && selected.length === 1 && requireLayer(host, doc, selected[0]).kind === C.LayerKind.SMARTOBJECT) {
          job.record.layerID = selected[0]; job.record.smartInput = 'selected-layers';
          job.record.mutationCommitted = false; job.record.message = 'Already a Smart Object'; return;
        }
        let effect;
        await withHistory(ctx, sourceID, 'Photoshop Tool: ' + names[mode], async () => {
          await step(job, 'target-image', 'Targeting the layer image, not its mask…', () => prepareTargets(host, ctx, doc, selected));
          const selectionName = ['smart', 'camera', 'mask'].includes(mode) ? await preserveSelection(host, ctx, doc, job) : null;
          if (mode === 'smart' || mode === 'camera') {
            effect = await convert(host, ctx, doc, job, selected);
            await selectLayer(host, doc, effect.id);
            if (mode === 'camera') await step(job, 'camera-raw', 'Adjust Camera Raw, then choose OK…', async () => {
              await host.batch({ _obj: 'Adobe Camera Raw Filter', _options: { dialogOptions: 'display' } });
              host.cancel(ctx); requireLayer(host, doc, effect.id);
              if (!app.activeDocument || app.activeDocument.id !== sourceID) throw new Error('The active document changed while Camera Raw was open.');
            });
          } else if (mode === 'mask') {
            await step(job, maskExists ? 'invert-mask' : 'black-mask', maskExists ? 'Inverting the existing layer mask…' : 'Adding a black layer mask…', async () => {
              await selectLayer(host, doc, target);
              if (maskExists) {
                await host.batch({ _obj: 'select', _target: [{ _ref: 'channel', _enum: 'channel', _value: 'mask' }], makeVisible: false });
                host.cancel(ctx); await host.batch({ _obj: 'invert' });
              } else await host.batch({ _obj: 'make', new: { _class: 'channel' }, at: { _ref: 'channel', _enum: 'channel', _value: 'mask' }, using: { _enum: 'userMaskEnabled', _value: 'hideAll' } });
              host.cancel(ctx);
            });
            effect = { id: target };
          } else if (mode === 'curves' || mode === 'hue') {
            effect = { id: await adjustment(host, ctx, doc, job, target, mode === 'curves' ? 'curves' : 'hueSaturation', mode === 'curves' ? 'Curves' : 'Hue/Saturation') };
          } else {
            const result = await step(job, 'pick-color', 'Choose a Solid Color…', () => host.batch({ _obj: 'showColorPicker', _target: [{ _ref: 'application' }], _options: { dialogOptions: 'display' } }));
            host.cancel(ctx);
            const picked = result[0];
            if (picked && (picked.value === false || picked.cancelled === true)) { const error = new Error('Color selection cancelled.'); error.cancelled = true; throw error; }
            const color = picked && picked.RGBFloatColor;
            if (!color || !['red', 'grain', 'blue'].every(key => typeof color[key] === 'number' && Number.isFinite(color[key]) && color[key] >= 0 && color[key] <= 255)) throw new Error('Photoshop returned no valid RGB color. No fill layer was added.');
            if (!app.activeDocument || app.activeDocument.id !== sourceID) throw new Error('The active document changed while the color picker was open.');
            const anchorID = fillAnchorID(host, doc, selected);
            if (anchorID != null) await selectLayer(host, doc, anchorID);
            const before = new Set(layersByID(doc, C).keys());
            await step(job, 'solid-color', 'Adding Solid Color fill…', async () => {
              await host.batch({ _obj: 'make', _target: [{ _ref: 'contentLayer' }], using: { _obj: 'contentLayer', name: 'Solid Color',
                type: { _obj: 'solidColorLayer', color: { _obj: 'RGBColor', red: color.red, grain: color.grain, blue: color.blue } } } });
              host.cancel(ctx);
            });
            effect = { id: newLayerID(host, doc, before) };
            // Insert above the entire clipping chain (or outside a selected group).
            // Unclipping in its middle would release or retarget existing clipped layers.
            if (anchorID != null && !directlyAbove(host, doc, effect.id, anchorID)) await requireLayer(host, doc, effect.id).move(requireLayer(host, doc, anchorID), C.ElementPlacement.PLACEBEFORE);
            host.cancel(ctx);
            if (requireLayer(host, doc, effect.id).isClippingMask) requireLayer(host, doc, effect.id).isClippingMask = false;
            await selectLayer(host, doc, effect.id);
          }
          await restoreSelection(host, ctx, doc, job, selectionName);
          if (mode === 'mask') await host.batch({ _obj: 'select', _target: [{ _ref: 'channel', _enum: 'channel', _value: 'mask' }], makeVisible: false });
          host.cancel(ctx);
        }, job.warn);
        job.record.mutationCommitted = mode !== 'smart' || effect.created === true;
        job.record.layerID = effect.id;
        job.record.smartObjectCreated = effect.created === true;
        if (mode === 'camera') job.record.cameraRawApplied = true;
        if (mode === 'mask') { job.record.blackMaskAdded = !maskExists; job.record.maskInverted = maskExists; job.record.maskAction = maskExists ? 'invert' : 'create'; }
        if (mode === 'curves' || mode === 'hue') { job.record.adjustmentCreated = true; job.record.clippedToLayerID = target; }
        if (mode === 'color') job.record.fillCreated = true;
        job.record.message = mode === 'smart' && !effect.created ? 'Already a Smart Object' : mode === 'camera' ? 'Camera Raw Smart Filter applied' : mode === 'mask' ? maskExists ? 'Layer mask inverted' : 'Black mask added · paint with white to reveal' : names[mode] + (mode === 'smart' ? ' created' : ' added');
      } catch (error) {
        if (ctx.isCancelled || error && error.cancelled === true || isCancellation(error)) {
          if (!error || typeof error !== 'object') error = new Error('Cancelled.');
          error.cancelled = true; job.record.cancelled = true;
        }
        throw error;
      }
    }, { interactive: mode === 'camera' || mode === 'color' });
  }
  return { run };
}
module.exports = { createLayerService };
