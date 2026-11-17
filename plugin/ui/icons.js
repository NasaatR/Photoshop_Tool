'use strict';
// Bundled official Lucide assets. Exact names/commit: icon-data.json.
// ISC / applicable Feather MIT notices: LICENSE-LUCIDE.txt.
const { icons } = require('./icon-data.json');
function icon(doc, name) {
  const asset = icons[name];
  if (!asset) throw new Error('Unknown bundled icon: ' + name);
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', class: 'pt-icon', 'aria-hidden': 'true', focusable: 'false', 'data-icon': asset.name })) svg.setAttribute(key, value);
  for (const node of asset.nodes) {
    const child = doc.createElementNS('http://www.w3.org/2000/svg', node.tag);
    for (const [key, value] of Object.entries({ fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...node.attrs })) child.setAttribute(key, value);
    svg.appendChild(child);
  }
  return svg;
}
function formatIcon(doc, format) {
  if (!['PNG', 'PSD'].includes(format)) throw new Error('Unknown file format icon.');
  const node = doc.createElement('div'); node.setAttribute('class', 'pt-format-icon'); node.setAttribute('aria-hidden', 'true');
  const label = doc.createElement('span'); label.setAttribute('class', 'pt-format-tag'); label.textContent = format;
  node.appendChild(icon(doc, 'file')); node.appendChild(label); return node;
}
module.exports = { icon, formatIcon };
