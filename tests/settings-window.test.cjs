'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { createSettingsWindow } = require('../plugin/ui/settings-window.js');
const { createFocus } = require('../plugin/ui/focus.js');
const { makeDocument } = require('./ui-fixture.cjs');
function fixture() {
  const doc = makeDocument(), dialog = doc.createElement('dialog'), root = doc.createElement('div'), content = doc.createElement('div'), trigger = doc.createElement('div'), mounts = [], closes = [], errors = [];
  dialog.appendChild(root); root.appendChild(content); let destroyed = 0;
  const viewport = { mount: node => mounts.push(node), report: () => ({ height: 500 }), destroy: () => destroyed++ };
  const window = createSettingsWindow(dialog, content, trigger, viewport, { closed: reason => closes.push(reason), error: error => errors.push(error) });
  return { doc, dialog, root, content, trigger, mounts, closes, errors, window, destroyed: () => destroyed };
}
test('settings uses one resizable native window, reuses content and resets expanded state on close', async () => {
  const f = fixture(); f.content.draft = 'unfinished'; f.window.open(); f.window.open();
  assert.equal(f.dialog.dialogOpens, 1); assert.equal(f.window.isOpen(), true); assert.equal(f.content.hidden, false); assert.equal(f.trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(f.dialog.dialogOptions.resize, 'both'); assert.deepEqual(f.dialog.dialogOptions.minSize, { width: 300, height: 260 }); assert.equal(f.mounts[0], f.root);
  f.window.close(); assert.equal(f.content.hidden, true); assert.equal(f.trigger.getAttribute('aria-expanded'), 'false');
  f.window.open(); assert.equal(f.dialog.dialogOpens, 2); assert.equal(f.content.draft, 'unfinished');
  await Promise.resolve(); assert.equal(f.window.isOpen(), true, 'Old close completion cannot close the newer window');
  f.dialog.close('reasonCanceled'); await Promise.resolve(); assert.equal(f.window.isOpen(), false); assert.equal(f.closes.at(-1), 'reasonCanceled');
  f.window.destroy(); assert.equal(f.destroyed(), 1);
});
test('native open failures preserve original errors and do not leave empty/stuck windows', async () => {
  const f = fixture(), primary = Object.assign(new Error('Native dialog failed'), { number: -123 });
  f.dialog.uxpShowModal = () => Promise.reject(primary); f.window.open(); await Promise.resolve();
  assert.equal(f.errors[0], primary); assert.equal(f.window.isOpen(), false); assert.equal(f.content.hidden, true); assert.match(f.window.report().error, /Native dialog failed/);
  const missing = fixture(); missing.dialog.uxpShowModal = null; missing.window.open(); assert.equal(missing.window.isOpen(), false); assert.match(missing.errors[0].message, /UXP runtime/);
  f.window.destroy(); missing.window.destroy();
});
test('destroy closes the owned window and ignores late native completion/errors', async () => {
  const f = fixture(); f.window.open(); const reject = f.dialog.rejectDialog;
  f.window.destroy(); reject(new Error('Late error')); await Promise.resolve(); f.window.open();
  assert.equal(f.window.isOpen(), false); assert.equal(f.dialog.open, false); assert.equal(f.dialog.dialogOpens, 1); assert.deepEqual(f.errors, []);
});
test('pointer focus has no square ring; keyboard focus remains visible and all listeners are released', async () => {
  const doc = makeDocument(), node = doc.createElement('div'), focus = createFocus(doc); focus.bind(node);
  await node.fire('mousedown'); await node.fire('focus'); assert.equal(node.getAttribute('data-keyboard-focus'), null);
  await doc.fire('keydown', { key: 'Tab' }); await node.fire('focus'); assert.equal(node.getAttribute('data-keyboard-focus'), 'true');
  await node.fire('mousedown'); assert.equal(node.getAttribute('data-keyboard-focus'), null);
  await node.fire('keydown', { key: 'Enter' }); assert.equal(node.getAttribute('data-keyboard-focus'), 'true'); await node.fire('blur'); assert.equal(node.getAttribute('data-keyboard-focus'), null);
  focus.destroy(); assert.equal(node.listeners.focus.length, 0); assert.equal(node.listeners.mousedown.length, 0);
});
