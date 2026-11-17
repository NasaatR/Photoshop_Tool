'use strict';
// Portable allowlist: no document, path, permission, account or window state.
function appearanceSnapshot(product, { appearance, state }) {
  const { labels, size, corners, theme, buttonSize } = appearance;
  if (typeof labels !== 'boolean' || !['compact', 'roomy'].includes(size) || !['square', 'soft'].includes(corners) || !['host', 'dark', 'light'].includes(theme)) throw new Error('Appearance contains an unsupported value.');
  if (buttonSize !== undefined && (!Number.isInteger(buttonSize) || buttonSize < 36 || buttonSize > 4096)) throw new Error('Main button height must be a whole number from 36 to 4096 px.');
  const overrides = { labels, size, corners, theme, ...(buttonSize === undefined ? {} : { buttonSize }) };
  return { product: product.name, version: product.version, schema: 1, scope: 'local', snapshot: 'current-preview', persistence: state === 'saved' ? 'saved' : 'unsaved',
    units: { buttonSize: 'px', mainButtonHeight: 'px', compactButtonSize: 'px' }, appearance: overrides,
    effective: { mainButtonHeight: (buttonSize ?? (size === 'roomy' ? 48 : 40)) + (labels ? 30 : 0), compactButtonSize: labels ? (size === 'roomy' ? 62 : 56) : (size === 'roomy' ? 36 : 32) } };
}
module.exports = { appearanceSnapshot };
