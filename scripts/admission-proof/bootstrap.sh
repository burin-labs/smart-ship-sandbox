#!/usr/bin/env bash
set -euo pipefail

readonly proof_root="${RUNNER_TEMP:?}/smart-ship-proof"
readonly script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$proof_root"
cp -R "$script_directory" "$proof_root/driver"
bash "$script_directory/../install-qualified-controller.sh" "$proof_root" "$script_directory/../controller-source.json"
cd "$proof_root/driver"
"${HARN_BIN:-harn}" install
"${HARN_BIN:-harn}" install --frozen
