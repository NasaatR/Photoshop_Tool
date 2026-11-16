'use strict';
const { requireLayer, step } = require('../../core/layers.js');
function cover(bounds, width, height) {
  if (!bounds || ![bounds.left, bounds.top, bounds.right, bounds.bottom, width, height].every(Number.isFinite) || width <= 0 || height <= 0 || bounds.right <= bounds.left || bounds.bottom <= bounds.top) throw new Error('The selected layer has no usable image bounds.');
  return Math.max(width / (bounds.right - bounds.left), height / (bounds.bottom - bounds.top)) * 100;
}
function center(bounds, width, height) {
  cover(bounds, width, height);
  return { x: width / 2 - (bounds.left + bounds.right) / 2, y: height / 2 - (bounds.top + bounds.bottom) / 2 };
}
function validateFill(host, doc, id) {
  const layer = requireLayer(host, doc, id);
  if (layer.isBackgroundLayer || layer.locked || layer.allLocked || layer.positionLocked) throw new Error('Unlock the selected layer before filling the canvas.');
  const linked = layer.linkedLayers;
  if (linked && Array.from(linked).some(other => other.id !== id)) throw new Error('Unlink the selected layer first so other linked layers are not transformed.');
  cover(layer.boundsNoEffects, doc.width, doc.height);
}
async function fillCurrentLayer(host, ctx, doc, id, job) {
  const before = requireLayer(host, doc, id).boundsNoEffects;
  const percent = cover(before, doc.width, doc.height);
  await step(job, 'fill-layer', 'Filling the canvas with the selected layer…', async () => {
    host.cancel(ctx);
    if (Math.abs(percent - 100) > 0.000001) await requireLayer(host, doc, id).scale(percent, percent, host.C.AnchorPosition.MIDDLECENTER);
    host.cancel(ctx);
    const offset = center(requireLayer(host, doc, id).boundsNoEffects, doc.width, doc.height);
    if (Math.abs(offset.x) > 0.000001 || Math.abs(offset.y) > 0.000001) await requireLayer(host, doc, id).translate(offset.x, offset.y);
    host.cancel(ctx);
  });
  return { id, percent, before: { left: before.left, top: before.top, right: before.right, bottom: before.bottom } };
}
module.exports = { cover, center, validateFill, fillCurrentLayer };
