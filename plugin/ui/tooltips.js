'use strict';
// Coordinates are relative to the panel, never the desktop or a scrolling section.
function placeTooltip(panel, anchor, requestedWidth, requestedHeight) {
  const margin = 6, gap = 5;
  const width = Math.max(0, Math.min(requestedWidth, panel.width - margin * 2));
  const height = Math.max(0, Math.min(requestedHeight, panel.height - margin * 2));
  const left = Math.max(margin, Math.min(anchor.left - panel.left + anchor.width / 2 - width / 2, panel.width - margin - width));
  const below = anchor.top - panel.top + anchor.height + gap;
  const above = anchor.top - panel.top - height - gap;
  const top = Math.max(margin, Math.min(below + height <= panel.height - margin ? below : above, panel.height - margin - height));
  return { left, top, width, height };
}
function createTooltips(doc, root, timers = { set: (fn, delay) => setTimeout(fn, delay), clear: id => clearTimeout(id) }) {
  const tip = doc.createElement('div'), title = doc.createElement('div'), body = doc.createElement('div');
  tip.setAttribute('id', 'pt-tooltip'); tip.setAttribute('role', 'tooltip'); tip.setAttribute('class', 'pt-tooltip'); tip.hidden = true;
  title.setAttribute('id', 'pt-tooltip-title'); title.setAttribute('class', 'pt-tooltip-title');
  body.setAttribute('id', 'pt-tooltip-body'); body.setAttribute('class', 'pt-tooltip-body');
  tip.appendChild(title); tip.appendChild(body); root.appendChild(tip);
  let current = null, pending = null, closing = null, overTip = false, disposed = false;
  const removers = [];
  function listen(node, event, fn) {
    node.addEventListener(event, fn);
    removers.push(() => node.removeEventListener(event, fn));
  }
  function clear(name) {
    if (name === 'pending' && pending !== null) { timers.clear(pending); pending = null; }
    if (name === 'closing' && closing !== null) { timers.clear(closing); closing = null; }
  }
  function dismiss() {
    const visible = !tip.hidden || pending !== null;
    clear('pending'); clear('closing');
    if (current) current.focusNode.removeAttribute('aria-describedby');
    current = null; overTip = false; tip.hidden = true;
    return visible;
  }
  function show(target) {
    clear('pending'); clear('closing');
    if (disposed || current !== target || (!target.hovered && !target.focused)) return;
    const content = target.read(), bounds = root.getBoundingClientRect();
    if (!content || !content.title || bounds.width <= 12 || bounds.height <= 12) { dismiss(); return; }
    title.textContent = content.title;
    body.textContent = content.body || ''; body.hidden = !content.body;
    tip.style.width = Math.min(270, bounds.width - 12) + 'px';
    tip.style.maxHeight = bounds.height - 12 + 'px';
    tip.hidden = false;
    const size = tip.getBoundingClientRect();
    const position = placeTooltip(bounds, target.node.getBoundingClientRect(), Math.min(270, bounds.width - 12), size.height);
    tip.style.left = position.left + 'px'; tip.style.top = position.top + 'px';
    target.focusNode.setAttribute('aria-describedby', 'pt-tooltip');
  }
  function request(target, immediate) {
    if (disposed) return;
    if (current !== target) { dismiss(); current = target; }
    clear('closing'); clear('pending');
    if (immediate || !tip.hidden) show(target);
    else pending = timers.set(() => { pending = null; show(target); }, 180);
  }
  function leave(target) {
    if (current !== target || target.hovered || target.focused || overTip) return;
    clear('pending'); clear('closing');
    closing = timers.set(() => { closing = null; if (current === target && !target.hovered && !target.focused && !overTip) dismiss(); }, 140);
  }
  listen(tip, 'mouseenter', () => { overTip = true; clear('closing'); });
  listen(tip, 'mouseleave', () => { overTip = false; if (current) leave(current); });
  const view = doc.defaultView || (typeof window !== 'undefined' ? window : null);
  if (view && typeof view.addEventListener === 'function') listen(view, 'resize', dismiss);
  if (view && typeof view.addEventListener === 'function') listen(view, 'blur', dismiss);
  listen(root, 'mouseleave', () => { if (!current || !current.focused) dismiss(); });
  return { dismiss,
    bind(node, read, focusNode = node) {
      const target = { node, read, focusNode, hovered: false, focused: false };
      listen(node, 'mouseenter', () => { target.hovered = true; request(target, false); });
      listen(node, 'mouseleave', () => { target.hovered = false; leave(target); });
      listen(focusNode, 'focus', () => { target.focused = true; request(target, true); });
      listen(focusNode, 'blur', () => { target.focused = false; leave(target); });
      listen(node, 'mousedown', dismiss);
    },
    destroy() { if (disposed) return; dismiss(); disposed = true; removers.forEach(remove => remove()); }
  };
}
module.exports = { createTooltips, placeTooltip };
