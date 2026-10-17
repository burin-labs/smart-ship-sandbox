#!/usr/bin/env bash
set -euo pipefail

readonly root="${RUNNER_TEMP:?}/smart-ship-release"
readonly scripts="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$root/driver"
cp "$scripts/"*.harn "$scripts/harn.toml" "$scripts/configuration.json" "$root/driver/"
cp "$scripts/inspect_site.py" "$scripts/request.mjs" "$root/driver/"
bash "$scripts/../install-qualified-controller.sh" "$root" 39005135303 \
  7ba5a6da3dbb6dabdd61864c050a911ce8b0dfd4 \
  383dd9c7ca30fa5270f015cba0bb01050d04b3805aded7d0d097188ce2ba7d1e
cd "$root/driver"
harn install
harn install --frozen
