'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { verifyPNG } = require('../plugin/tools/png/verify-file.js');
const { pngFixture, chunk } = require('./png-fixture.cjs');
const expected = { width: 1, height: 1, bitDepth: 16, mode: 'RGB' };
test('PNG verification accepts RGB/Gray with alpha at 8/16 bit and typed-array offsets', () => {
  for (const bitDepth of [8, 16]) for (const colorType of [0, 2, 4, 6]) {
    const bytes = pngFixture(1, 1, bitDepth, colorType), wrapped = Buffer.concat([Buffer.from([99]), bytes, Buffer.from([99])]);
    const r = verifyPNG(wrapped.subarray(1, -1), { ...expected, bitDepth, mode: [0, 4].includes(colorType) ? 'Grayscale' : 'RGB' });
    assert.equal(r.width, 1); assert.equal(r.bitDepth, bitDepth); assert.equal(r.bytes, bytes.length);
  }
});
test('PNG checks every chunk CRC and refuses truncated output, missing image data and trailing bytes', () => {
  const valid = pngFixture(); const corrupt = Buffer.from(valid); corrupt[45] ^= 1;
  const noImage = Buffer.concat([valid.subarray(0, 33), chunk('IEND', Buffer.alloc(0))]);
  for (const bytes of [valid.subarray(0, -1), valid.subarray(1), corrupt, noImage, Buffer.concat([valid, Buffer.from([0])]), 'text']) assert.throws(() => verifyPNG(bytes, expected), /PNG/);
});
test('PNG check validates dimensions, depth, color mode and critical chunk ordering', () => {
  for (const change of [{ width: 2 }, { height: 2 }, { bitDepth: 8 }, { mode: 'Grayscale' }]) assert.throws(() => verifyPNG(pngFixture(), { ...expected, ...change }), /differ/);
  assert.throws(() => verifyPNG(pngFixture(1, 1, 16, 6, { beforeImage: [chunk('TEST', Buffer.alloc(0))] }), expected), /critical/);
  assert.throws(() => verifyPNG(pngFixture(1, 1, 16, 6, { afterImage: [chunk('tEXt', Buffer.from('a\0b')), chunk('IDAT', Buffer.from([1]))] }), expected), /order/);
});
test('PNG validation honors cancellation before copying or committing', () => {
  assert.throws(() => verifyPNG(pngFixture(), expected, () => { throw new Error('Cancelled'); }), /Cancelled/);
});
