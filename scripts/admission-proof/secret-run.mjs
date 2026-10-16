import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync, realpathSync} from 'node:fs';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Only this trusted handoff sees step secrets. Harn receives a memory-only
// secret frame; its stock executor gives candidate commands a closed environment.
const driver = dirname(fileURLToPath(import.meta.url));
const root = resolve(driver, '..');
const [mode, inputPath, outputPath] = process.argv.slice(2);
const modes = {
  prepare: {script: join(driver, 'prepare.harn'), secrets: {'github/access-token': 'GH_TOKEN', 'smart-ship/scope': 'SMART_SHIP_SCOPE_KEY'}, network: true},
  execute: {script: join(root, 'package/job-cli.harn'), secrets: {'smart-ship/executor': 'SMART_SHIP_EXECUTOR_KEY'}, network: false},
  issue: {script: join(root, 'package/admission-cli.harn'), secrets: {'github/access-token': 'GH_TOKEN', 'smart-ship/admission': 'SMART_SHIP_ADMISSION_KEY'}, network: true},
};
const selected = modes[mode];
if (!selected || !inputPath || !outputPath || process.argv.length !== 5) throw new Error('Expected prepare|execute|issue, public input path and public output path');
const publicInput = JSON.parse(readFileSync(inputPath, 'utf8'));
const checkout = realpathSync(resolve(process.env.GITHUB_WORKSPACE ?? process.cwd()));
if (mode !== 'issue') {
  const requestedWorkspace = mode === 'prepare' ? publicInput.workspace : publicInput.plan.job.workspace;
  if (realpathSync(resolve(requestedWorkspace)) !== checkout) throw new Error('Stock request workspace differs from the host checkout');
}
const secretBuffers = [];
let payload;
let frame;
try {
  const secrets = Object.entries(selected.secrets).map(([reference, variable]) => {
    const value = process.env[variable];
    if (!value) throw new Error(`Missing credential reference ${reference}`);
    if (reference.startsWith('smart-ship/') && !/^[0-9a-f]{64}$/.test(value)) throw new Error(`Invalid signing key for ${reference}`);
    const buffer = Buffer.from(value);
    secretBuffers.push(buffer);
    const [namespace, name] = reference.split('/');
    return {id: {namespace, name}, value: Array.from(buffer)};
  });
  for (const variable of ['GH_TOKEN', 'SMART_SHIP_SCOPE_KEY', 'SMART_SHIP_EXECUTOR_KEY', 'SMART_SHIP_ADMISSION_KEY']) delete process.env[variable];
  payload = Buffer.from(JSON.stringify({version: 1, secrets}));
  for (const secret of secrets) secret.value.fill(0);
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length);
  frame = Buffer.concat([header, payload]);
  payload.fill(0);
  const outputDirectory = dirname(resolve(outputPath));
  mkdirSync(outputDirectory, {recursive: true});
  const workspace = mode === 'issue' ? realpathSync(outputDirectory) : checkout;
  const args = ['run', '--standalone', '--parent-secret-stdin', '--read-only-root', root, '--read-only-root', resolve(inputPath), '--write-root', workspace, '--write-root', outputDirectory];
  if (selected.network) args.push('--allow-process-network');
  args.push(selected.script, '--');
  if (mode === 'issue') args.push(join(driver, 'issuer.json'));
  args.push(resolve(inputPath));
  const result = spawnSync('harn', args, {
    cwd: workspace,
    input: frame, maxBuffer: 16 * 1024 * 1024,
    env: Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP'].filter(name => process.env[name]).map(name => [name, process.env[name]])),
    encoding: 'utf8',
  });
  if (result.stdout.trim()) {
    JSON.parse(result.stdout);
    writeFileSync(outputPath, result.stdout, {mode: 0o600});
  }
  // Diagnostics are bounded and scrubbed before reaching the job log.
  let diagnostic = result.stderr ?? '';
  for (const secret of secretBuffers) diagnostic = diagnostic.split(secret.toString()).join('[redacted]');
  if (diagnostic) process.stderr.write(diagnostic);
  if (result.error) throw new Error('Harn admission command could not start');
  process.exitCode = result.status ?? 1;
} finally {
  for (const buffer of secretBuffers) buffer.fill(0);
  payload?.fill(0);
  frame?.fill(0);
}
