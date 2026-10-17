import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// This trusted operator command prepares files only. The installed public CLI
// owns checkpoint qualification, initialization, controls and writer retirement.
if (process.argv.length !== 3) throw new Error('Pass the audited former-writer enrollment JSON file');
if (!process.env.RUNNER_TEMP) throw new Error('RUNNER_TEMP is required');
const scripts = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(readFileSync(join(scripts, 'controller-source.json'), 'utf8'));
const baseline = JSON.parse(readFileSync(join(scripts, 'controller/baseline-source.json'), 'utf8'));
const enrollment = JSON.parse(readFileSync(process.argv[2], 'utf8'));
if (enrollment === null) throw new Error('The existing sandbox writers require an explicit inventory');
const binary = process.env.HARN_BIN || 'harn';
if (binary !== 'harn' && !isAbsolute(binary)) throw new Error('HARN_BIN must be an absolute qualified runtime path');
const env = {...process.env};
if (binary !== 'harn') env.PATH = `${dirname(binary)}:${env.PATH || ''}`;
const root = join(resolve(process.env.RUNNER_TEMP), 'smart-ship-controller');
const repository = 'https://github.com/burin-labs/smart-ship-sandbox.git';
function run(program, args, capture = false) {
  const result = spawnSync(program, args, {
    env, encoding: 'utf8', timeout: 120000, maxBuffer: 1048576,
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
  if (result.error || result.status !== 0) throw new Error(`Controller preparation failed at ${program}`);
  return result.stdout;
}
run('bash', [join(scripts, 'install-qualified-controller.sh'), root,
  join(scripts, 'controller-source.json')]);
const artifact = JSON.parse(run(binary, ['run', '--standalone', '--no-sandbox',
  join(root, 'package/artifact-cli.harn')], true));
if (artifact.digest !== source.controller) throw new Error('Installed controller differs from the qualified pin');
const workspace = join(root, 'objects.git');
run('git', ['init', '--bare', '--quiet', workspace]);
run('git', ['--git-dir', workspace, 'fetch', '--no-tags', repository, baseline.evidence]);
const object = `${baseline.evidence}:checkpoint.json`;
const size = Number(run('git', ['--git-dir', workspace, 'cat-file', '-s', object], true).trim());
if (!Number.isSafeInteger(size) || size < 1 || size > 1048576) throw new Error('Baseline checkpoint exceeds its size limit');
const bytes = run('git', ['--git-dir', workspace, 'show', object], true);
if (createHash('sha256').update(bytes).digest('hex') !== baseline.checkpoint_file_sha256) {
  throw new Error('Baseline checkpoint differs from the deployed evidence');
}
const installation = {
  schema: 'smart-ship.installation.v1',
  policy: JSON.parse(readFileSync(join(scripts, 'admission-proof/policy.json'), 'utf8')),
  store: {workspace, remote: repository, ref: 'refs/heads/smart-ship-authority/sandbox',
    timeout_ms: 30000, signed_commits: true},
  controller: source.controller,
  writer_enrollment: enrollment,
  initial_checkpoint: JSON.parse(bytes),
};
const driver = join(root, 'driver');
mkdirSync(driver, {recursive: true});
writeFileSync(join(driver, 'installation.json'), JSON.stringify(installation, null, 2) + '\n', {mode: 0o600});
writeFileSync(join(driver, 'github.json'), JSON.stringify({installation, token_reference: 'github/access-token'}, null, 2) + '\n', {mode: 0o600});
console.log(JSON.stringify({installation: join(driver, 'installation.json'), provider: join(driver, 'github.json'),
  controller: source.controller, baseline: baseline.checkpoint, initialized: false}));
