'use strict';
function createRegistry(definitions) {
  const ids = new Set(), commands = new Set();
  const tools = definitions.map(source => {
    if (!source || !/^[a-z][a-z0-9.-]+$/.test(source.id || '')) throw new Error('Each tool needs a stable lowercase ID.');
    if (ids.has(source.id)) throw new Error('Duplicate tool ID: ' + source.id);
    if (!/^[A-Za-z][A-Za-z0-9]+$/.test(source.commandId || '') || commands.has(source.commandId)) throw new Error('Missing or duplicate command ID: ' + source.commandId);
    if (!source.title || !source.label || !source.icon || typeof source.execute !== 'function') throw new Error('Incomplete tool: ' + source.id);
    ids.add(source.id); commands.add(source.commandId);
    return Object.freeze({ defaultVisible: true, ...source });
  });
  const byID = new Map(tools.map(tool => [tool.id, tool]));
  return Object.freeze({ list: () => tools.slice(), get(id) {
    if (!byID.has(id)) throw new Error('Unknown tool: ' + id);
    return byID.get(id);
  } });
}
module.exports = { createRegistry };
