# smart-ship-sandbox
Sandbox for Smart Ship PR shepherd end-to-end tests (burin-code#10067). Safe to break.

Numeric counter example:

```text
counter: 1
```

Sandbox for Smart Ship end-to-end tests. Label a PR `ship` to hand it to the shepherd.

The workbench control probe verifies queue recovery and an explicit human handoff before local editing.

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

Run `admission-verification.yml` on `main`, supplying the exact pull request
number as `pull` and its current commit as `head`. It measures the clean stock
command, signs scope before execution, registers the original shared CI job
identity and runs all eight Python cases through the packed product's
`job-cli.harn`. Candidate commands receive a closed environment. Their
controller keys arrive only in the Harn parent's memory through stdin.

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
