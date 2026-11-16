'use strict';
// Native UXP Spectrum slider paired with exact numeric entry. A convenience
// rail may extend to a valid typed value; it never narrows the input contract.
function bindSlider(input, slider, { min, max, step, railMax = max, reset, preview, commit }) {
  let syncing = false, effectiveMax = railMax;
  const valid = value => Number.isFinite(value) && value >= min && value <= max && (step !== 1 || Number.isInteger(value));
  function read() { const text = String(input.value); return text.trim() ? Number(text) : NaN; }
  function sync(value, resetRail = false) {
    if (!valid(value)) return;
    syncing = true;
    effectiveMax = Math.max(resetRail ? railMax : effectiveMax, value);
    for (const [name, setting] of [['min', min], ['max', effectiveMax], ['step', step]]) if (slider.getAttribute(name) !== String(setting)) slider.setAttribute(name, String(setting));
    if (Number(slider.value) !== value) slider.value = value;
    syncing = false;
  }
  function fromSlider(save) {
    if (syncing || slider.disabled) return;
    const value = Number(slider.value);
    if (!valid(value)) return;
    input.value = String(value); preview(value); if (save) commit(value);
  }
  input.addEventListener('input', () => { const value = read(); if (valid(value)) sync(value); });
  input.addEventListener('change', () => { const value = read(); if (valid(value)) sync(value); });
  slider.addEventListener('input', () => fromSlider(false));
  slider.addEventListener('change', () => fromSlider(true));
  slider.addEventListener('dblclick', () => {
    if (slider.disabled) return;
    const value = typeof reset === 'function' ? reset() : reset;
    input.value = String(value); sync(value, true); preview(value); commit(value);
  });
  sync(read());
  return { sync, disable(value) { slider.disabled = value; if (value) slider.setAttribute('disabled', ''); else slider.removeAttribute('disabled'); } };
}
module.exports = { bindSlider };
