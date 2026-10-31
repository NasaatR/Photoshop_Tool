'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { getEnvironment } = require('../plugin/core/environment.js');
const { formatReport } = require('../plugin/core/diagnostics.js');
test('Photoshop version comes from UXP host even when app.version is undefined', () => {
  const result = getEnvironment({ app: {} }, { host: { name: 'Photoshop', version: '28.0.1' }, versions: { uxp: '9.4.0' } });
  assert.equal(result.photoshop, '28.0.1'); assert.equal(result.versionSource, 'uxp.host.version'); assert.equal(result.uxp, '9.4.0');
  const report = formatReport({ product: 'Photoshop Tool', version: 'test', generatedAt: 'today', photoshop: result.photoshop });
  assert.match(report, /Photoshop: 28\.0\.1/); assert.doesNotMatch(report, /Photoshop: undefined/);
});
test('missing or throwing host metadata is reported explicitly instead of undefined', () => {
  const uxp = { get host() { throw new Error('Unavailable'); } };
  assert.equal(getEnvironment({ app: { version: 'legacy' } }, uxp).photoshop, 'legacy');
  assert.equal(getEnvironment({ app: {} }, {}).photoshop, 'unavailable');
  assert.match(formatReport({ product: 'Test', version: 'test' }), /Photoshop: unavailable/);
});
