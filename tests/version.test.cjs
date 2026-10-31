'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { releaseInfo } = require('../scripts/version.cjs');
test('one native release value derives personal display versions and installer names', () => {
  for (const [native, display] of [['1.0.0', '1.0'], ['1.9.0', '1.9'], ['2.0.0', '2.0']]) {
    assert.deepEqual(releaseInfo(native), { version: native, displayVersion: display, filename: 'Photoshop-Tool-v' + display + '.ccx' });
  }
  for (const invalid of ['0.3.5', '1.10.0', '1.1.1', '1.1', 'v1.1', '01.1.0', '1.1.0-preview']) assert.throws(() => releaseInfo(invalid), /release sequence/);
});
