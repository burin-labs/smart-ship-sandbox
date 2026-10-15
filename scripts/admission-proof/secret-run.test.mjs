import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const wrapper = fileURLToPath(new URL('./secret-run.mjs', import.meta.url));
test('role handoff reaches the child only through the bounded parent-secret frame', () => {
  const root = mkdtempSync(join(tmpdir(), 'smart-ship-secret-handoff-'));
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
process.stdout.write(JSON.stringify({version: frame.version, references: frame.secrets.map(row => row.id.namespace + '/' + row.id.name).sort(), leaked, actualFrame: values.length > 0}));
`, {mode: 0o700});
    for (const [mode, expected] of [
      ['prepare', ['github/access-token', 'smart-ship/scope']],
      ['execute', ['smart-ship/executor']],
      ['issue', ['github/access-token', 'smart-ship/admission']],
    ]) {
      const input = join(root, `${mode}.json`);
      const output = join(root, `${mode}-result.json`);
      writeFileSync(input, JSON.stringify({workspace: root, plan: {job: {workspace: root}}}));
      const result = spawnSync(process.execPath, [wrapper, mode, input, output], {
        encoding: 'utf8',
        env: {...process.env, PATH: `${bin}:${process.env.PATH}`, GH_TOKEN: 'public-nonsecret-token-control', SMART_SHIP_SCOPE_KEY: '1'.repeat(64), SMART_SHIP_EXECUTOR_KEY: '2'.repeat(64), SMART_SHIP_ADMISSION_KEY: '3'.repeat(64)},
      });
      assert.equal(result.status, 0, `Handoff failed for ${mode}`);
      const observed = JSON.parse(readFileSync(output, 'utf8'));
      assert.deepEqual(observed, {version: 1, references: expected, leaked: false, actualFrame: true});
    }
  } finally { rmSync(root, {recursive: true}); }
});
