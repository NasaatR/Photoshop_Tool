'use strict';
const { requireLayer, selectLayer, savedChannel, step } = require('../../core/layers.js');
function softness(bounds, percent) {
  if (!bounds || ![bounds.left, bounds.top, bounds.right, bounds.bottom].every(Number.isFinite)) throw new Error('The Smart Area has no maskable pixels.');
  const side = Math.min(bounds.right - bounds.left, bounds.bottom - bounds.top);
  if (!Number.isFinite(side) || side <= 0) throw new Error('The Smart Area has no maskable pixels.');
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error('Invalid Smart Area edge blur percentage.');
  // Keep a visible center even in a tiny region. The inset puts the fade inside
  // the extracted pixels instead of blurring across an already hard crop.
  // Use the documented Gaussian Blur radius range. One native pass avoids
  // full-canvas pixel buffers, repeated filters and persistent live feather.
  const requestedRadius = side * percent / 100;
  const radius = percent === 0 ? 0 : Math.min(250, Math.max(0.1, requestedRadius));
  return { percent, reference: 'shorter-side', requestedRadius, radius, radiusLimited: radius !== requestedRadius,
    inset: Math.min(Math.floor(radius * 2), Math.floor((side - 1) / 4)) };
}
async function addSoftMask(host, ctx, source, smartID, channelName, percent, job) {
  return step(job, 'soft-mask', 'Adding a soft Smart Area mask…', async () => {
    host.cancel(ctx); await selectLayer(host, source, smartID); source.activeChannels = source.componentChannels;
    if (channelName) await source.selection.load(savedChannel(host, source, channelName));
    else await source.selection.selectRectangle({ left: 0, top: 0, right: source.width, bottom: source.height }, host.C.SelectionType.REPLACE);
    host.cancel(ctx);
    const settings = softness(source.selection.bounds, percent);
    for (let remaining = settings.inset; remaining > 0;) {
      const amount = Math.min(500, remaining);
      await source.selection.contract(amount, true); host.cancel(ctx); remaining -= amount;
      if (!source.selection.bounds) {
        // An irregular/narrow selection can disappear on contraction. Restore
        // its exact outline; never turn an empty selection into Reveal All.
        if (channelName) await source.selection.load(savedChannel(host, source, channelName));
        else throw new Error('The full-canvas mask disappeared while contracting.');
        settings.inset = 0; job.warn('This area is too narrow to inset. Its original mask outline was softened.'); break;
      }
    }
    if (!source.selection.bounds) throw new Error('No pixels remain for the Smart Area mask.');
    await host.batch({ _obj: 'make', new: { _class: 'channel' }, at: { _ref: 'channel', _enum: 'channel', _value: 'mask' }, using: { _enum: 'userMaskEnabled', _value: 'revealSelection' } });
    host.cancel(ctx); requireLayer(host, source, smartID).layerMaskFeather = 0;
    if (settings.radius > 0) {
      // Deselect before filtering: the entire mask must be softened, not only
      // pixels inside the extraction selection. Target the mask explicitly;
      // a Layer.applyGaussianBlur call could instead affect the image/Smart Object.
      await source.selection.deselect(); host.cancel(ctx);
      await host.batch({ _obj: 'select', _target: [{ _ref: 'channel', _enum: 'channel', _value: 'mask' }, { _ref: 'layer', _id: smartID }, { _ref: 'document', _id: source.id }], makeVisible: false });
      host.cancel(ctx);
      await host.batch({ _obj: 'gaussianBlur', radius: { _unit: 'pixelsUnit', _value: settings.radius } });
      host.cancel(ctx);
    }
    host.cancel(ctx); source.activeChannels = source.componentChannels;
    return { ...settings, baked: true, liveFeather: 0, placement: 'parent-smart-object', exportIncludesMask: false };
  });
}
module.exports = { softness, addSoftMask };
