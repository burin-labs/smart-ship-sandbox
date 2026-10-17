import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

test('observer handoff honors the qualified runtime despite another harn on PATH', () => {
  assert(process.env.HARN_BIN, 'Pass the qualified Harn executable as HARN_BIN');
  const binary = realpathSync(process.env.HARN_BIN);
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'smart-ship-observer-cli-')));
  try {
    const bin = join(root, 'bin');
    const driver = join(root, 'driver');
    const packageRoot = join(root, 'package');
    mkdirSync(bin); mkdirSync(driver); mkdirSync(packageRoot);
    writeFileSync(join(bin, 'harn'), '#!/usr/bin/env node\nprocess.exit(73);\n', {mode: 0o700});
    const wrapper = join(driver, 'secret-run.mjs');
    copyFileSync(fileURLToPath(new URL('./secret-run.mjs', import.meta.url)), wrapper);
    writeFileSync(join(packageRoot, 'github-observer-cli.harn'), `fn main(harness: Harness) {
  require len(argv) == 2, "observer requires separate configuration and request"
  require harness.secrets.read("github/access-token") == "public-nonsecret-token-control",
    "observer did not receive its memory-only credential"
  harness.stdio.println(json_stringify({reached: true, arguments: argv, runtime: harness.env.get("HARN_BIN")}))
}
`);
    const request = join(root, 'group.json');
    const output = join(root, 'observation.json');
    writeFileSync(request, '{}');
    const result = spawnSync(process.execPath, [wrapper, 'observe', request, output], {
      encoding: 'utf8', timeout: 30000,
      env: {...process.env, HARN_BIN: binary, PATH: `${bin}:${process.env.PATH}`, GH_TOKEN: 'public-nonsecret-token-control'},
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(readFileSync(output, 'utf8')), {
      reached: true, arguments: [join(driver, 'observer.json'), request], runtime: binary,
    });
  } finally { rmSync(root, {recursive: true}); }
});
