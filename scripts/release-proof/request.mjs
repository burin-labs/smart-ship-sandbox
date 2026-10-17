import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';

const {SOURCE, CHECKPOINT, GITHUB_REPOSITORY, RUNNER_TEMP} = process.env;
if (!/^[0-9a-f]{40}$/.test(SOURCE ?? '') || !/^sha256:[0-9a-f]{64}$/.test(CHECKPOINT ?? '')
    || GITHUB_REPOSITORY !== 'burin-labs/smart-ship-sandbox' || !RUNNER_TEMP) {
  throw new Error('Deployment requires an exact sandbox source and pinned checkpoint');
}
function git(args) {
  const result = spawnSync('git', args, {encoding: 'utf8'});
  if (result.status !== 0) throw new Error(`Release source observation refused: ${args[0]}`);
  return result.stdout.trim();
}
if (git(['rev-parse', 'HEAD']) !== SOURCE) throw new Error('Deployment checkout differs from the requested source');
git(['merge-base', '--is-ancestor', SOURCE, 'refs/remotes/origin/main']);
const response = await fetch('https://burin-labs.github.io/smart-ship-sandbox/health.json', {
  signal: AbortSignal.timeout(15000), cache: 'no-store',
});
if (!response.ok) throw new Error('Previous deployment health is unreadable');
const previous = await response.json();
if (previous.status !== 'ok' || !/^[0-9a-f]{40}$/.test(previous.commit ?? '')) {
  throw new Error('Previous deployment identity is unmeasured');
}
git(['merge-base', '--is-ancestor', previous.commit, SOURCE]);
const root = join(RUNNER_TEMP, 'smart-ship-release');
const input = {
  checkpoint_file: join(root, 'incoming', 'checkpoint.json'),
  checkpoint: CHECKPOINT,
  source: {repository: GITHUB_REPOSITORY, commit: SOURCE, tree: git(['rev-parse', 'HEAD^{tree}'])},
  artifact: join(root, 'incoming', 'artifact.tar'),
};
writeFileSync(join(root, 'request.json'), JSON.stringify(input));
writeFileSync(join(root, 'previous-deployment.json'), JSON.stringify(previous));
process.stdout.write(JSON.stringify({source: input.source, previous, checkpoint: CHECKPOINT}) + '\n');
