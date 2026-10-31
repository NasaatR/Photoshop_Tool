'use strict';
class Element {
  constructor(tag, doc) { this.tagName = tag; this.ownerDocument = doc; this.children = []; this.attributes = {}; this.listeners = {}; this.style = {}; this.hidden = false; this.parentNode = null; this.textContent = ''; }
  set textContent(v) { this._text = String(v); this.writes = (this.writes || 0) + 1; } get textContent() { return this._text; }
  setAttribute(k, v) { this.attributes[k] = String(v); if (k === 'id') this.id = v; }
  getAttribute(k) { return this.attributes[k] ?? null; }
  removeAttribute(k) { delete this.attributes[k]; }
  removeEventListener(k, fn) { this.listeners[k] = (this.listeners[k] || []).filter(listener => listener !== fn); }
  getBoundingClientRect() { return this.rect || { left: 0, top: 0, width: this.id === 'photoshoptool' ? 240 : 100, height: this.id === 'photoshoptool' ? 350 : 60 }; }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); this.children.push(c); c.parentNode = this; return c; }
  removeChild(c) { this.children.splice(this.children.indexOf(c), 1); c.parentNode = null; }
  addEventListener(k, fn) { (this.listeners[k] ||= []).push(fn); }
  async fire(k, event = {}) { event.preventDefault ||= () => {}; for (const fn of this.listeners[k] || []) await fn(event); }
  set innerHTML(_) { throw new Error('HTML injection'); }
}
const makeDocument = () => { const d = { createElement: tag => new Element(tag, d), createElementNS: (_, tag) => new Element(tag, d) }; return d; };
module.exports = { Element, makeDocument };
