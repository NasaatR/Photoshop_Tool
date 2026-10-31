'use strict';
const { errorDetails, snapshot } = require('./diagnostics.js');
function createRunner(registry, createContext, publish, version, diagnostics) {
  let active = false, last = null;
  async function run(id, options) {
    if (active) return { status: 'busy', message: 'Another tool is running.' };
    active = true;
    const started = Date.now();
    const record = { tool: id, version, startedAt: new Date(started).toISOString(), status: 'running', options: snapshot(options), pngSaved: false, imageCopied: false, smartObjectCreated: false, warnings: [], steps: [] };
    last = record;
    const progress = (text, state = 'working') => {
      if (state === 'working') record.phase = String(text).slice(0, 500);
      if (record.steps.length < 40) record.steps.push({ elapsedMs: Date.now() - started, state, message: String(text).slice(0, 1000) });
      if (diagnostics) diagnostics.event(state === 'error' ? 'error' : 'info', id, text);
      try { publish(text, state); } catch (_) { /* Presentation must not break an operation. */ }
    };
    const warn = (text, error) => {
      if (record.warnings.length < 12) record.warnings.push(String(text).slice(0, 700));
      if (error !== undefined) { record.cleanupErrors ||= []; if (record.cleanupErrors.length < 8) record.cleanupErrors.push(errorDetails(error)); }
      if (diagnostics) diagnostics.event('warning', id, text, error);
    };
    try {
      const tool = registry.get(id);
      progress('Checking document…');
      const context = await createContext({ options, record, progress, warn });
      await tool.execute(context);
      record.status = 'complete';
      const result = record.message || (record.pngSaved && record.imageCopied ? 'Saved + copied' : record.pngSaved ? 'PNG saved' : record.imageCopied ? 'Image copied' : 'Done');
      progress(result + (record.width ? ' · ' + record.width + ' × ' + record.height : '') + (record.filename ? '\n' + record.filename : '') + (record.warnings.length ? '\n' + record.warnings.join('\n') : ''), 'success');
    } catch (e) {
      const cancelled = e && e.cancelled === true;
      record.status = cancelled ? 'cancelled' : 'error'; record.error = String(e && e.message != null ? e.message : e);
      record.failure = errorDetails(e); record.code = record.failure.number ?? record.failure.code ?? null;
      record.stack = record.failure.stack || '';
      if (diagnostics && !cancelled) diagnostics.error(id, e);
      let partial = record.pngSaved ? 'PNG saved; copying did not finish.\n' : record.imageCopied ? 'Image copied; PNG saving did not finish.\n' : '';
      if (record.smartObjectCreated && id === 'png.selection-smart') partial += 'Smart Object created. Retry PNG + Copy inside its contents.\n';
      else if (record.smartObjectCreated) partial += 'Smart Object created.\n';
      progress(partial + (cancelled ? 'Cancelled' : record.error) + (record.warnings.length ? '\n' + record.warnings.join('\n') : ''), cancelled ? 'ready' : 'error');
    } finally { record.durationMs = Date.now() - started; active = false; if (diagnostics) diagnostics.operation(record); }
    return record;
  }
  return { run, get busy() { return active; },
    reject(id, error) {
      if (active) return;
      last = { tool: id, version, startedAt: new Date().toISOString(), status: 'error', phase: 'Validating options', pngSaved: false, imageCopied: false, smartObjectCreated: false, durationMs: 0, failure: errorDetails(error), error: String(error && error.message != null ? error.message : error) };
      if (diagnostics) { diagnostics.error(id, error); diagnostics.operation(last); }
    },
    report() { return last ? snapshot(last) : null; }
  };
}
module.exports = { createRunner };
