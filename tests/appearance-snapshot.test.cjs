'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { appearanceSnapshot } = require('../plugin/core/appearance-snapshot.js');
test('appearance export is a portable allowlist with exact preview types, inheritance and persistence', () => {
  const product = { name: 'Photoshop Tool', version: '1.9.0' }, a = { labels: false, size: 'compact', corners: 'soft', theme: 'host', password: 'secret', path: 'private' };
  const s = appearanceSnapshot(product, { appearance: a, state: 'saved' });
  assert.equal(s.appearance.labels, false); assert.equal(s.appearance.theme, 'host'); assert.equal('buttonSize' in s.appearance, false);
  assert.equal(s.effective.mainButtonHeight, 40); assert.equal(s.effective.compactButtonSize, 32); assert.equal(s.persistence, 'saved');
  assert.doesNotMatch(JSON.stringify(s), /secret|private|password|path/); assert.equal(s.scope, 'local'); assert.equal(s.schema, 1);
  const large = appearanceSnapshot(product, { appearance: { ...a, labels: true, buttonSize: 210, size: 'roomy' }, state: 'preview' });
  assert.equal(large.appearance.buttonSize, 210); assert.equal(large.units.buttonSize, 'px'); assert.equal(large.effective.mainButtonHeight, 240); assert.equal(large.effective.compactButtonSize, 62); assert.equal(large.persistence, 'unsaved');
  assert.throws(() => appearanceSnapshot(product, { appearance: { ...a, buttonSize: 0 } }), /height/);
  assert.throws(() => appearanceSnapshot(product, { appearance: { ...a, theme: 'secret' } }), /unsupported/);
});
