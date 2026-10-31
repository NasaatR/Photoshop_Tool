'use strict';
function viewportHeight(hostHeight, footerHeight = 19) {
  if (!Number.isFinite(hostHeight) || hostHeight <= 0) return null;
  return Math.max(32, Math.floor(hostHeight - 16 - Math.max(19, footerHeight)));
}
function createViewport(doc, scroll, footer, environment = {}) {
  const view = doc.defaultView || (typeof window !== 'undefined' ? window : null);
  const Observer = environment.Observer || (view && view.ResizeObserver) || (typeof ResizeObserver === 'function' ? ResizeObserver : null);
  const timers = environment.timers || { set: fn => setTimeout(fn, 16), clear: id => clearTimeout(id) };
  let host = null, observer = null, pending = null, disposed = false, listening = false;
  const state = { mode: 'normal-flow', hostHeight: null, height: null, observing: false, warning: null };
  function sync(hint) {
    if (disposed || !host) return;
    try {
      const client = host.clientHeight;
      const height = Number.isFinite(hint) && hint > 0 ? hint : Number.isFinite(client) && client > 0 ? client : host.getBoundingClientRect().height;
      const footerHeight = footer.getBoundingClientRect().height;
      const next = viewportHeight(height, Number.isFinite(footerHeight) ? footerHeight : 19);
      // A hidden/not-yet-mounted host must never collapse the content to zero.
      if (next === null) return;
      state.hostHeight = height;
      if (next === state.height) return;
      scroll.style.height = next + 'px'; scroll.style.flex = '0 0 auto';
      state.height = next; state.mode = 'measured-normal-flow';
    } catch (error) { state.warning = 'Panel measurement: ' + String(error && error.message || error); }
  }
  function stop() {
    if (pending !== null) { timers.clear(pending); pending = null; }
    if (observer) { observer.disconnect(); observer = null; state.observing = false; }
    if (listening) { view.removeEventListener('resize', sync); listening = false; }
  }
  return {
    mount(element) {
      if (disposed) return;
      if (host !== element) {
        stop(); host = element;
        if (view && typeof view.addEventListener === 'function') { view.addEventListener('resize', sync); listening = true; }
        if (Observer) {
          try {
            observer = new Observer(entries => { const entry = Array.from(entries).find(item => item.target === host); if (entry) sync(entry.contentRect && entry.contentRect.height); });
            observer.observe(host); state.observing = true;
          } catch (error) { state.warning = 'Panel resize observer: ' + String(error && error.message || error); if (observer) observer.disconnect(); observer = null; }
        }
      }
      sync();
      if (pending !== null) timers.clear(pending);
      pending = timers.set(() => { pending = null; sync(); });
    },
    report: () => ({ ...state }),
    destroy() { disposed = true; stop(); host = null; }
  };
}
module.exports = { viewportHeight, createViewport };
