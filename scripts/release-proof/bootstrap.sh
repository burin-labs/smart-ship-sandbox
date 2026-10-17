#!/usr/bin/env bash
set -euo pipefail

readonly root="${RUNNER_TEMP:?}/smart-ship-release"
readonly scripts="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$root/driver"
cp "$scripts/"*.harn "$scripts/harn.toml" "$scripts/configuration.json" "$root/driver/"
cp "$scripts/inspect_site.py" "$scripts/request.mjs" "$root/driver/"
bash "$scripts/../install-qualified-controller.sh" "$root" "$scripts/../controller-source.json"
cd "$root/driver"
"${HARN_BIN:-harn}" install
"${HARN_BIN:-harn}" install --frozen
