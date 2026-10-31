'use strict';
function releaseInfo(version) {
  const match = /^([1-9]\d*)\.([0-9])\.0$/.exec(version);
  if (!match) throw new Error('Use the personal release sequence: native x.y.0, with y from 0 to 9.');
  const displayVersion = match[1] + '.' + match[2];
  return { version, displayVersion, filename: 'Photoshop-Tool-v' + displayVersion + '.ccx' };
}
module.exports = { releaseInfo };
