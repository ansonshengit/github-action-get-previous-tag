const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const safePrefix = (process.env.INPUT_PREFIX || '').replace(/[^0-9A-Za-z._/-]/g, '');
const tagPrefix = `${safePrefix}*`;
const workingDirectory = process.env.INPUT_WORKINGDIRECTORY || null;

const githubOutput = (() => {
    const output = process.env.GITHUB_OUTPUT;
    if (!output || output.includes('\0')) {
        throw new Error('Invalid GITHUB_OUTPUT path');
    }
    return path.resolve(output);
})();

if (workingDirectory) {
    console.log('\x1b[33m%s\x1b[0m', 'Working directory configured.');
}

execFile('git', [
    'for-each-ref',
    '--sort=-creatordate',
    '--count', '1',
    '--format=%(refname:short)',
    `refs/tags/${tagPrefix}`
], {cwd: workingDirectory}, (err, tag, stderr) => {
    tag = tag.trim();

    if (err) {
        console.error('Could not find any tags');
        process.exit(1);
    } else if (tag === "") {
        const timestamp = Math.floor(Date.now() / 1000);
        console.log('Using fallback tag');
        fs.appendFileSync(githubOutput, `tag=${process.env.INPUT_FALLBACK}\n`);
        fs.appendFileSync(githubOutput, `timestamp=${timestamp}\n`);
        process.exit(0);
    }

    execFile('git', ['log', '-1', '--format=%at', tag], {cwd: workingDirectory}, (err, timestamp, stderr) => {
        if (err) {
            console.error('Could not find any timestamp');
            process.exit(1);
        }

        timestamp = timestamp.trim();

        console.log('Tag and timestamp found');
        fs.appendFileSync(githubOutput, `tag=${tag}\n`);
        fs.appendFileSync(githubOutput, `timestamp=${timestamp}\n`);
        process.exit(0);
    });
});
