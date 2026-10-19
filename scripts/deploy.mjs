import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const scope = 'uiwwsws-projects';
// Vercel writes progress to stderr and the completed deployment URL to stdout.
const output = execFileSync('vercel', ['deploy', '--prod', '--yes', '--scope', scope], {
  encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'],
});
const url = output.trim();
assert.match(url, /^https:\/\/[a-z0-9-]+\.vercel\.app\/?$/, 'Unexpected Vercel deployment URL');
console.log(`Verified production deployment: ${url}`);
// Explicit aliases also follow future CLI releases when configured outside project domains.
for (const hostname of ['next-test-mode.vercel.app', 'test-mode-tau.vercel.app']) {
  execFileSync('vercel', ['alias', 'set', url, hostname, '--scope', scope], { stdio: 'inherit' });
}
