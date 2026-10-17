#!/usr/bin/env bash
set -euo pipefail

readonly root="${RUNNER_TEMP:?}/smart-ship-release"
readonly scripts="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$root/download" "$root/package" "$root/driver"
cp "$scripts/"*.harn "$scripts/harn.toml" "$scripts/configuration.json" "$root/driver/"
cp "$scripts/inspect_site.py" "$scripts/request.mjs" "$root/driver/"
readonly archive="$root/download/harn-smart-ship-0.1.0.tar.gz"
if [[ ! -f "$archive" ]]; then
  gh run download 39005135303 --repo burin-labs/harn --name harn-smart-ship-release-files --dir "$root/download"
fi
printf '%s  %s\n' 383dd9c7ca30fa5270f015cba0bb01050d04b3805aded7d0d097188ce2ba7d1e "$archive" | shasum -a 256 --check --status
gh attestation verify "$archive" --repo burin-labs/harn \
  --signer-workflow burin-labs/harn/.github/workflows/build-smart-ship-package.yml \
  --source-digest 7ba5a6da3dbb6dabdd61864c050a911ce8b0dfd4 \
  --source-ref refs/heads/main --deny-self-hosted-runners \
  --predicate-type https://harnlang.com/attestations/source-package/v1 \
  --format json > "$root/archive-attestation.json"
tar -xzf "$archive" -C "$root/package" --strip-components=1
cd "$root/package"
harn install --frozen
cd "$root/driver"
harn install
harn install --frozen
