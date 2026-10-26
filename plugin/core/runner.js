'use strict';
function createRunner(registry, createContext, publish, version) {
  let active = false, last = null;
  async function run(id, options) {
    if (active) return { status: 'busy', message: 'Another tool is running.' };
    active = true;
    const started = Date.now();
    const record = { tool: id, version, status: 'running', pngSaved: false, imageCopied: false, smartObjectCreated: false, warnings: [] };
    last = record;
    const progress = (text, state = 'working') => { try { publish(text, state); } catch (_) { /* Presentation must not break an operation. */ } };
    const warn = text => { if (record.warnings.length < 12) record.warnings.push(String(text).slice(0, 700)); };
    try {
      const tool = registry.get(id);
      progress('Checking document…');
      const context = await createContext({ options, record, progress, warn });
      await tool.execute(context);
      record.status = 'complete';
      const result = record.message || (record.pngSaved && record.imageCopied ? 'Saved + copied' : record.pngSaved ? 'PNG saved' : record.imageCopied ? 'Image copied' : 'Done');
      progress(result + (record.width ? ' · ' + record.width + ' × ' + record.height : '') + (record.filename ? '\n' + record.filename : '') + (record.warnings.length ? '\n' + record.warnings.join('\n') : ''), 'success');
    } catch (e) {
      record.status = 'error'; record.error = String(e && e.message || e);
      record.code = e && (e.number || e.code) || null;
      record.stack = String(e && e.stack || '').replace(/[A-Za-z]:[^\n)]+/g, '[local path]').slice(0, 2400);
      let partial = record.pngSaved ? 'PNG saved; copying did not finish.\n' : record.imageCopied ? 'Image copied; PNG saving did not finish.\n' : '';
      if (record.smartObjectCreated) partial += 'Smart Object created. Retry PNG + Copy inside its contents.\n';
      progress(partial + record.error + (record.warnings.length ? '\n' + record.warnings.join('\n') : ''), 'error');
    } finally { record.durationMs = Date.now() - started; active = false; }
    return record;
  }
  return { run, get busy() { return active; }, report() { return last ? JSON.parse(JSON.stringify(last)) : null; } };
}
module.exports = { createRunner };
