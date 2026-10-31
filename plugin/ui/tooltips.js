'use strict';
// Coordinates are relative to the panel, never the desktop or a scrolling section.
function placeTooltip(panel, anchor, requestedWidth, requestedHeight) {
  const margin = 6, gap = 5;
  const width = Math.max(0, Math.min(requestedWidth, panel.width - margin * 2));
  const bottom = anchor.top - panel.top + anchor.height + gap;
  const aboveSpace = Math.max(0, anchor.top - panel.top - gap - margin);
  const belowSpace = Math.max(0, panel.height - margin - bottom);
  const below = requestedHeight <= belowSpace || (requestedHeight > aboveSpace && belowSpace >= aboveSpace);
  const maxHeight = below ? belowSpace : aboveSpace;
  const height = Math.max(0, Math.min(requestedHeight, maxHeight));
  const left = Math.max(margin, Math.min(anchor.left - panel.left + anchor.width / 2 - width / 2, panel.width - margin - width));
  const top = Math.max(margin, below ? bottom : anchor.top - panel.top - height - gap);
  return { left, top, width, height, maxHeight };
}
function createTooltips(doc, root, timers = { set: (fn, delay) => setTimeout(fn, delay), clear: id => clearTimeout(id) }) {
  const tip = doc.createElement('div'), title = doc.createElement('div'), body = doc.createElement('div');
  tip.setAttribute('id', 'pt-tooltip'); tip.setAttribute('role', 'tooltip'); tip.setAttribute('class', 'pt-tooltip'); tip.hidden = true;
  title.setAttribute('id', 'pt-tooltip-title'); title.setAttribute('class', 'pt-tooltip-title');
  body.setAttribute('id', 'pt-tooltip-body'); body.setAttribute('class', 'pt-tooltip-body');
  tip.appendChild(title); tip.appendChild(body); root.appendChild(tip);
  let current = null, pending = null, closing = null, overTip = false, disposed = false, enabled = true, pointer = null, layoutKey = null, geometry = null;
  const stats = { shown: 0, dismissed: 0, lastDismiss: null };
  const removers = [];
  function listen(node, event, fn) {
    node.addEventListener(event, fn);
    removers.push(() => node.removeEventListener(event, fn));
  }
  function clear(name) {
    if (name === 'pending' && pending !== null) { timers.clear(pending); pending = null; }
    if (name === 'closing' && closing !== null) { timers.clear(closing); closing = null; }
  }
  function dismiss(reason = 'explicit') {
    const visible = !tip.hidden || pending !== null;
    clear('pending'); clear('closing');
    if (current) current.focusNode.removeAttribute('aria-describedby');
    if (visible) { stats.dismissed++; stats.lastDismiss = typeof reason === 'string' ? reason : 'explicit'; }
    current = null; overTip = false; geometry = null; tip.hidden = true;
    return visible;
  }
  function show(target, layoutOnly = false) {
    if (disposed || !enabled || current !== target || (!target.hovered && !target.focused && !overTip)) return;
    const content = target.read(), bounds = root.getBoundingClientRect();
    if (!content || !content.title || bounds.width <= 12 || bounds.height <= 12) { dismiss(); return; }
    const anchor = target.node.getBoundingClientRect();
    if (anchor.top + anchor.height <= bounds.top || anchor.top >= bounds.top + bounds.height) { dismiss('anchor-outside'); return; }
    const key = [bounds.left, bounds.top, bounds.width, bounds.height, anchor.left, anchor.top, anchor.width, anchor.height].join(':');
    if (layoutOnly && key === layoutKey) return; layoutKey = key;
    title.textContent = content.title;
    body.textContent = content.body || ''; body.hidden = !content.body;
    tip.style.width = Math.min(270, bounds.width - 12) + 'px';
    const available = placeTooltip(bounds, anchor, Math.min(270, bounds.width - 12), bounds.height).maxHeight;
    tip.style.maxHeight = Math.max(0, available) + 'px';
    tip.hidden = false;
    const size = tip.getBoundingClientRect();
    const position = placeTooltip(bounds, anchor, Math.min(270, bounds.width - 12), size.height > 0 ? size.height : available);
    tip.style.left = position.left + 'px'; tip.style.top = position.top + 'px';
    target.focusNode.setAttribute('aria-describedby', 'pt-tooltip');
    geometry = { anchor, root: bounds, tip: { left: bounds.left + position.left, top: bounds.top + position.top, width: position.width, height: position.height } };
    stats.shown++;
  }
  function request(target, immediate) {
    if (disposed || !enabled) return;
    if (current !== target) { dismiss(); current = target; }
    clear('closing'); clear('pending');
    if (immediate || !tip.hidden) show(target);
    else pending = timers.set(() => { pending = null; show(target); }, 180);
  }
  function leave(target) {
    if (current !== target || target.hovered || target.focused || overTip) return;
    clear('pending'); clear('closing');
    closing = timers.set(() => {
      closing = null;
      if (current === target && !target.hovered && !target.focused && !overTip && !inside(pointer, target.node) && !inside(pointer, tip)) dismiss('pointer-left');
    }, 200);
  }
  function inside(point, node) {
    if (!point || node.hidden) return false;
    const r = geometry && (node === tip ? geometry.tip : node === root ? geometry.root : current && node === current.node ? geometry.anchor : null) || node.getBoundingClientRect();
    return point.x >= r.left && point.x <= r.left + r.width && point.y >= r.top && point.y <= r.top + r.height;
  }
  function track(event) {
    if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) pointer = { x: event.clientX, y: event.clientY };
  }
  function contains(node, child) { for (let value = child; value; value = value.parentNode) if (value === node) return true; return false; }
  function relayout() { if (current && !tip.hidden) show(current, true); }
  listen(tip, 'mouseenter', event => { track(event); overTip = true; clear('closing'); });
  listen(tip, 'mouseleave', event => { track(event); if (!Number.isFinite(event.clientX)) pointer = null; overTip = false; if (current) leave(current); });
  const view = doc.defaultView || (typeof window !== 'undefined' ? window : null);
  // UXP can emit child blur/resize during layout. They are not a panel dismissal.
  if (view && typeof view.addEventListener === 'function') listen(view, 'resize', event => { if (!event || !event.target || event.target === view) relayout(); });
  listen(root, 'mousemove', event => {
    track(event);
    if (!current || current.focused) return;
    if (inside(pointer, current.node) || inside(pointer, tip)) clear('closing');
    else { current.hovered = false; overTip = false; leave(current); }
  });
  listen(root, 'mouseleave', event => {
    track(event);
    if (current && !current.focused && !contains(root, event.relatedTarget) && !inside(pointer, root)) { current.hovered = false; overTip = false; leave(current); }
  });
  return { dismiss, relayout, report: () => ({ ...stats, open: !tip.hidden }),
    enable(value) { enabled = value; if (!value) dismiss('disabled'); },
    bind(node, read, focusNode = node) {
      const target = { node, read, focusNode, hovered: false, focused: false };
      listen(node, 'mouseenter', event => { track(event); target.hovered = true; request(target, false); });
      listen(node, 'mouseleave', event => { track(event); target.hovered = false; if (!event || !Number.isFinite(event.clientX)) pointer = null; if (contains(tip, event.relatedTarget)) { overTip = true; clear('closing'); } else leave(target); });
      listen(focusNode, 'focus', () => { target.focused = true; request(target, true); });
      listen(focusNode, 'blur', () => { target.focused = false; leave(target); });
      listen(node, 'mousedown', dismiss);
    },
    destroy() { if (disposed) return; dismiss(); disposed = true; removers.forEach(remove => remove()); }
  };
}
module.exports = { createTooltips, placeTooltip };
