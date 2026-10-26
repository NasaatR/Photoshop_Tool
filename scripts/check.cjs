'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), cp = require('node:child_process');
const { createManifest, walk } = require('./build.cjs');
const root = path.resolve(__dirname, '..'), plugin = path.join(root, 'plugin');
const pkg = require('../package.json'), product = require('../plugin/product.json'), manifest = require('../plugin/manifest.json'), registry = require('../plugin/tools/index.js');
assert.equal(product.version, pkg.version); assert.equal(manifest.version, pkg.version); assert.equal(manifest.id, 'com.nasaat.pngrelay');
assert.deepEqual(manifest, createManifest(product, registry.list()));
for (const file of walk(plugin)) {
  assert.ok(/\.(js|json)$/.test(file), 'Unexpected runtime file: ' + file);
  if (file.endsWith('.js')) {
    cp.execFileSync(process.execPath, ['--check', file]);
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /\b(?:eval|fetch|XMLHttpRequest|WebSocket)\s*\(|new\s+Function\s*\(|child_process|navigator\.clipboard/);
    for (const [, name] of text.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
      if (name.startsWith('.')) assert.ok(fs.existsSync(path.resolve(path.dirname(file), name)), 'Missing module: ' + name);
      else assert.ok(['photoshop', 'uxp'].includes(name), 'Node/browser module in UXP source: ' + name);
    }
  }
}
console.log('Syntax, registry/manifest parity, version, runtime imports and permissions: pass');
