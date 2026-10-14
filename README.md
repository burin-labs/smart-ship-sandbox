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
