'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { createDiagnostics, errorDetails, formatReport, copyReport } = require('../plugin/core/diagnostics.js');
const { createRegistry } = require('../plugin/core/registry.js');
const { createRunner } = require('../plugin/core/runner.js');
test('diagnostics bound session history, snapshot records and redact local paths', () => {
  const d = createDiagnostics();
  for (let i = 0; i < 150; i++) d.event('info', 'test', 'Event ' + i);
  for (let i = 0; i < 12; i++) { const r = { tool: 'test', count: i }; d.operation(r); r.count = -1; }
  d.error('test', new Error('Read failed: C:\\Users\\Nasaat\\private.psd'));
  const r = d.report(); assert.equal(r.events.length, 100); assert.equal(r.operations.length, 8); assert.equal(r.operations[7].count, 11);
  assert.doesNotMatch(JSON.stringify(r), /private.psd/); r.events.length = 0; assert.equal(d.report().events.length, 100);
});
test('error details preserve zero codes, nested primary/cleanup errors and thrown falsy values', () => {
  const e = Object.assign(new Error('Primary'), { number: 0, cause: new Error('Underlying'), cleanupError: new Error('Close failed') });
  e.cause.cause = e;
  const r = errorDetails(e); assert.equal(r.number, 0); assert.equal(r.cause.message, 'Underlying'); assert.equal(r.cleanupError.message, 'Close failed');
  assert.match(r.cause.cause.message, /omitted/); assert.equal(errorDetails(false).message, 'false'); assert.equal(errorDetails(null).message, 'null');
});
test('runner logs failed phase, timestamps, options, separate cleanup error and acknowledged effects', async () => {
  const d = createDiagnostics(); const registry = createRegistry([{ id: 'test.action', commandId: 'testAction', title: 'Test', label: 'Test', icon: 'copy',
    execute(ctx) { ctx.progress('Saving PNG'); ctx.record.pngSaved = true; ctx.warn('Cleanup failed', new Error('Close failed')); throw Object.assign(new Error('Copy failed'), { number: -123 }); } }]);
  const runner = createRunner(registry, ctx => ctx, () => {}, '0.3.1', d);
  const result = await runner.run('test.action', { compression: 0, srgb: false });
  assert.equal(result.phase, 'Saving PNG'); assert.equal(result.failure.number, -123); assert.equal(result.pngSaved, true); assert.equal(result.imageCopied, false);
  assert.equal(result.cleanupErrors[0].message, 'Close failed'); assert.equal(result.options.compression, 0); assert.match(result.startedAt, /^\d{4}-/);
  assert.ok(result.steps.length >= 3); assert.ok(result.durationMs >= 0); assert.equal(d.report().operations.length, 1);
});
test('text report copying awaits one write and never reads or clears the clipboard', async () => {
  const calls = [], clipboard = { async writeText(text) { calls.push(text); }, read() { assert.fail('read'); }, clearContent() { assert.fail('clear'); } };
  const text = formatReport({ product: 'Photoshop Tool', version: '0.3.1', photoshop: '27.x', generatedAt: 'today', status: 'Error', diagnostics: {} });
  await copyReport(clipboard, text); assert.equal(calls.length, 1); assert.match(calls[0], /^Photoshop Tool 0.3.1/);
  await assert.rejects(copyReport(null, text), /Save report/);
});
