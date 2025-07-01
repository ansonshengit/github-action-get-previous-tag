const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const debug = process.env.DEBUG === 'true';
const debugLog = (...args) => { if (debug) { console.log(...args); } };

const prefixEnv = process.env.INPUT_PREFIX || '';
const safePrefix = prefixEnv.replace(/[^\w.-]/g, '');
const tagPrefix = `${safePrefix}*`;
const workingDirectory = process.env.INPUT_WORKINGDIRECTORY || null;
const outputPath = (() => {
  const raw = process.env.GITHUB_OUTPUT || '';
  const normalized = path.normalize(raw);
  if (normalized.includes('..')) {
    throw new Error('Invalid GITHUB_OUTPUT path');
  }
  if (!normalized) {
    throw new Error('GITHUB_OUTPUT not set');
  }
  return normalized;
})();

debugLog('\x1b[33m%s\x1b[0m', 'Working directory: ', workingDirectory || '');

execFile(
  'git',
  ['for-each-ref', '--sort=-creatordate', '--count', '1', '--format=%(refname:short)', `refs/tags/${tagPrefix}`],
  { cwd: workingDirectory },
  (err, tag, stderr) => {
    tag = tag.trim();

    if (err) {
        console.error('Could not find any tags');
        debugLog('\x1b[31m%s\x1b[0m', stderr);
        process.exit(1);
    } else if (tag === "") {
        let timestamp = Math.floor(new Date().getTime() / 1000);
        debugLog('\x1b[33m%s\x1b[0m', 'Falling back to default tag');
        debugLog('\x1b[32m%s\x1b[0m', `Found tag: ${process.env.INPUT_FALLBACK}`);
        debugLog('\x1b[32m%s\x1b[0m', `Found timestamp: ${timestamp}`);
        fs.appendFileSync(outputPath, `tag=${process.env.INPUT_FALLBACK}\n`);
        fs.appendFileSync(outputPath, `timestamp=${timestamp}\n`);
        process.exit(0);
    }

    execFile(
        'git',
        ['log', '-1', '--format=%at', tag],
        { cwd: workingDirectory },
        (err, timestamp, stderr) => {
            if (err) {
                console.error('Could not find any timestamp');
                debugLog('\x1b[31m%s\x1b[0m', stderr);
                process.exit(1);
            }

        timestamp = timestamp.trim();

        debugLog('\x1b[32m%s\x1b[0m', `Found tag: ${tag}`);
        debugLog('\x1b[32m%s\x1b[0m', `Found timestamp: ${timestamp}`);
        fs.appendFileSync(outputPath, `tag=${tag}\n`);
        fs.appendFileSync(outputPath, `timestamp=${timestamp}\n`);
        process.exit(0);
    });
});
