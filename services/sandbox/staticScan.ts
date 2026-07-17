/**
 * Shared static safety scan for LLM/user-generated code, run before any
 * `new Function(...)` execution. Kept dependency-free so every executor
 * (main-thread, worker, modification) can import it without cycles.
 */

const BLOCKED_PATTERNS: Array<[RegExp, string]> = [
  [/\bfetch\s*\(/, 'network access (fetch)'],
  [/\bXMLHttpRequest\b/, 'network access (XHR)'],
  [/\bWebSocket\b/, 'network access (WebSocket)'],
  [/\bimport\s*\(/, 'dynamic import'],
  [/\brequire\s*\(/, 'require()'],
  [/\beval\s*\(/, 'eval()'],
  [/\bFunction\s*\(/, 'nested Function constructor'],
  [/\bdocument\b/, 'DOM access (document)'],
  [/\blocalStorage\b/, 'storage access'],
  [/\bsessionStorage\b/, 'storage access'],
  [/\bnavigator\b/, 'navigator access'],
  [/\b__proto__\b/, 'prototype tampering'],
  [/\bprocess\b/, 'process access'],
  [/\bwindow\.(?!BABYLON)/, 'window access'],
];

export function staticScan(code: string): { safe: boolean; reason?: string } {
  for (const [re, label] of BLOCKED_PATTERNS) {
    if (re.test(code)) return { safe: false, reason: label };
  }
  return { safe: true };
}
