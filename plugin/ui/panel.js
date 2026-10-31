'use strict';
const CSS = require('./styles.js');
const { icon } = require('./icons.js');
const { createTooltips } = require('./tooltips.js');
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
  function control(id, label, callback, className, title, description) {
    let disabled = false, spaceDown = false;
    const el = make('div', null, { id, role: 'button', tabindex: '0', 'aria-label': title || label, 'aria-disabled': 'false' });
    el.className = 'pt-control ' + (className || '');
    if (description) el.setAttribute('data-hint', description);
    hints.bind(el, () => ({ title: el.getAttribute('aria-label'), body: el.getAttribute('data-hint') }));
    if (label) el.appendChild(make('span', label));
    const activate = () => { hints.dismiss(); if (!disabled) return callback(); };
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
  const hints = createTooltips(doc, root, handlers.tooltipTimers);
  const scroll = make('div', null, { class: 'pt-scroll' }); root.appendChild(scroll);
  scroll.addEventListener('scroll', hints.dismiss);
  const toolbar = make('div', null, { class: 'pt-toolbar' }), sections = [];
  toolbar.appendChild(make('div', 'QUICK TOOLS', { class: 'pt-eyebrow' }));
  const groups = new Map();
  tools.forEach(tool => {
    const group = tool.group || 'Tools';
    if (!groups.has(group)) {
      const section = make('div', null, { class: 'pt-section' });
      const actions = make('div', null, { class: 'pt-actions', role: 'group', 'aria-label': group });
      append(section, [make('div', group, { class: 'pt-section-title' }), actions]);
      groups.set(group, { section, actions, tools: [] }); sections.push(section);
    }
    const node = control(tool.id, null, () => handlers.run(tool.id), 'pt-action' + (tool.emphasis === 'primary' ? ' pt-primary' : ''), tool.title, tool.description);
    append(node, [icon(doc, tool.icon), make('span', tool.label, { class: 'pt-caption' })]); toolNodes[tool.id] = node;
    groups.get(group).actions.appendChild(node); groups.get(group).tools.push(tool);
  });
  const utilities = make('div', null, { class: 'pt-tools' });
  const labelToggle = control('labels', null, () => applyAppearance({ labels: !appearance.labels }), 'pt-small', 'Show button labels', 'Switch between captions and icons only. Hover or focus any button for its full description.'); labelToggle.appendChild(icon(doc, 'labels'));
  const options = make('div', null, { id: 'options' }); options.hidden = true;
  const gear = control('settings', null, () => setOptions(options.hidden), 'pt-small', 'Options', 'Export settings, tool visibility, appearance, usage and diagnostic reports.'); gear.appendChild(icon(doc, 'settings'));
  gear.setAttribute('aria-expanded', 'false'); gear.setAttribute('aria-controls', 'options');
  append(utilities, [labelToggle, gear]); toolbar.appendChild(utilities); append(scroll, [toolbar, ...sections]);
  const status = control('status', null, () => {
    details.hidden = !details.hidden; status.setAttribute('aria-expanded', String(!details.hidden));
  }, 'pt-status', 'Show operation details');
  status.className = 'pt-status'; append(status, [make('span', '', { class: 'pt-dot', 'aria-hidden': 'true' }), make('span', 'Ready', { id: 'statusText', class: 'pt-status-text', role: 'status', 'aria-live': 'polite' })]);
  const details = make('div', '', { id: 'details', class: 'pt-detail' }); details.hidden = true;
  const statusRow = make('div', null, { class: 'pt-status-row' });
  const copyLog = control('copyReport', null, handlers.copyReport, 'pt-small', 'Copy diagnostic text report', 'Copy recent operations and errors as text for sharing with Ctrl+V. Replaces any image in the clipboard.'); copyLog.appendChild(icon(doc, 'report'));
  append(statusRow, [status, copyLog]);
  append(scroll, [statusRow, details, make('p', '', { id: 'reportStatus', class: 'pt-hint', role: 'status', 'aria-live': 'polite' })]); elements.reportStatus.hidden = true;
  const external = control('external', 'Enable external paste', handlers.external, 'pt-text', 'Enable Photoshop Export Clipboard', 'Allow images copied in Photoshop to be pasted into other applications. Changes the Photoshop Export Clipboard preference.'); external.hidden = true;
  append(scroll, [external, options]);
  function heading(text) { options.appendChild(make('div', text, { class: 'pt-heading' })); }
  function checkbox(id, text, checked, change, description) {
    const input = make('input', null, { id, type: 'checkbox' }); input.checked = checked;
    input.addEventListener('change', change);
    const label = append(make('label'), [input, make('span', text)]);
    hints.bind(label, () => ({ title: text, body: description || '' }), input);
    return label;
  }
  heading('Export');
  options.appendChild(checkbox('overwrite', 'Replace existing PNG', draft.overwrite, handlers.changed, 'Replace an existing PNG with the same name. Keeps a temporary backup until the new file is committed.'));
  options.appendChild(checkbox('srgb', 'Convert copy to sRGB', draft.srgb, handlers.changed, 'Convert only the prepared export/copy to sRGB. The source document keeps its profile.'));
  const compression = make('input', null, { id: 'compression', type: 'number', min: '0', max: '9', 'aria-label': 'PNG compression, zero to nine' }); compression.value = String(draft.compression);
  hints.bind(compression, () => ({ title: 'PNG compression', body: '0 is faster; 9 makes a smaller file. All values are lossless and keep the original resolution.' }));
  compression.addEventListener('input', handlers.draft); compression.addEventListener('change', handlers.changed);
  options.appendChild(append(make('label'), [make('span', 'Compression'), compression]));
  options.appendChild(make('p', '0 = faster · 9 = smaller. Always lossless.', { class: 'pt-hint' }));
  heading('Tool buttons');
  tools.forEach(tool => options.appendChild(checkbox('visible-' + tool.id, tool.title, isVisible(tool), () => {
    visibility[tool.id] = elements['visible-' + tool.id].checked; updateVisibility(); handlers.visibility({ ...visibility });
  }, 'Show or hide this tool button. ' + tool.description)));
  heading('Appearance');
  function group(field, values) {
    const row = make('div', null, { class: 'pt-choice-group', role: 'group', 'aria-label': field });
    values.forEach(([value, label]) => { const id = field + '-' + value; const node = control(id, label, () => applyAppearance({ [field]: value }), 'pt-choice', label + ' ' + field, field === 'size' ? 'Change tool button density. Compact layer icons are 32 px; Roomy uses 36 px.' : field === 'corners' ? 'Change button and surface corner style.' : value === 'host' ? 'Follow the Photoshop panel theme.' : 'Use the ' + value + ' panel theme.'); choices[id] = { node, field, value }; row.appendChild(node); });
    options.appendChild(row);
  }
  group('size', [['compact', 'Compact'], ['roomy', 'Roomy']]); group('corners', [['square', 'Square'], ['soft', 'Rounded']]); group('theme', [['host', 'Auto'], ['dark', 'Dark'], ['light', 'Light']]);
  const help = make('div', null, { id: 'help' }); help.hidden = true;
  const helpButton = control('helpToggle', 'Help & report', () => { help.hidden = !help.hidden; helpButton.setAttribute('aria-expanded', String(!help.hidden)); }, 'pt-text', 'Help and diagnostics', 'Show tool instructions, limitations and Copy/Save report actions.'); helpButton.setAttribute('aria-expanded', 'false');
  append(options, [helpButton, help]);
  [
    'Photoshop Tool ' + version + ' · Made by Nasaat',
    'Extract + PNG extracts the current pixel selection from one selected pixel layer. With no suitable layer, it first stamps the visible composition. Without a pixel selection, it uses the full canvas.',
    'Original layers stay editable. Temporary composite layers/channels are removed; the new Smart Object stays in the PSD and its contents remain open. PNG + Copy inside them updates the same export in this session.',
    'Copy copies all visible layers as one full-canvas image, ignoring the current selection. It saves no file and also works without a saved PSD.',
    'PNG + Copy saves the PNG and copies the same prepared composition. The optional PNG only tool keeps the clipboard unchanged.',
    'Smart Object converts selected layers in place. With no selected layer, it stamps the visible composition without merging originals. An existing Smart Object is reused. These layer tools do not export or open contents.',
    'Camera Raw uses the same Smart Object target and opens the native filter dialog. Choose OK to apply a Smart Filter. Cancel rolls back this command. RGB / Grayscale, 8 / 16 bit only.',
    'Black mask adds a full Hide All pixel mask to one unlocked selected layer. Existing masks are kept. Paint with white to reveal the image.',
    'Curves and Hue / Sat add neutral adjustments clipped above one selected layer or group. Use Photoshop Properties to adjust them. Existing clipping chains follow Photoshop semantics.',
    'Solid Color opens the native color picker and adds an editable fill. Layer tools work in unsaved documents without export-folder access.',
    'Full resolution · RGB / Grayscale · 8 / 16 bit. The source PSD is not automatically saved.',
    'PNG files go beside the project automatically. Native image paste depends on the receiving application.',
    'Copy report replaces the clipboard with diagnostic text. Reports contain filenames, the last eight operations and recent session events. Nothing is sent automatically.'
  ].forEach(text => help.appendChild(make('p', text, { class: 'pt-hint' })));
  help.appendChild(control('copyReportHelp', 'Copy report', handlers.copyReport, 'pt-text', 'Copy a text report for sharing', 'Copies recent diagnostic text, replacing the image clipboard. Nothing is sent automatically.'));
  help.appendChild(control('report', 'Save report .txt', handlers.report, 'pt-text', 'Save a local text report', 'Choose a location for the diagnostic TXT file. The clipboard stays unchanged.'));
  root.appendChild(append(make('div', null, { class: 'pt-footer' }), [make('span', 'Made by Nasaat'), make('span', 'v' + version, { class: 'pt-version' })]));
  root.addEventListener('keydown', e => { if (e.key === 'Escape' && hints.dismiss()) { e.preventDefault(); return; } if (e.key === 'Escape' && !options.hidden) { e.preventDefault(); setOptions(false); if (gear.focus) gear.focus(); } });
  function setOptions(open) { hints.dismiss(); options.hidden = !open; gear.setAttribute('aria-expanded', String(open)); }
  function isVisible(tool) { return typeof visibility[tool.id] === 'boolean' ? visibility[tool.id] : tool.defaultVisible !== false; }
  function updateVisibility() {
    hints.dismiss();
    let count = 0;
    tools.forEach(tool => { const visible = isVisible(tool); toolNodes[tool.id].hidden = !visible; if (visible) count++; });
    root.setAttribute('data-tool-layout', count > 3 ? 'grid' : 'row');
    for (const group of groups.values()) {
      const visible = group.tools.filter(isVisible).length;
      group.section.hidden = visible === 0;
      group.actions.setAttribute('data-layout', visible > 3 ? 'grid' : 'row');
      group.actions.setAttribute('data-density', group.tools.every(tool => tool.compact) ? 'compact' : 'standard');
    }
  }
  function applyAppearance(patch, initial) {
    hints.dismiss();
    appearance = { ...appearance, ...patch };
    root.className = 'pt-root pt-' + appearance.theme + (appearance.labels ? ' pt-labels' : '') + (appearance.size === 'roomy' ? ' pt-roomy' : '') + (appearance.corners === 'soft' ? ' pt-soft' : '');
    labelToggle.setAttribute('aria-pressed', String(appearance.labels));
    labelToggle.setAttribute('aria-label', appearance.labels ? 'Hide button labels' : 'Show button labels');
    for (const choice of Object.values(choices)) choice.node.setAttribute('aria-pressed', String(appearance[choice.field] === choice.value));
    if (!initial) handlers.appearance({ ...appearance });
  }
  updateVisibility(); applyAppearance({}, true);
  return { root, elements, dismissHints: hints.dismiss, dispose: hints.destroy, appearance: () => ({ ...appearance }), visibility: () => ({ ...visibility }),
    values: () => ({ overwrite: elements.overwrite.checked, srgb: elements.srgb.checked, compression: String(compression.value) }),
    reportStatus(text) { elements.reportStatus.textContent = text; elements.reportStatus.hidden = !text; },
    status(text, state, needsExternal) {
      if (text !== statusText || state !== statusState) {
        statusText = text; statusState = state; elements.statusText.textContent = String(text).split('\n')[0];
        elements.reportStatus.hidden = true;
        details.textContent = text; status.setAttribute('data-hint', String(text).slice(0, 500) + '\nClick to expand the full details.'); status.setAttribute('data-state', state);
        statusRow.setAttribute('data-state', state);
        if (state === 'error') details.hidden = false;
        status.setAttribute('aria-expanded', String(!details.hidden));
      }
      if (needsExternal !== externalState) { external.hidden = !needsExternal; externalState = needsExternal; }
    },
    disable(value) {
      if (value) hints.dismiss();
      root.setAttribute('aria-busy', String(value));
      [...tools.map(t => t.id), 'external', 'report', 'copyReport', 'copyReportHelp'].forEach(id => controls[id](value));
      for (const id of ['overwrite', 'srgb', 'compression']) if (elements[id].disabled !== value) elements[id].disabled = value;
    }
  };
}
module.exports = { createPanel };
