'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { scrollKey, revealTop } = require('../plugin/ui/scroll.js');
test('paging and Home/End reach overflow in a short viewport without changing input editing', () => {
  const scroll = { scrollTop: 0, scrollHeight: 600, clientHeight: 60 };
  let prevented = 0; const key = (value, target = scroll) => scrollKey(scroll, { key: value, target, preventDefault() { prevented++; } });
  key('PageDown'); assert.equal(scroll.scrollTop, 51); key('End'); assert.equal(scroll.scrollTop, 540);
  key('PageDown'); assert.equal(scroll.scrollTop, 540); key('Home'); assert.equal(scroll.scrollTop, 0);
  key('PageUp'); assert.equal(scroll.scrollTop, 0); const count = prevented;
  key('End', { tagName: 'INPUT' }); key('PageDown', { tagName: 'INPUT' }); assert.equal(scroll.scrollTop, 0); assert.equal(prevented, count);
});
test('opening Settings reveals its top and clamps to the available scroll range', () => {
  const scroll = { scrollTop: 20, scrollHeight: 600, clientHeight: 100, getBoundingClientRect: () => ({ top: 8, height: 100 }) };
  revealTop(scroll, { getBoundingClientRect: () => ({ top: 208 }) }); assert.equal(scroll.scrollTop, 220);
  revealTop(scroll, { getBoundingClientRect: () => ({ top: 1000 }) }); assert.equal(scroll.scrollTop, 500);
});
