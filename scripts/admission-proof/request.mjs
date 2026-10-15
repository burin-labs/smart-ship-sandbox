import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const [pull, head] = process.argv.slice(2);
if (!/^[1-9][0-9]*$/.test(pull ?? '') || !/^[0-9a-f]{40}$/.test(head ?? '')) throw new Error('Exact pull and head required');
for (const name of ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) {
  if (!/^[1-9][0-9]*$/.test(process.env[name] ?? '')) throw new Error(`Missing ${name}`);
}
const policy = JSON.parse(readFileSync(join(directory, 'policy.json'), 'utf8'));
process.stdout.write(JSON.stringify({
  workspace: process.env.GITHUB_WORKSPACE,
  output: join(directory, '../prepared'),
  head, pull: Number(pull), run: Number(process.env.GITHUB_RUN_ID), attempt: Number(process.env.GITHUB_RUN_ATTEMPT), policy,
}));
