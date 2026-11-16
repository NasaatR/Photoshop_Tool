'use strict';
function createFocus(doc) {
  let keyboard = false, disposed = false;
  const nodes = new Set(), removers = [];
  function listen(node, event, callback) { node.addEventListener(event, callback); removers.push(() => node.removeEventListener(event, callback)); }
  function clear() { for (const node of nodes) node.removeAttribute('data-keyboard-focus'); }
  function pointer() { keyboard = false; clear(); }
  function key(event) { if (['Tab', 'Enter', ' ', 'Spacebar', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) keyboard = true; }
  listen(doc, 'keydown', key); listen(doc, 'mousedown', pointer);
  return { clear, key, keyboard: () => keyboard,
    bind(node) {
      nodes.add(node); listen(node, 'mousedown', pointer);
      listen(node, 'keydown', event => { key(event); if (keyboard) node.setAttribute('data-keyboard-focus', 'true'); });
      listen(node, 'focus', () => { if (!disposed && keyboard) node.setAttribute('data-keyboard-focus', 'true'); else node.removeAttribute('data-keyboard-focus'); });
      listen(node, 'blur', () => node.removeAttribute('data-keyboard-focus'));
    },
    destroy() { disposed = true; clear(); removers.splice(0).forEach(remove => remove()); nodes.clear(); }
  };
}
module.exports = { createFocus };
