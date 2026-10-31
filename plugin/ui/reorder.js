'use strict';
const { normalizeOrder, orderTools, moveTool } = require('../core/tool-order.js');
function createReorder(doc, tools, nodes, initialOrder, callbacks) {
  let order = normalizeOrder(initialOrder), active = false, picked = null, drag = null, drop = null, draggedClick = false;
  const removers = [];
  const group = id => (tools.find(tool => tool.id === id) || {}).group || 'Tools';
  function listen(node, type, fn) { node.addEventListener(type, fn); removers.push(() => node.removeEventListener(type, fn)); }
  function paint() {
    for (const tool of tools) {
      nodes[tool.id].setAttribute('data-picked', String(tool.id === picked));
      nodes[tool.id].setAttribute('data-drop', String(tool.id === drop));
      if (active) nodes[tool.id].setAttribute('aria-pressed', String(tool.id === picked)); else nodes[tool.id].removeAttribute('aria-pressed');
    }
    callbacks.state(active, picked);
  }
  function cancel() { picked = null; drag = null; drop = null; draggedClick = false; paint(); }
  function setActive(value) { active = value; cancel(); }
  function move(source, target) {
    if (source === target) return;
    const next = moveTool(tools, order, source, target);
    if (!next) return;
    order = next; picked = source; drop = null;
    callbacks.apply(orderTools(tools, order)); callbacks.save(order.slice()); paint();
    if (nodes[source].focus) nodes[source].focus();
  }
  function hit(event, source) {
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return null;
    for (const tool of tools) {
      if (nodes[tool.id].hidden || group(tool.id) !== group(source)) continue;
      const r = nodes[tool.id].getBoundingClientRect();
      if (event.clientX >= r.left && event.clientX <= r.left + r.width && event.clientY >= r.top && event.clientY <= r.top + r.height) return tool.id;
    }
    return null;
  }
  for (const tool of tools) {
    const node = nodes[tool.id];
    listen(node, 'mousedown', event => {
      if (!active || event.button && event.button !== 0) return;
      draggedClick = false;
      drag = Number.isFinite(event.clientX) && Number.isFinite(event.clientY) ? { id: tool.id, x: event.clientX, y: event.clientY, moved: false } : null;
    });
    listen(node, 'keydown', event => {
      if (!active) return;
      draggedClick = false;
      const direction = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : 0;
      if (!direction) return;
      event.preventDefault();
      const visible = orderTools(tools, order).filter(item => group(item.id) === group(tool.id) && !nodes[item.id].hidden);
      const target = visible[visible.findIndex(item => item.id === tool.id) + direction];
      if (target) move(tool.id, target.id);
    });
  }
  listen(doc, 'mousemove', event => {
    if (!active || !drag || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
    if (event.buttons === 0) { cancel(); return; }
    if (!drag.moved && Math.abs(event.clientX - drag.x) + Math.abs(event.clientY - drag.y) < 5) return;
    drag.moved = true; picked = drag.id;
    const next = hit(event, drag.id);
    if (drop !== next) { drop = next; paint(); }
    if (event.preventDefault) event.preventDefault();
  });
  listen(doc, 'mouseup', event => {
    if (!drag) return;
    const previous = drag; drag = null;
    if (previous.moved) { draggedClick = true; const target = hit(event, previous.id); if (target) move(previous.id, target); }
    drop = null; paint();
  });
  callbacks.apply(orderTools(tools, order)); paint();
  return { get active() { return active; }, order: () => order.slice(), setActive, cancel,
    activate(id, event) {
      if (!active) return false;
      if (event && event.key) draggedClick = false;
      if (draggedClick) return true;
      if (picked && picked !== id && group(picked) === group(id)) move(picked, id);
      else { picked = picked === id ? null : id; paint(); }
      return true;
    },
    reset() { order = []; cancel(); callbacks.apply(orderTools(tools, order)); callbacks.save([]); },
    escape() { if (!active) return false; if (drag) cancel(); else setActive(false); return true; },
    destroy() { active = false; drag = null; removers.forEach(remove => remove()); }
  };
}
module.exports = { createReorder };
