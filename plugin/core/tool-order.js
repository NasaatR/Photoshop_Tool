'use strict';
function normalizeOrder(value) {
  return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && /^[a-z][a-z0-9.-]+$/.test(id)))].slice(0, 200) : [];
}
function orderTools(tools, order) {
  const ranks = new Map(normalizeOrder(order).map((id, index) => [id, index])), groups = new Map();
  for (const tool of tools) { const group = tool.group || 'Tools'; if (!groups.has(group)) groups.set(group, []); groups.get(group).push(tool); }
  return [...groups.values()].flatMap(group => group.slice().sort((a, b) => (ranks.get(a.id) ?? 1000) - (ranks.get(b.id) ?? 1000)));
}
function moveTool(tools, order, source, target) {
  const list = orderTools(tools, order), a = list.find(tool => tool.id === source), b = list.find(tool => tool.id === target);
  if (!a || !b || (a.group || 'Tools') !== (b.group || 'Tools')) return null;
  const ids = list.map(tool => tool.id), index = ids.indexOf(target);
  ids.splice(ids.indexOf(source), 1); ids.splice(index, 0, source);
  return ids.concat(normalizeOrder(order).filter(id => !ids.includes(id)));
}
module.exports = { normalizeOrder, orderTools, moveTool };
