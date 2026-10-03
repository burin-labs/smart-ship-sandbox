#!/usr/bin/env bash
# Fault injection for Smart Ship end-to-end tests.
#   FAIL            -> fail on every event
#   FAIL_IN_QUEUE   -> pass on the PR, fail inside the merge queue (dequeue)
#   FLAKY           -> fail about half the time
set -euo pipefail
sleep "${CHECK_SLEEP:-10}"
[[ -f FAIL ]] && { echo "FAIL marker present"; exit 1; }
[[ -f FAIL_IN_QUEUE && "${EVENT:-}" == "merge_group" ]] && { echo "FAIL_IN_QUEUE marker in merge group"; exit 1; }
[[ -f FLAKY ]] && (( RANDOM % 2 )) && { echo "flaky failure"; exit 1; }
python3 -m unittest -q test_calc
echo ok
