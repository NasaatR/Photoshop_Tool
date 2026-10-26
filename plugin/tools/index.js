'use strict';
const { createRegistry } = require('../core/registry.js');
// Add a bundled tool module here. The panel and build-time command manifest
// consume this same registry; no remote scripts or arbitrary module loading.
const definitions = [...require('./png/index.js')];
module.exports = createRegistry(definitions);
