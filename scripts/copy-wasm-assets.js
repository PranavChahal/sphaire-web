/**
 * Copies WASM assets that must be served from /public into place before dev/build.
 * Currently: replicad's dedicated OpenCascade build (used by the replicad backend).
 * Idempotent; safe to run on every predev/prebuild.
 */
const fs = require('fs');
const path = require('path');

const jobs = [
  {
    from: path.join(__dirname, '..', 'node_modules', 'replicad-opencascadejs', 'src', 'replicad_single.wasm'),
    to: path.join(__dirname, '..', 'public', 'replicad', 'replicad_single.wasm'),
  },
];

for (const { from, to } of jobs) {
  try {
    if (!fs.existsSync(from)) {
      console.warn(`[copy-wasm] source missing (skipping): ${from}`);
      continue;
    }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    console.log(`[copy-wasm] ${path.basename(to)} -> public/replicad/`);
  } catch (e) {
    console.warn(`[copy-wasm] failed to copy ${from}:`, e.message);
  }
}
