'use strict';
const cleanText = (value, max = 1600) => String(value == null ? '' : value)
  .replace(/(?:[A-Za-z]:[\\/]|\\\\)[^\r\n)"']+/g, '[local path]')
  .replace(/\/(?:Users|home)\/[^/\s]+/g, '/[user]')
  .slice(0, max);
function errorDetails(error, seen = new Set(), depth = 0) {
  if (depth > 3 || seen.has(error)) return { message: '[nested error omitted]' };
  seen.add(error);
  const result = { name: cleanText(error && error.name || 'Error', 120), message: cleanText(error && error.message != null ? error.message : String(error)) };
  if (error && error.stack) result.stack = cleanText(error.stack, 4000);
  for (const key of ['code', 'number', 'result']) if (error && error[key] != null) result[key] = typeof error[key] === 'number' ? error[key] : cleanText(error[key], 120);
  for (const key of ['cause', 'primaryError', 'cleanupError']) if (error && error[key] !== undefined) result[key] = errorDetails(error[key], seen, depth + 1);
  return result;
}
function snapshot(value, seen = new Set(), depth = 0) {
  if (typeof value === 'string') return cleanText(value, 4000);
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value !== 'object') return cleanText(value);
  if (depth > 8 || seen.has(value)) return '[omitted]';
  seen.add(value);
  const result = Array.isArray(value) ? value.slice(-100).map(item => snapshot(item, seen, depth + 1)) :
    Object.fromEntries(Object.entries(value).slice(0, 60).map(([key, item]) => [key, snapshot(item, seen, depth + 1)]));
  seen.delete(value);
  return result;
}
function createDiagnostics() {
  const events = [], operations = [];
  function event(level, scope, message, error) {
    const entry = { at: new Date().toISOString(), level, scope: cleanText(scope, 120), message: cleanText(message) };
    if (error !== undefined) entry.error = errorDetails(error);
    events.push(entry); if (events.length > 100) events.shift();
  }
  return { event,
    error(scope, error) { event('error', scope, error && error.message != null ? error.message : String(error), error); },
    operation(record) { operations.push(snapshot(record)); if (operations.length > 8) operations.shift(); },
    report() { return snapshot({ sessionOnly: true, limits: { events: 100, operations: 8 }, events, operations }); }
  };
}
function formatReport(report) {
  return report.product + ' ' + report.version + ' — diagnostic report\n' +
    'Photoshop: ' + report.photoshop + '\nGenerated: ' + report.generatedAt + '\n' +
    'Status: ' + cleanText(report.status, 500) + '\n\n' + JSON.stringify(snapshot(report), null, 2) + '\n';
}
async function copyReport(clipboard, text) {
  if (!clipboard || typeof clipboard.writeText !== 'function') throw new Error('Text clipboard is unavailable. Use Save report instead.');
  await clipboard.writeText(text);
}
module.exports = { createDiagnostics, errorDetails, snapshot, formatReport, copyReport };
