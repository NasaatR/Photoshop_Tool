'use strict';
const zlib = require('node:zlib');
function chunk(type, data) {
  const name = Buffer.from(type), body = Buffer.concat([name, data]); let crc = 0xffffffff;
  for (const byte of body) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = crc >>> 1 ^ (crc & 1 ? 0xedb88320 : 0); }
  const length = Buffer.alloc(4), checksum = Buffer.alloc(4); length.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, body, checksum]);
}
function pngFixture(width = 1, height = 1, bitDepth = 16, colorType = 6, options = {}) {
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = bitDepth; header[9] = colorType;
  // Host mocks need only a structural fixture. Small fixtures have real scanlines.
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType] || 1;
  const raw = width * height < 256 ? Buffer.alloc(height * (1 + width * channels * bitDepth / 8)) : Buffer.alloc(1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header),
    ...(options.beforeImage || []), chunk('IDAT', zlib.deflateSync(raw)), ...(options.afterImage || []), chunk('IEND', Buffer.alloc(0))]);
}
module.exports = { chunk, pngFixture };
