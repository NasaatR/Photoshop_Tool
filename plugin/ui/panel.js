'use strict';
const CSS = require('./styles.js');
const { icon } = require('./icons.js');
function createPanel(doc, tools, draft, appearanceDraft, visibilityDraft, handlers, version) {
  const elements = {}, controls = {}, toolNodes = {}, choices = {};
  let appearance = { ...appearanceDraft }, visibility = { ...visibilityDraft };
  let statusText = null, statusState = null, externalState = null;
  function make(tag, text, attrs) {
    const el = doc.createElement(tag);
    if (text != null) el.textContent = text;
    for (const [key, value] of Object.entries(attrs || {})) el.setAttribute(key, value);
    if (attrs && attrs.id) elements[attrs.id] = el;
    return el;
  }
  const append = (parent, nodes) => { nodes.forEach(node => parent.appendChild(node)); return parent; };
  function control(id, label, callback, className, title) {
    let disabled = false, spaceDown = false;
    const el = make('div', null, { id, role: 'button', tabindex: '0', 'aria-label': title || label, 'aria-disabled': 'false' });
    el.className = 'pt-control ' + (className || '');
    if (title) el.setAttribute('title', title);
    if (label) el.appendChild(make('span', label));
    const activate = () => { if (!disabled) return callback(); };
    el.addEventListener('click', activate);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); if (!e.repeat) return activate(); }
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); spaceDown = !disabled; }
    });
    el.addEventListener('keyup', e => { if ((e.key === ' ' || e.key === 'Spacebar') && spaceDown) { e.preventDefault(); spaceDown = false; return activate(); } });
    el.addEventListener('blur', () => { spaceDown = false; });
    controls[id] = value => {
      if (disabled === value) return;
      disabled = value; spaceDown = false;
      el.setAttribute('aria-disabled', String(value)); el.setAttribute('tabindex', value ? '-1' : '0');
    };
    return el;
  }
  const root = make('div', null, { id: 'photoshoptool' }); root.appendChild(make('style', CSS));
  const scroll = make('div', null, { class: 'pt-scroll' }); root.appendChild(scroll);
  const toolbar = make('div', null, { class: 'pt-toolbar' }), actions = make('div', null, { class: 'pt-actions' });
  tools.forEach(tool => {
    const node = control(tool.id, null, () => handlers.run(tool.id), 'pt-action', tool.description || tool.title);
    append(node, [icon(doc, tool.icon), make('span', tool.label, { class: 'pt-caption' })]); toolNodes[tool.id] = node; actions.appendChild(node);
  });
  toolbar.appendChild(actions);
  const utilities = make('div', null, { class: 'pt-tools' });
  const labelToggle = control('labels', null, () => applyAppearance({ labels: !appearance.labels }), 'pt-small', 'Show button labels'); labelToggle.appendChild(icon(doc, 'labels'));
  const options = make('div', null, { id: 'options' }); options.hidden = true;
  const gear = control('settings', null, () => setOptions(options.hidden), 'pt-small', 'Options'); gear.appendChild(icon(doc, 'settings'));
  gear.setAttribute('aria-expanded', 'false'); gear.setAttribute('aria-controls', 'options');
  append(utilities, [labelToggle, gear]); toolbar.appendChild(utilities); scroll.appendChild(toolbar);
  const status = control('status', null, () => {
    details.hidden = !details.hidden; status.setAttribute('aria-expanded', String(!details.hidden));
  }, 'pt-status', 'Show operation details');
  status.className = 'pt-status'; status.appendChild(make('span', 'Ready', { id: 'statusText', class: 'pt-status-text', role: 'status', 'aria-live': 'polite' }));
  const details = make('div', '', { id: 'details', class: 'pt-detail' }); details.hidden = true;
  const statusRow = make('div', null, { class: 'pt-status-row' });
  const copyLog = control('copyReport', null, handlers.copyReport, 'pt-small', 'Copy diagnostic report to clipboard'); copyLog.appendChild(icon(doc, 'copy'));
  append(statusRow, [status, copyLog]);
  append(scroll, [statusRow, details, make('p', '', { id: 'reportStatus', class: 'pt-hint', role: 'status', 'aria-live': 'polite' })]); elements.reportStatus.hidden = true;
  const external = control('external', 'Enable external paste', handlers.external, 'pt-text', 'Enable Photoshop Export Clipboard'); external.hidden = true;
  append(scroll, [external, options]);
  function heading(text) { options.appendChild(make('div', text, { class: 'pt-heading' })); }
  function checkbox(id, text, checked, change) {
    const input = make('input', null, { id, type: 'checkbox' }); input.checked = checked;
    input.addEventListener('change', change);
    return append(make('label'), [input, make('span', text)]);
  }
  heading('Export');
  options.appendChild(checkbox('overwrite', 'Replace existing PNG', draft.overwrite, handlers.changed));
  options.appendChild(checkbox('srgb', 'Convert copy to sRGB', draft.srgb, handlers.changed));
  const compression = make('input', null, { id: 'compression', type: 'number', min: '0', max: '9', 'aria-label': 'PNG compression, zero to nine' }); compression.value = String(draft.compression);
  compression.addEventListener('input', handlers.draft); compression.addEventListener('change', handlers.changed);
  options.appendChild(append(make('label'), [make('span', 'Compression'), compression]));
  options.appendChild(make('p', '0 = faster · 9 = smaller. Always lossless.', { class: 'pt-hint' }));
  heading('Tool buttons');
  tools.forEach(tool => options.appendChild(checkbox('visible-' + tool.id, tool.title, isVisible(tool), () => {
    visibility[tool.id] = elements['visible-' + tool.id].checked; updateVisibility(); handlers.visibility({ ...visibility });
  })));
  heading('Appearance');
  function group(field, values) {
    const row = make('div', null, { class: 'pt-choice-group', role: 'group', 'aria-label': field });
    values.forEach(([value, label]) => { const id = field + '-' + value; const node = control(id, label, () => applyAppearance({ [field]: value }), 'pt-choice', label); choices[id] = { node, field, value }; row.appendChild(node); });
    options.appendChild(row);
  }
  group('size', [['compact', 'Compact'], ['roomy', 'Roomy']]); group('corners', [['square', 'Square'], ['soft', 'Soft']]); group('theme', [['host', 'Photoshop'], ['dark', 'Dark'], ['light', 'Light']]);
  const help = make('div', null, { id: 'help' }); help.hidden = true;
  const helpButton = control('helpToggle', 'Help & report', () => { help.hidden = !help.hidden; helpButton.setAttribute('aria-expanded', String(!help.hidden)); }, 'pt-text', 'Help and diagnostics'); helpButton.setAttribute('aria-expanded', 'false');
  append(options, [helpButton, help]);
  [
    'Photoshop Tool ' + version + ' · Made by Nasaat',
    'PNG + Copy exports the full canvas beside the PSD. Smart Object extracts one selected pixel layer and leaves its contents open.',
    'PNG only keeps the clipboard unchanged. Copy only writes no PNG and works without a saved PSD.',
    'Full resolution · RGB / Grayscale · 8 / 16 bit. The source PSD is not automatically saved.',
    'PNG files go beside the project automatically. Native image paste depends on the receiving application.',
    'Copy report replaces the clipboard with diagnostic text. Reports contain filenames, the last eight operations and recent session events. Nothing is sent automatically.'
  ].forEach(text => help.appendChild(make('p', text, { class: 'pt-hint' })));
  help.appendChild(control('copyReportHelp', 'Copy report', handlers.copyReport, 'pt-text', 'Copy a text report for sharing'));
  help.appendChild(control('report', 'Save report .txt', handlers.report, 'pt-text', 'Save a local text report'));
  root.appendChild(make('div', 'Made by Nasaat', { class: 'pt-footer' }));
  root.addEventListener('keydown', e => { if (e.key === 'Escape' && !options.hidden) { e.preventDefault(); setOptions(false); if (gear.focus) gear.focus(); } });
  function setOptions(open) { options.hidden = !open; gear.setAttribute('aria-expanded', String(open)); }
  function isVisible(tool) { return typeof visibility[tool.id] === 'boolean' ? visibility[tool.id] : tool.defaultVisible !== false; }
  function updateVisibility() { tools.forEach(tool => { toolNodes[tool.id].hidden = !isVisible(tool); }); }
  function applyAppearance(patch, initial) {
    appearance = { ...appearance, ...patch };
    root.className = 'pt-root pt-' + appearance.theme + (appearance.labels ? ' pt-labels' : '') + (appearance.size === 'roomy' ? ' pt-roomy' : '') + (appearance.corners === 'soft' ? ' pt-soft' : '');
    labelToggle.setAttribute('aria-pressed', String(appearance.labels)); labelToggle.setAttribute('title', appearance.labels ? 'Hide button labels' : 'Show button labels');
    labelToggle.setAttribute('aria-label', appearance.labels ? 'Hide button labels' : 'Show button labels');
    for (const choice of Object.values(choices)) choice.node.setAttribute('aria-pressed', String(appearance[choice.field] === choice.value));
    if (!initial) handlers.appearance({ ...appearance });
  }
  updateVisibility(); applyAppearance({}, true);
  return { root, elements, appearance: () => ({ ...appearance }), visibility: () => ({ ...visibility }),
    values: () => ({ overwrite: elements.overwrite.checked, srgb: elements.srgb.checked, compression: String(compression.value) }),
    reportStatus(text) { elements.reportStatus.textContent = text; elements.reportStatus.hidden = !text; },
    status(text, state, needsExternal) {
      if (text !== statusText || state !== statusState) {
        statusText = text; statusState = state; elements.statusText.textContent = String(text).split('\n')[0];
        elements.reportStatus.hidden = true;
        details.textContent = text; status.setAttribute('title', text); status.setAttribute('data-state', state);
        if (state === 'error') details.hidden = false;
        status.setAttribute('aria-expanded', String(!details.hidden));
      }
      if (needsExternal !== externalState) { external.hidden = !needsExternal; externalState = needsExternal; }
    },
    disable(value) {
      [...tools.map(t => t.id), 'external', 'report', 'copyReport', 'copyReportHelp'].forEach(id => controls[id](value));
      for (const id of ['overwrite', 'srgb', 'compression']) if (elements[id].disabled !== value) elements[id].disabled = value;
    }
  };
}
module.exports = { createPanel };
