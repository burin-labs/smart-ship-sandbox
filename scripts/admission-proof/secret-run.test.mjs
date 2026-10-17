import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const wrapper = fileURLToPath(new URL('./secret-run.mjs', import.meta.url));
test('role handoff reaches the child only through the bounded parent-secret frame', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'smart-ship-secret-handoff-')));
  try {
    const bin = join(root, 'bin'); mkdirSync(bin);
    const harn = join(bin, 'harn');
    writeFileSync(harn, `#!/usr/bin/env node
const fs = require('node:fs');
const input = fs.readFileSync(0);
const size = input.readUInt32BE(0);
if (size !== input.length - 4 || size > 1048576) process.exit(2);
const frame = JSON.parse(input.subarray(4).toString());
const values = frame.secrets.map(row => Buffer.from(row.value).toString());
const leaked = values.some(value => process.argv.some(arg => arg.includes(value)) || Object.values(process.env).some(entry => entry.includes(value)));
const issuing = frame.secrets.some(row => row.id.namespace === 'smart-ship' && row.id.name === 'admission');
const separateIssuerConfiguration = issuing ? process.argv.at(-2).endsWith('issuer.json') && process.argv.at(-2) !== process.argv.at(-1) : null;
const observing = process.argv.some(arg => arg.endsWith('/github-observer-cli.harn'));
const separateObserverConfiguration = observing ? process.argv.at(-2).endsWith('observer.json') && process.argv.at(-2) !== process.argv.at(-1) : null;
const hostMode = process.argv.includes('--no-sandbox');
process.stdout.write(JSON.stringify({version: frame.version, references: frame.secrets.map(row => row.id.namespace + '/' + row.id.name).sort(), leaked, actualFrame: values.length > 0, separateIssuerConfiguration, separateObserverConfiguration, hostMode, cwd: process.cwd(), network: {default: process.env.HARN_EGRESS_DEFAULT, allow: process.env.HARN_EGRESS_ALLOW ?? null}}));
`, {mode: 0o700});
    for (const [mode, expected, allowedHosts] of [
      ['prepare', ['github/access-token', 'smart-ship/scope'], 'api.github.com'],
      ['execute', ['smart-ship/executor'], null],
      ['issue', ['github/access-token', 'smart-ship/admission'], 'api.github.com,*.blob.core.windows.net'],
      ['observe', ['github/access-token'], 'api.github.com,github.com'],
    ]) {
      const input = join(root, `${mode}.json`);
      const output = join(root, `${mode}-result.json`);
      writeFileSync(input, JSON.stringify({workspace: root, plan: {job: {workspace: root}}}));
      const result = spawnSync(process.execPath, [wrapper, mode, input, output], {
        encoding: 'utf8',
        env: {...process.env, HARN_EGRESS_DEFAULT: 'allow', HARN_EGRESS_ALLOW: '*', GITHUB_WORKSPACE: root, PATH: `${bin}:${process.env.PATH}`, GH_TOKEN: 'public-nonsecret-token-control', SMART_SHIP_SCOPE_KEY: '1'.repeat(64), SMART_SHIP_EXECUTOR_KEY: '2'.repeat(64), SMART_SHIP_ADMISSION_KEY: '3'.repeat(64)},
      });
      assert.equal(result.status, 0, `Handoff failed for ${mode}`);
      const observed = JSON.parse(readFileSync(output, 'utf8'));
      assert.deepEqual(observed, {version: 1, references: expected, leaked: false, actualFrame: true, separateIssuerConfiguration: mode === 'issue' ? true : null, separateObserverConfiguration: mode === 'observe' ? true : null, hostMode: mode === 'observe', cwd: root, network: {default: 'deny', allow: allowedHosts}});
    }
    const widened = join(root, 'widened.json');
    const refusedOutput = join(root, 'must-not-exist.json');
    writeFileSync(widened, JSON.stringify({plan: {job: {workspace: '/'}}}));
    const refused = spawnSync(process.execPath, [wrapper, 'execute', widened, refusedOutput], {
      encoding: 'utf8', env: {...process.env, GITHUB_WORKSPACE: root, PATH: `${bin}:${process.env.PATH}`, SMART_SHIP_EXECUTOR_KEY: '2'.repeat(64)},
    });
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /workspace differs from the host checkout/);
    assert.equal(existsSync(refusedOutput), false);
  } finally { rmSync(root, {recursive: true}); }
});
