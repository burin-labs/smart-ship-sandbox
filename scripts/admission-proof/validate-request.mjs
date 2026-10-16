import {readFileSync} from 'node:fs';

const [file, run, attempt] = process.argv.slice(2);
if (!/^[1-9][0-9]*$/.test(run ?? '') || !/^[1-9][0-9]*$/.test(attempt ?? '')) throw new Error('Selected original run and attempt required');
const request = JSON.parse(readFileSync(file, 'utf8'));
if (request.producer.run_id !== Number(run) || request.producer.attempt !== Number(attempt)) throw new Error('Frozen dispatch belongs to a different original producer');
process.stdout.write(JSON.stringify({run: request.producer.run_id, attempt: request.producer.attempt, head: request.request.scope.scope.reviewed_head}) + '\n');
