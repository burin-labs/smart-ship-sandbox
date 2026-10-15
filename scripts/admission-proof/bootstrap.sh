#!/usr/bin/env bash
set -euo pipefail

readonly proof_root="${RUNNER_TEMP:?}/smart-ship-proof"
readonly script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$proof_root"
cp -R "$script_directory" "$proof_root/driver"
product_sha="$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).commit' "$proof_root/driver/product-source.json")"
[[ "$product_sha" =~ ^[0-9a-f]{40}$ ]]
git init --quiet "$proof_root/source"
git -C "$proof_root/source" remote add origin https://github.com/burin-labs/harn.git
git -C "$proof_root/source" sparse-checkout init --cone
git -C "$proof_root/source" sparse-checkout set personas/smart_ship
git -C "$proof_root/source" fetch --filter=blob:none --depth=1 origin "$product_sha"
git -C "$proof_root/source" checkout --detach "$product_sha"
harn package pack "$proof_root/source/personas/smart_ship" --output "$proof_root/package" --json > "$proof_root/package-receipt.json"
cd "$proof_root/package"
harn install --frozen
cd "$proof_root/driver"
harn install
harn install --frozen
