'use strict';
function createSettingsWindow(dialog, content, trigger, viewport, callbacks = {}) {
  let opened = false, disposed = false, revision = 0;
  const state = { opens: 0, closes: 0, error: null };
  function finish(token, reason) {
    if (token !== revision || !opened) return;
    opened = false; content.hidden = true; trigger.setAttribute('aria-expanded', 'false'); state.closes++;
    if (callbacks.closed && !disposed) try { callbacks.closed(reason); } catch (error) { state.error = String(error && error.message || error); if (callbacks.error) callbacks.error(error); }
  }
  function failure(error, token) {
    if (token !== revision || !opened) return;
    state.error = String(error && error.message || error);
    if (opened) try { dialog.close('error'); } catch (_) {}
    finish(token, 'error');
    if (callbacks.error && !disposed) callbacks.error(error);
  }
  return {
    isOpen: () => opened,
    open() {
      if (opened || disposed) return;
      const token = ++revision; opened = true; content.hidden = false; state.error = null; trigger.setAttribute('aria-expanded', 'true');
      try {
        if (typeof dialog.uxpShowModal !== 'function') throw new Error('Photoshop cannot open the settings window in this UXP runtime.');
        if (callbacks.opening) callbacks.opening();
        const pending = dialog.uxpShowModal({ title: 'Photoshop Tool · Settings', resize: 'both', size: { width: 420, height: 560 }, minSize: { width: 300, height: 260 }, maxSize: { width: 1200, height: 1200 } });
        state.opens++; viewport.mount(dialog.children[0]);
        Promise.resolve(pending).then(reason => finish(token, reason), error => failure(error, token));
      } catch (error) { failure(error, token); }
    },
    close() {
      if (!opened) return;
      const token = revision;
      try { dialog.close('close'); finish(token, 'close'); } catch (error) { failure(error, token); }
    },
    report: () => ({ ...state, open: opened, layout: viewport.report() }),
    destroy() { disposed = true; if (opened) try { dialog.close('destroy'); } catch (_) {} finish(revision); revision++; viewport.destroy(); }
  };
}
module.exports = { createSettingsWindow };
