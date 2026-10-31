'use strict';
function setScroll(scroll, value) {
  const maximum = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
  scroll.scrollTop = Math.max(0, Math.min(maximum, value));
}
function scrollKey(scroll, event) {
  if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
  const tag = String(event.target && event.target.tagName || '').toLowerCase();
  if (['input', 'textarea', 'select'].includes(tag)) return;
  const page = Math.max(32, scroll.clientHeight * 0.85);
  if (event.key === 'PageDown' || event.key === 'PageUp') {
    setScroll(scroll, scroll.scrollTop + (event.key === 'PageDown' ? page : -page)); event.preventDefault();
  } else if (event.target === scroll && ['Home', 'End'].includes(event.key)) {
    setScroll(scroll, event.key === 'Home' ? 0 : scroll.scrollHeight); event.preventDefault();
  }
}
function revealTop(scroll, node) {
  const viewport = scroll.getBoundingClientRect(), target = node.getBoundingClientRect();
  if (viewport.height > 0 && Number.isFinite(scroll.scrollTop)) setScroll(scroll, scroll.scrollTop + target.top - viewport.top);
}
module.exports = { scrollKey, revealTop };
