# smart-ship-sandbox

Sandbox for Smart Ship PR shepherd end-to-end tests (burin-code#10067).
Safe to break.

Numeric counter example:

```text
counter: 1
```

Sandbox for Smart Ship end-to-end tests. Label a PR `ship` to hand it to the shepherd.
The caller enables model-assisted repair for deliberate conflict and failing-CI
fixtures so these tests exercise the same repair path as production callers.
Its default-branch policy grants the hosted models, runs the complete Python
fixture inventory, and limits the ordinary Smart Ship repair attempts.
The existing landing writer and checkpoint controller remain authoritative; this
caller does not activate the grouped-repair proof or change its attempt ledger.

The workbench control probe verifies queue recovery and an explicit human
handoff before local editing.

## Run the grouped-change fixture

Run `python3 verification/run_tests.py` from the repository root. It executes
the arithmetic and capacity tests and writes `.ship-report.xml` with actual
case outcomes. CI retains that report for passing and failing executions.
`verification/inventory.json` declares the required cases; missing, unexpected,
duplicated, or undiscovered cases fail the check even if the observed cases pass.

The capacity fixture starts with ten slots and two workers. Reducing
`IDLE_CAPACITY` and `expectations.json` to two passes alone. Increasing
`WORKERS` to three passes alone. Combining those changes fails because one
worker has no slot. A forward repair must preserve the reviewed idle limit
and allocate enough slots for the active workers within the ten-slot budget.

The current queue and deployment policy remain authoritative until the
checkpoint controller and release guard are qualified.

## Publish a verified checkpoint

Deployment consumes a signed checkpoint and the exact tar produced by its
verified stock job. Run `python3 verification/build_release.py` as that job's
command and declare `.smart-ship-pages.tar` as its `pages` output. It runs the
complete Python inventory before building the deterministic site archive.
A failed test removes any previous archive and produces no release output.

Keep `checkpoint.json` and those exact archive bytes, named `artifact.tar`, in
an immutable signed evidence commit in this repository. The checkpoint publisher
uses the recorded sandbox key; candidate commands never receive that key.
The generic controller owns qualification and publication. These files are its
release projection, not another source of shipping decisions.

Dispatch `pages.yml` on `main` with that `evidence` commit, the exact `checkpoint`
digest and verified `source` commit. The consumer loads its own trust document
and the attested package pinned in `scripts/controller-source.json`. It rejects
an invalid
signature, incomplete proof, changed source or substituted output through the
generic release guard. It also requires the last healthy deployed commit to be
an ancestor of the requested source, and checks the two site members before
uploading the original tar bytes to Pages. Preserve the workflow's qualification
artifact and independently read the published health receipt.

Main pushes no longer deploy directly. Until a new checkpoint qualifies, the
previous site stays published, including while a combined snapshot fails or
its repair is running. A deployment dispatch alone is not a release receipt.
The candidate archive pin is temporary under sandbox issue #37 and Harn #9857;
replace it with the promoted package only after its qualification is retained.

## Prove original CI admission

The manual admission workflows preserve the current merge and release owners.
They test a same-repository pull request without merging it.

Before enabling them, record separate scope, executor and admission signing
keys in the vault. Put only their public keys in the trusted proof driver's
`policy.json`. Synchronize the three private keys to the named sandbox secrets
only after vault read-back and Harn signature validation succeed:

- `SMART_SHIP_SCOPE_KEY`
- `SMART_SHIP_EXECUTOR_KEY`
- `SMART_SHIP_ADMISSION_KEY`

The trusted `issuer.json` owns the producer workflow, exact job bindings and
credential references. Preparation and issuance load the same public policy.
Downloaded dispatch artifacts cannot choose their own policy or issuer.

Run `admission-verification.yml` on `main`, supplying the exact pull request
number as `pull` and its current commit as `head`. It measures the clean stock
command, signs scope before execution, registers the original shared CI job
identity and runs all eight Python cases through the packed product's
`job-cli.harn`. Candidate commands receive a closed environment. Their
controller keys arrive only in the Harn parent's memory through stdin.
The trusted launcher grants preparation access to `api.github.com`, and issuance
also reads GitHub's artifact storage under `*.blob.core.windows.net`. It discards
ambient network overrides. Stock execution receives no external network grant.

Once that original workflow finishes, run `admission-issue.yml` on `main` with
its `original_run` and `original_attempt`. The packed admission command reads
the complete original job census and immutable stock result, then refreshes
the independent review for the exact head. Missing or invalid evidence cannot
produce an admission signature. Preserve its observation artifact even when
it reports pending or failed requirements.

A successful issue run also replays the measured provider responses and checks
seven refusal controls against that actual observation. These controls do not
rerun the tests or change the original receipts. Archive all three original
receipts: the stock result, signed admission observation and refusal census.
This proof enables no new merge, repair, checkpoint or deployment authority.

## Observe a reviewed group

Dispatch `group-observer.yml` on `main` with an exact `evidence` commit that
contains `group.json`. That file holds the repository and complete original
signed admissions, in composition order. Keep the original records unchanged.
Archive both the request and observation so the result can be replayed.

The workflow loads its package pin and trust policy from its own protected
source, then reads current reviews and composes the proposed Git tree. Its
GitHub token has read-only permissions. No signing key is configured. The
observer cannot merge, rerun verification, repair, or advance a checkpoint.
It does not run commands from submitted source.

Read the result's `status`, required and observed counts, and named pending,
failed, or invalid inputs. A workflow can finish successfully while reporting
`blocked`. A `composable` result forecasts the exact combined tree; it does
not prove that tree's tests pass or grant shipping authority. The existing
queue and checkpoint release guard still own their respective decisions.

## Prepare bounded repair qualification

The proof policy allows at most three repair attempts and USD 5 total per
incident through the existing attempt ledger. A missing spend report retains
its full reserved allowance. Configure a new installation with this policy.
For an existing installation, drain and transfer the policy through the
controller's fenced operation before starting the grouped repair proof.

## Prepare the checkpoint handoff

The admission, observer, release guard and controller share the qualified archive
pin in `scripts/controller-source.json`. They install the original attested bytes;
admission no longer builds a second package from a source checkout.

After auditing every existing mutation writer, save its complete `WriterEnrollment`
as an operator-owned JSON file. Set `RUNNER_TEMP` to the private installation
directory and use a qualified runtime to prepare the controller:

```sh
node scripts/controller/bootstrap.mjs /absolute/path/to/writer-enrollment.json
```

The command verifies the archive and installed artifact, fetches the immutable
deployed checkpoint, checks
its exact file hash, and writes credential-free installation and provider files.
It writes no remote authority ref. The public package CLI owns initialization,
checkpoint authentication, controls and former-writer retirement.

The initial checkpoint retains the known-good source `7a528e7`. Shadow authority
starts in a newer generation; activation still requires a complete measured
writer drain and retirement. The existing landing policy remains authoritative
until that handoff is qualified under issue #43.

After a policy change, run original verification and issuance again for each
current reviewed head. Earlier zero-budget signatures remain evidence for
their original policy; they do not authorize the new repair allowance.
