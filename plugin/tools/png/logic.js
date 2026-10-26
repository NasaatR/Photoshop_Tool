'use strict';
function location(path) {
  const p = String(path || '').replace(/\\/g, '/');
  if (!/^(?:[A-Za-z]:\/|\/\/)/.test(p) || !/\.(psd|psb)$/i.test(p)) throw new Error('Save a local PSD or PSB first. Cloud documents need a local copy.');
  if (/\.psb$/i.test(p) && /(?:^|\/)(?:temp|temporary items)\//i.test(p)) throw new Error('This temporary PSB has no remembered parent PSD. Run Selection to Smart Object from the parent.');
  const split = p.lastIndexOf('/'); return { folder: p.slice(0, split), base: p.slice(split + 1).replace(/\.(psd|psb)$/i, '') };
}
function selectionName(base, layer, id) {
  let part = Array.from(String(layer).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim()).slice(0, 70).join('').replace(/[. ]+$/g, '') || 'Selection';
  const tail = ' — ' + part + ' — ' + id + '.png'; let prefix = '';
  for (const ch of String(base)) { if (prefix.length + ch.length + tail.length > 240) break; prefix += ch; }
  return prefix + tail;
}
function dimensions(doc) { return { width: doc.width, height: doc.height, depth: doc.bitsPerChannel }; }
function verifyDimensions(expected, actual) { if (expected.width !== actual.width || expected.height !== actual.height || expected.depth !== actual.depth) throw new Error('Reopened PNG dimensions or depth differ. Output was not committed.'); }
module.exports = { location, selectionName, dimensions, verifyDimensions };
