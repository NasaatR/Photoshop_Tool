'use strict';
const { requireLayer, selectLayer, savedChannel, step } = require('../../core/layers.js');
function softness(bounds, requested) {
  const side = Math.min(bounds.right - bounds.left, bounds.bottom - bounds.top);
  if (!Number.isFinite(side) || side <= 0) throw new Error('The Smart Area has no maskable pixels.');
  if (!Number.isFinite(requested) || requested < 0 || requested > 1000) throw new Error('Invalid Smart Area feather.');
  // Keep a visible center even in a tiny region. The inset puts the fade inside
  // the extracted pixels instead of blurring across an already hard crop.
  const feather = Math.min(requested, Math.max(0, (side - 1) / 8));
  return { feather, inset: Math.floor(feather * 2) };
}
async function addSoftMask(host, ctx, source, smartID, channelName, requested, job) {
  return step(job, 'soft-mask', 'Adding a soft Smart Area mask…', async () => {
    host.cancel(ctx); await selectLayer(host, source, smartID); source.activeChannels = source.componentChannels;
    if (channelName) await source.selection.load(savedChannel(host, source, channelName));
    else await source.selection.selectRectangle({ left: 0, top: 0, right: source.width, bottom: source.height }, host.C.SelectionType.REPLACE);
    host.cancel(ctx);
    const settings = softness(source.selection.bounds, requested);
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
    host.cancel(ctx); requireLayer(host, source, smartID).layerMaskFeather = settings.feather;
    host.cancel(ctx); source.activeChannels = source.componentChannels;
    return { requested, ...settings, placement: 'parent-smart-object', exportIncludesMask: false };
  });
}
module.exports = { softness, addSoftMask };
