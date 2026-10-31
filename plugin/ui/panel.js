'use strict';
const CSS = require('./styles.js');
const { icon } = require('./icons.js');
const { createTooltips } = require('./tooltips.js');
const { createReorder } = require('./reorder.js');
const { scrollKey, revealTop } = require('./scroll.js');
function createPanel(doc, tools, draft, appearanceDraft, visibilityDraft, handlers, version, orderDraft = []) {
  const elements = {}, controls = {}, toolNodes = {}, choices = {};
  let appearance = { ...appearanceDraft }, visibility = { ...visibilityDraft };
  let arranger = null, activeSettingsTab = 'view';
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
    hints.bind(el, () => ({ title: el.getAttribute('data-hint-title') || el.getAttribute('aria-label'), body: el.getAttribute('data-hint') }));
    if (label) el.appendChild(make('span', label));
    const activate = event => { hints.dismiss(); if (!disabled) return callback(event); };
    el.addEventListener('click', activate);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); if (!e.repeat) return activate(e); }
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); spaceDown = !disabled; }
    });
    el.addEventListener('keyup', e => { if ((e.key === ' ' || e.key === 'Spacebar') && spaceDown) { e.preventDefault(); spaceDown = false; return activate(e); } });
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
  const scroll = make('div', null, { id: 'scroll', class: 'pt-scroll', tabindex: '0', role: 'region', 'aria-label': 'Photoshop Tool content' }); root.appendChild(scroll);
  scroll.addEventListener('scroll', hints.relayout);
  scroll.addEventListener('keydown', event => scrollKey(scroll, event));
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
    const node = control(tool.id, null, event => { if (!arranger || !arranger.activate(tool.id, event)) return handlers.run(tool.id); }, 'pt-action' + (tool.emphasis === 'primary' ? ' pt-primary' : ''), tool.title, tool.description);
    node.setAttribute('data-hint-title', tool.hint || tool.label);
    append(node, [icon(doc, tool.icon), make('span', tool.label, { class: 'pt-caption' })]); toolNodes[tool.id] = node;
    groups.get(group).actions.appendChild(node); groups.get(group).tools.push(tool);
  });
  const utilities = make('div', null, { class: 'pt-tools' });
  const labelToggle = control('labels', null, () => applyAppearance({ labels: !appearance.labels }), 'pt-small', 'Show button labels', 'Switch between captions and icons only. Hover or focus any button for its full description.'); labelToggle.appendChild(icon(doc, 'labels'));
  const arrange = control('arrange', null, () => arranger.setActive(!arranger.active), 'pt-small', 'Arrange buttons', 'Drag buttons within a section, pick two positions, or use arrow keys. Your order is saved automatically.'); arrange.appendChild(icon(doc, 'arrange'));
  arrange.setAttribute('aria-pressed', 'false');
  const arrangeBar = make('div', null, { id: 'arrangeBar', class: 'pt-arrange-bar' }); arrangeBar.hidden = true;
  const arrangeHint = make('div', 'Drag, or pick a button and its new position. Arrow keys move it.', { id: 'arrangeHint', class: 'pt-hint', role: 'status', 'aria-live': 'polite' });
  const arrangeActions = make('div', null, { class: 'pt-choice-group' });
  append(arrangeActions, [control('arrangeDone', 'Done', () => arranger.setActive(false), 'pt-choice', 'Finish arranging buttons'), control('arrangeReset', 'Reset order', () => arranger.reset(), 'pt-choice', 'Restore default button order', 'Only the order changes. Visibility, appearance and export options are kept.')]);
  append(arrangeBar, [arrangeHint, arrangeActions]);
  const options = make('div', null, { id: 'options' }); options.hidden = true;
  const gear = control('settings', null, event => setOptions(options.hidden, !!(event && event.key)), 'pt-small', 'Settings', 'Export settings, tool visibility, appearance, usage and diagnostic reports.'); gear.appendChild(icon(doc, 'settings'));
  gear.setAttribute('aria-expanded', 'false'); gear.setAttribute('aria-controls', 'options');
  append(utilities, [arrange, labelToggle, gear]); toolbar.appendChild(utilities); append(scroll, [toolbar, arrangeBar, ...sections]);
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
  const settingsPanels = {}, settingsTabs = {}, tabOrder = ['view', 'tools', 'export', 'help'];
  const settingsHeader = make('div', null, { class: 'pt-settings-header' });
  append(settingsHeader, [make('span', 'Settings', { class: 'pt-settings-title' }), control('settingsClose', 'Close', () => setOptions(false), 'pt-settings-close', 'Close settings')]);
  options.appendChild(settingsHeader);
  const tabList = make('div', null, { class: 'pt-settings-tabs', role: 'tablist', 'aria-label': 'Settings sections' }); options.appendChild(tabList);
  for (const [id, label] of [['view', 'View'], ['tools', 'Tools'], ['export', 'Export'], ['help', 'Help']]) {
    const tab = control('tab-' + id, label, () => selectSettingsTab(id), 'pt-tab', label + ' settings');
    tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', 'settings-' + id); tabList.appendChild(tab); settingsTabs[id] = tab;
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = tabOrder[(tabOrder.indexOf(id) + 1) % tabOrder.length];
      if (event.key === 'ArrowLeft') next = tabOrder[(tabOrder.indexOf(id) + tabOrder.length - 1) % tabOrder.length];
      if (event.key === 'Home') next = tabOrder[0]; if (event.key === 'End') next = tabOrder[tabOrder.length - 1];
      if (next) { event.preventDefault(); selectSettingsTab(next); if (settingsTabs[next].focus) settingsTabs[next].focus(); }
    });
    const section = make('div', null, { id: 'settings-' + id, role: 'tabpanel', 'aria-labelledby': 'tab-' + id });
    settingsPanels[id] = section; options.appendChild(section);
  }
  function selectSettingsTab(id) {
    hints.dismiss(); activeSettingsTab = id;
    for (const name of tabOrder) { const selected = name === id; settingsPanels[name].hidden = !selected; settingsTabs[name].setAttribute('aria-selected', String(selected)); settingsTabs[name].setAttribute('tabindex', selected ? '0' : '-1'); }
  }
  function heading(parent, text) { parent.appendChild(make('div', text, { class: 'pt-heading' })); }
  function checkbox(id, text, checked, change, title) {
    const input = make('input', null, { id, type: 'checkbox' }); input.checked = checked;
    input.addEventListener('change', change);
    const label = append(make('label'), [input, make('span', text)]);
    hints.bind(label, () => ({ title: title || text }), input); return label;
  }
  settingsPanels.export.appendChild(checkbox('overwrite', 'Replace existing PNG', draft.overwrite, handlers.changed));
  settingsPanels.export.appendChild(checkbox('srgb', 'Convert to sRGB', draft.srgb, handlers.changed));
  const compression = make('input', null, { id: 'compression', type: 'number', min: '0', max: '9', 'aria-label': 'PNG compression, zero to nine' }); compression.value = String(draft.compression);
  hints.bind(compression, () => ({ title: 'PNG compression' }));
  compression.addEventListener('input', handlers.draft); compression.addEventListener('change', handlers.changed);
  settingsPanels.export.appendChild(append(make('label'), [make('span', 'Compression'), compression]));
  settingsPanels.export.appendChild(make('p', 'Lossless · 0 fast / 9 small', { class: 'pt-hint' }));
  for (const group of groups.values()) {
    heading(settingsPanels.tools, group.tools[0].group || 'Tools'); const list = make('div', null, { class: 'pt-tool-options' }); settingsPanels.tools.appendChild(list);
    group.tools.forEach(tool => list.appendChild(checkbox('visible-' + tool.id, tool.label, isVisible(tool), () => {
      visibility[tool.id] = elements['visible-' + tool.id].checked; updateVisibility(); handlers.visibility({ ...visibility });
    }, tool.title)));
  }
  settingsPanels.tools.appendChild(control('arrangeTools', 'Arrange buttons', () => { setOptions(false); arranger.setActive(true); }, 'pt-text', 'Arrange buttons'));
  function group(field, label, values) {
    const wrapper = make('div', null, { class: 'pt-setting-row' }); wrapper.appendChild(make('div', label, { class: 'pt-setting-name' }));
    const row = make('div', null, { class: 'pt-choice-group', role: 'group', 'aria-label': label });
    values.forEach(([value, text]) => { const id = field + '-' + value; const node = control(id, text, () => applyAppearance({ [field]: value }), 'pt-choice', text + ' ' + label.toLowerCase()); choices[id] = { node, field, value }; row.appendChild(node); });
    wrapper.appendChild(row); settingsPanels.view.appendChild(wrapper);
  }
  group('size', 'Density', [['compact', 'Compact'], ['roomy', 'Roomy']]);
  group('corners', 'Corners', [['square', 'Square'], ['soft', 'Rounded']]);
  group('theme', 'Theme', [['host', 'Auto'], ['dark', 'Dark'], ['light', 'Light']]);
  settingsPanels.view.appendChild(checkbox('appearance-labels', 'Button labels', appearance.labels, () => applyAppearance({ labels: elements['appearance-labels'].checked })));
  settingsPanels.help.appendChild(make('p', 'Photoshop Tool ' + version + ' · Made by Nasaat', { class: 'pt-hint' }));
  const reportActions = make('div', null, { class: 'pt-report-actions' });
  append(reportActions, [control('copyReportHelp', 'Copy report', handlers.copyReport, 'pt-text', 'Copy report'), control('report', 'Save .txt', handlers.report, 'pt-text', 'Save report')]);
  settingsPanels.help.appendChild(reportActions);
  const help = make('div', null, { id: 'help' }); help.hidden = true;
  const helpButton = control('helpToggle', 'Tool guide', () => { help.hidden = !help.hidden; helpButton.setAttribute('aria-expanded', String(!help.hidden)); }, 'pt-text', 'Help and diagnostics', 'Show tool instructions, limitations and Copy/Save report actions.'); helpButton.setAttribute('aria-expanded', 'false');
  append(settingsPanels.help, [helpButton, help]);
  [
    'Photoshop Tool ' + version + ' · Made by Nasaat',
    'Arrange buttons: use the arrow icon in the toolbar. Drag within a section, pick a button and its new position, or use arrow keys. Done/Escape ends arranging; Reset order keeps other settings.',
    'Extract + PNG extracts the current pixel selection from one selected pixel layer. With no suitable layer, it first stamps the visible composition. Without a pixel selection, it uses the full canvas.',
    'Original layers stay editable. Temporary composite layers/channels are removed; the new Smart Object stays in the PSD and its contents remain open. PNG + Copy inside them updates the same export in this session.',
    'Copy copies all visible layers as one full-canvas image, ignoring the current selection. It saves no file and also works without a saved PSD.',
    'PNG + Copy saves the PNG and copies the same prepared composition. The optional PNG only tool keeps the clipboard unchanged.',
    'Smart Object converts selected layers in place. With no selected layer, it stamps the visible composition without merging originals. An existing Smart Object is reused. These layer tools do not export or open contents.',
    'Camera Raw uses the same Smart Object target and opens the native filter dialog. Choose OK to apply a Smart Filter. Cancel rolls back this command. RGB / Grayscale, 8 / 16 bit only.',
    'Black Mask / Invert adds a full black mask if none exists, or inverts the entire existing pixel mask. The original pixel selection is restored; source pixels, mask density and feather are preserved.',
    'Curves and Hue / Sat add neutral adjustments clipped above one selected layer or group. Use Photoshop Properties to adjust them. Existing clipping chains follow Photoshop semantics.',
    'Solid Color opens the native color picker and adds an editable fill. Layer tools work in unsaved documents without export-folder access.',
    'Full resolution · RGB / Grayscale · 8 / 16 bit. The source PSD is not automatically saved.',
    'PNG files go beside the project automatically. Native image paste depends on the receiving application.',
    'Copy report replaces the clipboard with diagnostic text. Reports contain filenames, the last eight operations and recent session events. Nothing is sent automatically.'
  ].forEach(text => help.appendChild(make('p', text, { class: 'pt-hint' })));
  root.appendChild(append(make('div', null, { class: 'pt-footer' }), [make('span', 'Made by Nasaat'), make('span', 'v' + version, { class: 'pt-version' })]));
  arranger = createReorder(doc, tools, toolNodes, orderDraft, {
    apply(ordered) { for (const tool of ordered) groups.get(tool.group || 'Tools').actions.appendChild(toolNodes[tool.id]); },
    save(ids) { if (handlers.order) handlers.order(ids); },
    state(active, picked) { root.setAttribute('data-arranging', String(active)); arrangeBar.hidden = !active; arrange.setAttribute('aria-pressed', String(active)); hints.enable(!active); const text = picked ? 'Choose a new position in this section, drag, or use arrow keys.' : 'Drag, or pick a button and its new position. Arrow keys move it.'; if (arrangeHint.textContent !== text) arrangeHint.textContent = text; }
  });
  root.addEventListener('keydown', e => { if (e.key === 'Escape' && arranger.escape()) { e.preventDefault(); return; } if (e.key === 'Escape' && hints.dismiss()) { e.preventDefault(); return; } if (e.key === 'Escape' && !options.hidden) { e.preventDefault(); setOptions(false); if (gear.focus) gear.focus(); } });
  function setOptions(open, focusTab = false) { hints.dismiss(); options.hidden = !open; gear.setAttribute('aria-expanded', String(open)); if (open) { revealTop(scroll, options); if (focusTab && settingsTabs[activeSettingsTab].focus) settingsTabs[activeSettingsTab].focus(); } else { scroll.scrollTop = 0; if (gear.focus) gear.focus(); } }
  function isVisible(tool) { return typeof visibility[tool.id] === 'boolean' ? visibility[tool.id] : tool.defaultVisible !== false; }
  function updateVisibility() {
    hints.dismiss(); if (arranger) arranger.cancel();
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
    elements['appearance-labels'].checked = appearance.labels;
    labelToggle.setAttribute('aria-pressed', String(appearance.labels));
    labelToggle.setAttribute('aria-label', appearance.labels ? 'Hide button labels' : 'Show button labels');
    for (const choice of Object.values(choices)) choice.node.setAttribute('aria-pressed', String(appearance[choice.field] === choice.value));
    if (!initial) handlers.appearance({ ...appearance });
  }
  selectSettingsTab('view'); updateVisibility(); applyAppearance({}, true);
  return { root, elements, dismissHints() { hints.dismiss('panel-hidden'); arranger.cancel(); }, tooltipReport: hints.report, settingsTab: () => activeSettingsTab, scrollReport: () => ({ height: scroll.clientHeight, contentHeight: scroll.scrollHeight, top: scroll.scrollTop }), order: arranger.order, dispose() { arranger.destroy(); hints.destroy(); }, appearance: () => ({ ...appearance }), visibility: () => ({ ...visibility }),
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
      if (value) { hints.dismiss(); if (arranger.active) arranger.setActive(false); }
      root.setAttribute('aria-busy', String(value));
      [...tools.map(t => t.id), 'external', 'report', 'copyReport', 'copyReportHelp', 'arrange', 'arrangeDone', 'arrangeReset', 'arrangeTools'].forEach(id => controls[id](value));
      for (const id of ['overwrite', 'srgb', 'compression']) if (elements[id].disabled !== value) elements[id].disabled = value;
    }
  };
}
module.exports = { createPanel };
