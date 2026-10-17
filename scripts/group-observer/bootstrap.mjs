import {spawnSync} from 'node:child_process';
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const scripts = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceFile = join(scripts, 'controller-source.json');
const source = JSON.parse(readFileSync(sourceFile, 'utf8'));
const root = join(resolve(process.env.RUNNER_TEMP), 'smart-ship-observer');
function run(program, args) {
  const result = spawnSync(program, args, {stdio: 'inherit'});
  if (result.error || result.status !== 0) throw new Error(`Observer bootstrap failed at ${program}`);
}
run('bash', [join(scripts, 'install-qualified-controller.sh'), root, sourceFile]);
const driver = join(root, 'driver');
const workspace = join(root, 'objects.git');
mkdirSync(driver, {recursive: true});
run('git', ['init', '--bare', '--quiet', workspace]);
copyFileSync(join(scripts, 'admission-proof/secret-run.mjs'), join(driver, 'secret-run.mjs'));
const configuration = {
  schema: 'smart-ship.github-observer.v1',
  controller: source.controller,
  policy: JSON.parse(readFileSync(join(scripts, 'admission-proof/policy.json'), 'utf8')),
  store: {
    workspace,
    remote: 'https://github.com/burin-labs/smart-ship-sandbox.git',
    ref: 'refs/heads/smart-ship-authority/sandbox',
    timeout_ms: 30000,
    signed_commits: true,
  },
  token_reference: 'github/access-token',
};
writeFileSync(join(driver, 'observer.json'), JSON.stringify(configuration, null, 2) + '\n', {mode: 0o600});
