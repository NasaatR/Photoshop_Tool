'use strict';
const paths = {
  arrange: 'M7 2 3 6h3v6h2V6h3L7 2zm10 20 4-4h-3v-6h-2v6h-3l4 4zM12 4h9v2h-9V4zM3 18h9v2H3v-2z',
  smart: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v14h14V5H5zm2 2h10v10H7V7zm2 2v6h6V9H9z',
  camera: 'M8 3h8l2 3h3v14H3V6h3l2-3zm1 2L7 8H5v10h14V8h-3l-2-3H9zm3 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  mask: 'M4 4h16v16H4V4zm2 2v12h12V6H6zm6 1a5 5 0 1 0 0 10V7z',
  curves: 'M3 3h2v16h16v2H3V3zm4 13c7 0 1-10 12-10v2c-8 0-2 10-12 10v-2z',
  hue: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 0 1 6.8 3.8L12 12V4zm-6.8 12A8 8 0 0 1 12 4v8l-6.8 4zM12 20a8 8 0 0 1-6.8-4L12 12l6.8 3.8A8 8 0 0 1 12 20z',
  color: 'M12 2 2 12l10 10 10-10L12 2zm0 3 7 7H5l7-7zm-7 9h14l-7 5-7-5z', 
  export: 'M3 4h13v2H5v12h7v2H3V4zm4 4h3v3H7V8zm-2 8 4-5 3 3 2-2 2 2v2H5zm13-6h2v7l2-2 1.4 1.4-4.4 4.4-4.4-4.4L16 15l2 2v-7z',
  selection: 'M2 2h6v2H4v4H2V2zm9 0h5v2h-5V2zm8 0h3v6h-2V4h-1V2zM2 11h2v5H2v-5zm0 8h2v1h4v2H2v-3zM14 7l8 4v9l-8 4-8-4v-9l8-4zm0 2.2-5.8 2.9 5.8 2.9 5.8-2.9L14 9.2zm-6 4.5v5.1l5 2.5v-5.1l-5-2.5zm12 0-5 2.5v5.1l5-2.5v-5.1z',
  copy: 'M8 2h11a3 3 0 0 1 3 3v11h-2V5a1 1 0 0 0-1-1H8V2zM5 6h9a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3zm0 2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H5z',
  report: 'M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v16h12V8h-5V4H6zm9 1v1h1l-1-1zM8 11h8v2H8v-2zm0 4h6v2H8v-2z',
  labels: 'M3 5h18v2H3V5zm0 6h12v2H3v-2zm0 6h7v2H3v-2zm14-3 5 4-5 4v-3h-4v-2h4v-3z',
  settings: 'M9 2h6v3l2 1 2-2 3 4-2 2v4l2 2-3 4-2-2-2 1v3H9v-3l-2-1-2 2-3-4 2-2v-4L2 8l3-4 2 2 2-1V2zm2 2v3l-4 2-2-2-1 1 2 2v4l-2 2 1 1 2-2 4 2v3h2v-3l4-2 2 2 1-1-2-2v-4l2-2-1-1-2 2-4-2V4h-2zm1 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z'
};
function icon(doc, name) {
  if (!paths[name]) throw new Error('Unknown bundled icon: ' + name);
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'pt-icon'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('fill', 'currentColor'); path.setAttribute('d', paths[name]); svg.appendChild(path); return svg;
}
module.exports = { icon };
