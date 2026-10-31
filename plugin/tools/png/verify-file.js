'use strict';
// PNG chunk layout/CRC: https://www.w3.org/TR/png-3/. This is not a pixel decoder.
let crcTable;
function crc32(bytes, start, end, cancel) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let value = n;
      for (let bit = 0; bit < 8; bit++) value = value >>> 1 ^ (value & 1 ? 0xedb88320 : 0);
      crcTable[n] = value >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) {
    if ((i & 0xfffff) === 0) cancel();
    crc = crcTable[(crc ^ bytes[i]) & 255] ^ crc >>> 8;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function verifyPNG(data, expected, cancel = () => {}) {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : null;
  if (!bytes || bytes.length < 58 || [137, 80, 78, 71, 13, 10, 26, 10].some((value, i) => bytes[i] !== value)) throw new Error('Saved file has no valid PNG signature. Output was not committed.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8, header = null, imageBytes = 0, imageEnded = false;
  while (offset + 12 <= bytes.length) {
    cancel();
    const size = view.getUint32(offset), end = offset + 12 + size;
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (size > 0x7fffffff || end > bytes.length || !/^[A-Za-z]{4}$/.test(type)) throw new Error('Saved PNG contains a truncated or invalid chunk. Output was not committed.');
    if (crc32(bytes, offset + 4, end - 4, cancel) !== view.getUint32(end - 4)) throw new Error('Saved PNG checksum failed for ' + type + '. Output was not committed.');
    if (!header && (type !== 'IHDR' || size !== 13)) throw new Error('Saved PNG has no valid IHDR header.');
    if (type === 'IHDR') {
      if (header || size !== 13) throw new Error('Saved PNG contains a duplicate or invalid IHDR header.');
      header = { width: view.getUint32(offset + 8), height: view.getUint32(offset + 12), bitDepth: bytes[offset + 16], colorType: bytes[offset + 17] };
      const allowedTypes = expected.mode === 'RGB' ? [2, 6] : [0, 4];
      if (!header.width || !header.height || header.width !== expected.width || header.height !== expected.height || header.bitDepth !== expected.bitDepth || !allowedTypes.includes(header.colorType)) throw new Error('Saved PNG dimensions, depth or color mode differ. Output was not committed.');
      if (bytes[offset + 18] !== 0 || bytes[offset + 19] !== 0 || bytes[offset + 20] > 1) throw new Error('Saved PNG uses invalid compression, filtering or interlace metadata.');
    } else if (type === 'IDAT') {
      if (imageEnded) throw new Error('Saved PNG image chunks are out of order.');
      imageBytes += size;
    } else {
      if (imageBytes) imageEnded = true;
      if (type === 'IEND') {
        if (size !== 0 || !imageBytes || end !== bytes.length) throw new Error('Saved PNG image data or ending is incomplete.');
        return { ...header, bytes: bytes.length, method: 'PNG structure + CRC', decodedPixels: false };
      }
      if (type !== 'PLTE' && type[0] === type[0].toUpperCase()) throw new Error('Saved PNG contains an unsupported critical chunk: ' + type);
    }
    offset = end;
  }
  throw new Error('Saved PNG has no complete IEND chunk. Output was not committed.');
}
module.exports = { verifyPNG };
