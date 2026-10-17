import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const scripts = resolve(here, '..');
const binary = process.env.HARN_BIN || 'harn';

test('the installed controller retains the deployed checkpoint and refuses premature activation', {timeout: 180000}, t => {
  const scratch = mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(), 'smart-ship-controller-test-'));
  t.after(() => rmSync(scratch, {recursive: true, force: true}));
  const env = {...process.env, RUNNER_TEMP: scratch, HARN_BIN: binary};
  function run(program, args, required = true) {
    const result = spawnSync(program, args, {env, encoding: 'utf8', timeout: 120000, maxBuffer: 1048576});
    if (required) assert.equal(result.status, 0, result.stderr || result.error?.message);
    return result;
  }
  const enrollment = join(scratch, 'fixture-writers.json');
  writeFileSync(enrollment, JSON.stringify({
    writers: [{id: 'disposable-test-writer', repository: 'burin-labs/smart-ship-sandbox',
      source: '63b00c48aa9c43050b4479a0730cfcf8915eee42'}],
    scope_trust_domain: 'sandbox-stock-scope', max_drain_age_ms: 60000,
  }));
  run(process.execPath, [join(here, 'bootstrap.mjs'), enrollment]);
  const root = join(scratch, 'smart-ship-controller');
  const generated = JSON.parse(readFileSync(join(root, 'driver/installation.json'), 'utf8'));
  run('git', ['--git-dir', generated.store.workspace, 'config', 'user.name', 'Smart Ship Fixture']);
  run('git', ['--git-dir', generated.store.workspace, 'config', 'user.email', 'fixture@example.invalid']);
  const provider = JSON.parse(readFileSync(join(root, 'driver/github.json'), 'utf8'));
  assert.deepEqual(provider.installation, generated);
  assert.equal(provider.token_reference, 'github/access-token');
  assert.equal(generated.store.remote, 'https://github.com/burin-labs/smart-ship-sandbox.git');
  assert.equal(generated.store.signed_commits, true);
  const remote = join(scratch, 'disposable-remote.git');
  run('git', ['init', '--bare', '--quiet', remote]);
  // Only this test replaces the public remote and signing setting. Production
  // preparation has no override that can turn off signed authority commits.
  const configuration = {...generated, store: {...generated.store, remote, signed_commits: false}};
  const baseline = configuration.initial_checkpoint;
  const baselinePin = JSON.parse(readFileSync(join(here, 'baseline-source.json'), 'utf8'));
  const path = join(root, 'driver/disposable-installation.json');
  function request(action, fields = {}, required = true) {
    writeFileSync(path, JSON.stringify(configuration));
    return run(binary, ['run', '--standalone', '--no-sandbox', join(root, 'package/cli.harn'), '--',
      JSON.stringify({action, configuration: path, ...fields})], required);
  }
  configuration.initial_checkpoint = {...baseline, signature: 'invalid'};
  const refused = request('init', {}, false);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /initial checkpoint requires a trusted publisher signature and complete verified evidence/);
  assert.equal(run('git', ['--git-dir', remote, 'show-ref', '--verify', '--quiet', configuration.store.ref], false).status, 1);
  configuration.initial_checkpoint = baseline;
  const initialized = JSON.parse(request('init').stdout);
  assert.equal(initialized.checkpoint, baselinePin.checkpoint);
  assert.equal(initialized.authority.mode, 'shadow');
  assert.equal(initialized.authority.generation, baseline.checkpoint.snapshot.generation + 1);
  assert.equal(initialized.authority.promoted_sequence, baseline.checkpoint.snapshot.sequence);
  assert.equal(initialized.authority.writer_handoff.phase, 'observing');
  assert.equal(initialized.verification.status, 'verified');
  assert.equal(initialized.verification.required, 1);
  assert.equal(initialized.verification.executed, 1);
  assert.equal(initialized.verification.reused, 0);
  assert.equal(initialized.active_snapshot, null);
  assert.equal(initialized.pending_snapshot, null);
  assert.ok(initialized.state_commit);
  const activation = request('control', {mode: 'active'}, false);
  assert.notEqual(activation.status, 0);
  assert.match(activation.stderr, /former mutation writers have not retired/);
  const stopped = JSON.parse(request('control', {mode: 'stopped'}).stdout);
  assert.equal(stopped.authority.mode, 'stopped');
  assert.notEqual(stopped.state_commit, initialized.state_commit);
  configuration.initial_checkpoint = {...baseline, signature: 'retired bootstrap signature'};
  const restarted = JSON.parse(request('init').stdout);
  assert.equal(restarted.state_commit, stopped.state_commit);
  assert.equal(restarted.authority.mode, 'stopped');
  assert.equal(restarted.checkpoint, baselinePin.checkpoint);
  const pin = JSON.parse(readFileSync(join(scripts, 'controller-source.json'), 'utf8'));
  const receipt = {source: process.env.GITHUB_SHA || null, controller_source: pin,
    checkpoint: baselinePin.checkpoint, verification: initialized.verification,
    generation: initialized.authority.generation, invalid_signature_refused_before_authority: true,
    activation_refused_before_retirement: true, stopped_state_retained_on_restart: true,
    authority_remote: 'disposable-local-git', live_authority_mutated: false};
  if (process.env.RUNNER_TEMP) writeFileSync(join(process.env.RUNNER_TEMP, 'smart-ship-controller-qualification.json'), JSON.stringify(receipt, null, 2));
});
