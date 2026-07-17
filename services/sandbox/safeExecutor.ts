/**
 * Safer execution wrapper for LLM-generated CAD code.
 *
 * The original path called `new Function(code)` on the main thread with full window
 * access and no timeout — an XSS-adjacent hazard that could also hang the tab. This
 * adds two cheap, high-value guards on top of the existing executor:
 *
 *   1. A static blocklist that rejects obviously dangerous tokens (network, DOM,
 *      eval, dynamic import, prototype tampering) BEFORE anything runs.
 *   2. A wall-clock timeout so runaway kernel calls can't freeze the UI forever.
 *
 * The strongest isolation (running in the existing Web Worker or a QuickJS-wasm VM)
 * is tracked separately; this closes the biggest holes without that refactor.
 */

import { occMainThreadExecutor } from '../occMainThreadExecutor';
import { staticScan } from './staticScan';

export { staticScan };

export interface SafeExecResult {
  ok: boolean;
  mesh?: any; // meshData or meshData[]
  error?: string;
  blockedReason?: string;
}

/** Execute OpenCascade code with static screening + timeout. */
export async function safeExecuteOCC(code: string, timeoutMs = 15000): Promise<SafeExecResult> {
  const scan = staticScan(code);
  if (!scan.safe) {
    return { ok: false, blockedReason: scan.reason, error: `Blocked: ${scan.reason}` };
  }

  try {
    const mesh = await withTimeout(occMainThreadExecutor.executeCode(code), timeoutMs);
    return { ok: true, mesh };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Execution timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}
