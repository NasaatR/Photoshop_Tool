'use strict';
const definitions = [
  ['layers.smart-object', 'convertSmartObject', 'Convert to Smart Object', 'Smart Object', 'smart', 'Convert selected layers to a Smart Object. With no selected layer, stamp the full visible composition first.', 'smart'],
  ['layers.camera-raw', 'smartCameraRaw', 'Smart Object + Camera Raw', 'Camera Raw', 'camera', 'Convert selected layers to a Smart Object and open Camera Raw as a Smart Filter. With no layer selected, stamp visible layers first.', 'camera'],
  ['layers.black-mask', 'addBlackMask', 'Add Black Layer Mask', 'Black mask', 'mask', 'Add a full black (Hide All) pixel mask to one selected layer. Existing masks are kept.', 'mask'],
  ['layers.curves', 'addClippedCurves', 'Curves · Clipped to Layer', 'Curves', 'curves', 'Add a neutral Curves adjustment immediately above one selected layer, clipped to it.', 'curves'],
  ['layers.hue-saturation', 'addClippedHueSaturation', 'Hue/Saturation · Clipped to Layer', 'Hue / Sat', 'hue', 'Add a neutral Hue/Saturation adjustment immediately above one selected layer, clipped to it.', 'hue'],
  ['layers.solid-color', 'addSolidColor', 'Add Solid Color Fill', 'Solid Color', 'color', 'Choose a color and add an editable Solid Color fill layer. It is not clipped.', 'color']
];
module.exports = definitions.map(([id, commandId, title, label, icon, description, mode]) => ({
  id, commandId, title, label, icon, description, group: 'Layers', compact: true, defaultVisible: true,
  execute: job => job.services.layers.run(mode, job)
}));
