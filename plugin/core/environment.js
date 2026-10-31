'use strict';
function readText(get) {
  try { const value = get(); return typeof value === 'string' && value.trim() && !['undefined', 'null'].includes(value) ? value.trim() : null; } catch (_) { return null; }
}
function getEnvironment(ps, uxp) {
  const nativeVersion = readText(() => uxp.host.version), legacyVersion = readText(() => ps.app.version);
  return { photoshop: nativeVersion || legacyVersion || 'unavailable', versionSource: nativeVersion ? 'uxp.host.version' : legacyVersion ? 'legacy app.version' : 'unavailable',
    uxp: readText(() => uxp.versions.uxp) || readText(() => uxp.version) || 'unavailable', hostName: readText(() => uxp.host.name) || 'Photoshop' };
}
module.exports = { getEnvironment };
