#!/usr/bin/env bash
set -euo pipefail

# Callers supply pins from trusted control source, never submitted evidence.
readonly root="${1:?controller installation root required}"
readonly source_file="${2:?trusted controller source file required}"
[[ $# == 2 && "$root" == "${RUNNER_TEMP:?}/"* ]]
qualified_pin="$(node -p 'const s = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")); [s.run, s.commit, s.archive_sha256].join("\t")' "$source_file")"
IFS=$'\t' read -r run source digest <<< "$qualified_pin"
readonly run source digest
[[ "$run" =~ ^[1-9][0-9]*$ && "$source" =~ ^[0-9a-f]{40}$ && "$digest" =~ ^[0-9a-f]{64}$ ]]
mkdir -p "$root/download" "$root/package"
readonly archive="$root/download/harn-smart-ship-0.1.0.tar.gz"
if [[ ! -f "$archive" ]]; then
  gh run download "$run" --repo burin-labs/harn --name harn-smart-ship-release-files --dir "$root/download"
fi
printf '%s  %s\n' "$digest" "$archive" | shasum -a 256 --check --status
gh attestation verify "$archive" --repo burin-labs/harn \
  --signer-workflow burin-labs/harn/.github/workflows/build-smart-ship-package.yml \
  --source-digest "$source" --source-ref refs/heads/main --deny-self-hosted-runners \
  --predicate-type https://harnlang.com/attestations/source-package/v1 \
  --format json > "$root/archive-attestation.json"
tar -xzf "$archive" -C "$root/package" --strip-components=1
cd "$root/package"
"${HARN_BIN:-harn}" install --frozen
