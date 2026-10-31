'use strict';
const assert = require('node:assert/strict');
const registry = require('../plugin/tools/index.js');
const { createHost } = require('../plugin/core/host.js');
const { createLayerService } = require('../plugin/tools/layers/service.js');
const { createRunner } = require('../plugin/core/runner.js');
function layerFixture(fail = {}) {
  const C = { LayerKind: { NORMAL: 'pixel', SMARTOBJECT: 'smart', GROUP: 'group', TEXT: 'text' }, ChannelType: { COMPONENT: 'component' },
    ElementPlacement: { PLACEBEFORE: 'before' }, DocumentMode: { RGB: 'RGB', GRAYSCALE: 'GRAY' }, BitsPerChannelType: { EIGHT: 8, SIXTEEN: 16 } };
  let serial = 10, data = new Map(), roots = [], active = [], snapshot, modalOptions;
  const events = [], descriptors = [], statuses = [], commits = [], originalChannel = { name: 'RGB', kind: C.ChannelType.COMPONENT };
  function siblings(parent) { return parent == null ? roots : data.get(parent).children; }
  function item(id) { const value = data.get(id); if (!value) throw new Error('The layer with an id of ' + id + ' does not exist.'); return value; }
  function wrapper(id) {
    return new Proxy({}, {
      get(_, key) {
        const value = item(id);
        if (key === 'layers') return value.children.map(wrapper);
        if (key === 'parent') return value.parent == null ? null : wrapper(value.parent);
        if (key === 'boundsNoEffects') return value.empty ? { left: 0, top: 0, right: 0, bottom: 0 } : { left: 0, top: 0, right: doc.width, bottom: doc.height };
        if (key === 'delete') return async () => { events.push('delete'); remove(id); };
        if (key === 'move') return async (target, placement) => {
          assert.equal(placement, C.ElementPlacement.PLACEBEFORE); events.push('move');
          const targetID = target.id, parent = item(targetID).parent;
          siblings(value.parent).splice(siblings(value.parent).indexOf(id), 1);
          value.parent = parent; siblings(parent).splice(siblings(parent).indexOf(targetID), 0, id);
        };
        return value[key];
      },
      set(_, key, value) {
        if (key === 'isClippingMask') {
          if (fail.clip) throw new Error('Injected clipping failure');
          const layer = item(id), list = siblings(layer.parent), index = list.indexOf(id);
          if (layer.isClippingMask && !value) for (let i = index - 1; i >= 0 && item(list[i]).isClippingMask; i--) item(list[i]).isClippingMask = false;
        }
        item(id)[key] = value; return true;
      }
    });
  }
  function add(name, kind = C.LayerKind.NORMAL, parent = null) {
    const id = ++serial;
    data.set(id, { id, name, kind, parent, children: [], visible: true, isClippingMask: false, hasUserMask: false, isBackgroundLayer: false });
    siblings(parent).unshift(id); return id;
  }
  function remove(id) { const layer = item(id); layer.children.slice().forEach(remove); siblings(layer.parent).splice(siblings(layer.parent).indexOf(id), 1); data.delete(id); active = active.filter(value => value !== id); }
  const doc = { id: 1, name: 'Untitled', path: '', width: 3168, height: 1782, mode: C.DocumentMode.RGB, bitsPerChannel: 8,
    quickMaskMode: false, componentChannels: [originalChannel], activeChannels: [originalChannel], channels: [originalChannel],
    get layers() { return roots.map(wrapper); }, get activeLayers() { return active.map(wrapper); }, set activeLayers(layers) { active = layers.map(layer => layer.id); },
    selection: { bounds: { left: 2, top: 4, right: 100, bottom: 80 }, mask: [0, 32, 190, 255],
      async save(name) { events.push('saveSelection'); const saved = { name, kind: 'alpha', bounds: this.bounds, mask: this.mask, async remove() { events.push('removeChannel'); doc.channels = doc.channels.filter(channel => channel !== saved); } }; doc.channels.push(saved); doc.activeChannels = [saved]; },
      async deselect() { events.push('deselect'); this.bounds = null; this.mask = null; },
      async load(channel) { events.push('loadSelection'); if (fail.restore) throw new Error('Injected selection restore failure'); this.bounds = channel.bounds; this.mask = channel.mask; }
    }
  };
  const original = add('Original'), other = add('Other'); active = [original];
  const app = { activeDocument: doc, documents: [doc], preferences: { general: { exportClipboard: false } } };
  const ctx = { isCancelled: false, hostControl: {
    async suspendHistory() { events.push('suspend'); snapshot = { data: structuredClone(data), roots: roots.slice(), active: active.slice(), channels: doc.channels.slice(), activeChannels: doc.activeChannels.slice(), bounds: doc.selection.bounds, mask: doc.selection.mask }; return 1; },
    async resumeHistory(_, commit) { commits.push(commit); if (!commit) { data = snapshot.data; roots = snapshot.roots; active = snapshot.active; doc.channels = snapshot.channels; doc.activeChannels = snapshot.activeChannels; doc.selection.bounds = snapshot.bounds; doc.selection.mask = snapshot.mask; } }
  } };
  const ps = { app, constants: C, core: { async executeAsModal(work, options) { modalOptions = options; if (fail.onModal) fail.onModal({ doc, app, select: ids => { active = ids; } }); return work(ctx); } },
    action: { async batchPlay(commands) {
      assert.equal(commands.length, 1); const c = commands[0]; descriptors.push(c); events.push(c._obj);
      if (fail.action === c._obj) return [{ _obj: 'error', result: fail.code || -1, message: 'Injected native failure' }];
      if (c._obj === 'get' && c._target[0]._property === 'targetLayersIDs') return [{ targetLayersIDs: fail.layerRefs || active.map(id => ({ _ref: 'layer', _id: id })) }];
      if (c._obj === 'get') { assert.equal(c._target[0]._property, 'hasUserMask'); return [{ hasUserMask: item(c._target[1]._id).hasUserMask }]; }
      if (c._obj === 'select') {
        if (c._target[0]._ref === 'layer') { item(c._target[0]._id); active = [c._target[0]._id]; }
        else doc.activeChannels = [{ name: 'Mask', kind: 'mask' }];
      } else if (c._obj === 'make' && c.new) {
        assert.equal(c.using._value, 'hideAll'); item(active[0]).hasUserMask = true; item(active[0]).mask = 'black';
      } else if (c._obj === 'make') {
        const target = active[0], before = target && item(target), type = c._target[0]._ref;
        const kind = type === 'adjustmentLayer' ? c.using.type._obj : type === 'contentLayer' ? 'fill' : C.LayerKind.NORMAL;
        const parent = before ? before.kind === C.LayerKind.GROUP ? before.id : before.parent : null;
        const id = add(c.using.name, kind, parent);
        if (type === 'layer') item(id).empty = true;
        else {
          item(id).isClippingMask = before ? before.isClippingMask : false;
          item(id).type = c.using.type;
          if (before && before.kind !== C.LayerKind.GROUP) { siblings(parent).splice(0, 1); siblings(parent).splice(siblings(parent).indexOf(target), 0, id); }
        }
        active = [id];
      } else if (c._obj === 'mergeVisible') {
        assert.equal(c.duplicate, true); assert.equal(doc.selection.bounds, null);
        const composition = [...data.values()].filter(layer => layer.visible && !layer.empty).map(layer => layer.id);
        remove(active[0]); const id = add('Composite'); item(id).composition = composition; active = [id];
      } else if (c._obj === 'invert') {
        assert.equal(doc.activeChannels[0].kind, 'mask'); assert.equal(doc.selection.bounds, null);
        const layer = item(active[0]); assert.equal(layer.hasUserMask, true);
        layer.mask = Array.isArray(layer.mask) ? layer.mask.map(value => 255 - value) : layer.mask === 'black' ? 'white' : 'black';
      } else if (c._obj === 'newPlacedLayer') {
        assert.equal(doc.selection.bounds, null); const embedded = active.map(id => structuredClone(item(id)));
        const target = active[0], parent = item(target).parent, index = siblings(parent).indexOf(target);
        active.slice().forEach(id => { if (data.has(id)) remove(id); });
        const id = add('Smart', C.LayerKind.SMARTOBJECT, parent); siblings(parent).splice(0, 1); siblings(parent).splice(index, 0, id); item(id).embedded = embedded; active = [id];
      } else if (c._obj === 'Adobe Camera Raw Filter') {
        assert.equal(c._options.dialogOptions, 'display'); assert.equal(modalOptions.interactive, true);
        assert.equal(item(active[0]).kind, C.LayerKind.SMARTOBJECT); item(active[0]).cameraRaw = true;
      } else if (c._obj === 'showColorPicker') {
        assert.equal(c._options.dialogOptions, 'display'); assert.equal(modalOptions.interactive, true);
        return [fail.picker || { value: true, RGBFloatColor: { red: 10.25, grain: 128.75, blue: 250.5 } }];
      } else throw new Error('Unexpected action: ' + c._obj);
      return [{}];
    } }
  };
  const host = createHost(ps, { photoshop: '28.0.1' });
  const services = { host, layers: createLayerService(host) };
  const runner = createRunner(registry, job => ({ ...job, services }), (...s) => statuses.push(s), 'test');
  return { doc, app, C, ctx, events, descriptors, commits, statuses, original, other, add,
    get data() { return data; }, get active() { return active; }, get modalOptions() { return modalOptions; }, select(ids) { active = ids; },
    run: id => runner.run(id, {}), layer: wrapper };
}
module.exports = { layerFixture };
