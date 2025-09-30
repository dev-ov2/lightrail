#!/usr/bin/env node
// CommonJS entry for Node SEA; dynamically loads ESM CLI without snapshot.
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

(async () => {
  try {
    const execDir = path.dirname(process.execPath);
    const cwd = process.cwd();
    // Potential layouts:
    // 1. Development: cwd/src/core/cli.js
    // 2. Copied sources beside binary: execDir/src/core/cli.js
    // 3. Copied sources one level up (binary in build/, sources in project root): execDir/../src/core/cli.js
    // 4. Direct binary inside project root: execDir/src/core/cli.js
    const candidatePaths = [
      path.join(execDir, 'src', 'core', 'cli.js'),
      path.join(execDir, '..', 'src', 'core', 'cli.js'),
      path.join(cwd, 'src', 'core', 'cli.js')
    ].map(p => path.normalize(p));
    let resolved;
    for (const p of candidatePaths) {
      try {
        fs.accessSync(p, fs.constants.R_OK);
        resolved = p;
        break;
      } catch {
        // continue
      }
    }
    if (!resolved) {
      throw new Error(
        'Unable to locate cli.js. Checked:\n' + candidatePaths.join('\n') +
        '\nHint: Either (a) copy the src/ directory next to the executable, or (b) build with snapshot support when fully static.'
      );
    }
    await import(pathToFileURL(resolved).href);
  } catch (err) {
    console.error('Failed to start Lightrail CLI (SEA entry):', err);
    process.exit(1);
  }
})();