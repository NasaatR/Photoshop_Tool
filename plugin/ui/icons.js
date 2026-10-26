'use strict';
const paths = {
  export: 'M3 4h13v2H5v12h7v2H3V4zm4 4h3v3H7V8zm-2 8 4-5 3 3 2-2 2 2v2H5zm13-6h2v7l2-2 1.4 1.4-4.4 4.4-4.4-4.4L16 15l2 2v-7z',
  selection: 'M2 2h6v2H4v4H2V2zm8 0h4v2h-4zm6 0h6v6h-2V4h-4zM2 10h2v4H2zm0 6h2v4h4v2H2zm8 4h3v2h-3zm6-10 7 4v8l-7 4-7-4v-8zm0 2.3L12 15l4 2.3 4-2.3zm-5 4.4v4.1l4 2.3V19zm10 0-4 2.3v4.1l4-2.3z',
  copy: 'M8 2h14v16h-2V4H8V2zM2 6h14v16H2V6zm2 2v12h10V8H4z',
  labels: 'M3 5h18v2H3V5zm0 6h12v2H3v-2zm0 6h7v2H3v-2zm14-3 5 4-5 4v-3h-4v-2h4v-3z',
  settings: 'M10 2h4l.6 3 2 .9 2.6-1.6 2.8 2.8-1.6 2.6.9 2L24 12v4l-2.7.3-.9 2 1.6 2.6-2.8 2.8-2.6-1.6-2 .9L14 26h-4l-.6-3-2-.9-2.6 1.6L2 20.9l1.6-2.6-.9-2L0 16v-4l2.7-.3.9-2L2 7.1l2.8-2.8 2.6 1.6 2-.9L10 2zm2 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z'
};
function icon(doc, name) {
  if (!paths[name]) throw new Error('Unknown bundled icon: ' + name);
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', name === 'settings' ? '0 0 24 28' : name === 'selection' ? '0 0 26 28' : '0 0 24 24');
  svg.setAttribute('class', 'pt-icon'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('fill', 'currentColor'); path.setAttribute('d', paths[name]); svg.appendChild(path); return svg;
}
module.exports = { icon };
