'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
function createManifest(product, tools) {
  return { manifestVersion: 5, id: product.id, name: product.name, version: product.version, main: 'main.js',
    host: { app: 'PS', minVersion: '26.9.0', data: { apiVersion: 2, enableMenuRecording: true } },
    requiredPermissions: { localFileSystem: 'fullAccess', clipboard: 'readAndWrite' }, entrypoints: [
      { type: 'panel', id: 'relayPanel', label: { default: product.name }, minimumSize: { width: 176, height: 96 }, maximumSize: { width: 4096, height: 4096 }, preferredDockedSize: { width: 240, height: 184 }, preferredFloatingSize: { width: 252, height: 194 } },
      ...tools.map(tool => ({ type: 'command', id: tool.commandId, label: { default: tool.title } }))
    ] };
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = crc >>> 1 ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(entries) {
  const blocks = [], central = []; let offset = 0;
  for (const [name, data] of entries) {
    const filename = Buffer.from(name, 'utf8'), packed = data, crc = crc32(data);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6); local.writeUInt16LE(0, 8);
    local.writeUInt16LE(33, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(filename.length, 26);
    blocks.push(local, filename, packed);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x800, 8); c.writeUInt16LE(0, 10); c.writeUInt16LE(33, 14);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(packed.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(filename.length, 28); c.writeUInt32LE(offset, 42);
    central.push(c, filename); offset += local.length + filename.length + packed.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...blocks, directory, end]);
}
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]); }
function build() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const product = { name: 'Photoshop Tool', version: pkg.version, id: 'com.nasaat.pngrelay', repository: pkg.homepage };
  const tools = require('../plugin/tools/index.js').list();
  fs.writeFileSync(path.join(root, 'plugin/product.json'), JSON.stringify(product, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'plugin/manifest.json'), JSON.stringify(createManifest(product, tools), null, 2) + '\n');
  const runtime = path.join(root, 'plugin');
  const files = walk(runtime).sort((a, b) => a.endsWith('manifest.json') ? -1 : b.endsWith('manifest.json') ? 1 : (a < b ? -1 : a > b ? 1 : 0));
  const entries = files.map(file => [path.relative(runtime, file).split(path.sep).join('/'), fs.readFileSync(file)]);
  entries.push(['LICENSE.txt', fs.readFileSync(path.join(root, 'LICENSE'))]);
  const filename = 'Photoshop-Tool-' + product.version + '.ccx', output = path.join(root, 'dist', filename);
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, zip(entries));
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex');
  fs.writeFileSync(path.join(root, 'dist/SHA256SUMS.txt'), sha256 + '  ' + filename + '\n');
  console.log(JSON.stringify({ filename, files: entries.length, sha256 })); return { output, entries };
}
if (require.main === module) build();
module.exports = { build, createManifest, walk };
