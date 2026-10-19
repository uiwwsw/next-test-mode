import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const scope = 'uiwwsws-projects';
// Progress goes to stderr; non-interactive CLI releases may return JSON on stdout.
const output = execFileSync('vercel', ['deploy', '--prod', '--yes', '--scope', scope], {
  encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'],
});
const result = output.trim();
let url;
if (result.startsWith('{')) {
  const response = JSON.parse(result);
  assert.equal(response.status, 'ok');
  assert.equal(response.deployment?.readyState, 'READY');
  assert.equal(response.deployment?.target, 'production');
  url = response.deployment.url;
} else {
  url = result;
}
assert.match(url, /^https:\/\/[a-z0-9-]+\.vercel\.app\/?$/, 'Unexpected Vercel deployment URL');
console.log(`Verified production deployment: ${url}`);
// Explicit aliases also follow future CLI releases when configured outside project domains.
for (const hostname of ['next-test-mode.vercel.app', 'test-mode-tau.vercel.app']) {
  execFileSync('vercel', ['alias', 'set', url, hostname, '--scope', scope], { stdio: 'inherit' });
}
