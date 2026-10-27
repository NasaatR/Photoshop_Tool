'use strict';
const canonical = path => String(path || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
function fileURL(nativePath) {
  const path = String(nativePath || '').replace(/\\/g, '/');
  // UXP filesystem URLs accept native path characters; do not web-encode them.
  if (/^[A-Za-z]:(?:\/|$)/.test(path)) return 'file:/' + path + (path.length === 2 ? '/' : '');
  if (/^\/\/[^/]+\/[^/]+/.test(path) || /^\/(?!\/)/.test(path)) return 'file:' + path;
  throw new Error('The project folder must have an absolute local path.');
}
function createOutputAccess(fs) {
  return async (root, progress) => {
    progress('Opening the project folder…');
    try {
      const folder = await fs.getEntryWithUrl(fileURL(root.folder));
      if (!folder || !folder.isFolder || canonical(folder.nativePath) !== canonical(root.folder)) throw new Error('Project folder is missing or resolves to a different location.');
      await folder.getEntries();
      return folder;
    } catch (cause) {
      const error = new Error('Cannot access the project folder. Check that it exists and is accessible, and that the plugin update was granted file access.');
      error.cause = cause;
      throw error;
    }
  };
}
module.exports = { createOutputAccess, canonical, fileURL };
