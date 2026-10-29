#!/usr/bin/env python3
"""Scan hosted evidence by secret fingerprints without printing candidate bytes."""

import argparse
import hashlib
import json
from pathlib import Path


def scan(path, targets, canary):
    counts = {name: 0 for name in targets}
    positive = 0
    longest = max([len(canary)] + [entry["length"] for entry in targets.values()])
    tail = b""
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            data = tail + chunk
            # Count only windows whose final byte is in this new chunk.
            boundary = len(tail)
            for name, entry in targets.items():
                length = entry["length"]
                for start in range(max(0, boundary - length + 1), len(data) - length + 1):
                    window = data[start : start + length]
                    if hashlib.sha256(window).hexdigest().startswith(entry["sha256_prefix"]):
                        counts[name] += 1
            start = max(0, boundary - len(canary) + 1)
            while (position := data.find(canary, start)) >= 0:
                positive += 1
                start = position + 1
            tail = data[-(longest - 1) :] if longest > 1 else b""
    return counts, positive


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fingerprints", required=True)
    parser.add_argument("--canary", required=True)
    parser.add_argument("--require-run-record", action="store_true")
    parser.add_argument("paths", nargs="+")
    args = parser.parse_args()
    targets = json.loads(Path(args.fingerprints).read_text())
    if set(targets) != {"token", "token_base64"}:
        raise ValueError("both token and token_base64 fingerprints are required")
    for entry in targets.values():
        prefix = entry.get("sha256_prefix", "")
        if not isinstance(entry.get("length"), int) or entry["length"] < 1:
            raise ValueError("fingerprint length must be positive")
        if len(prefix) < 16 or any(c not in "0123456789abcdef" for c in prefix):
            raise ValueError("fingerprint must be at least 16 lowercase hexadecimal digits")
    canary = args.canary.encode()
    if not canary:
        raise ValueError("positive control must be nonempty")
    files = []
    for name in args.paths:
        path = Path(name)
        if path.is_dir():
            files.extend(sorted(item for item in path.rglob("*") if item.is_file()))
        elif path.is_file():
            files.append(path)
        else:
            raise ValueError("evidence path is missing")
    if not files:
        raise ValueError("evidence census is empty")
    totals = {name: 0 for name in targets}
    positive = 0
    hit_files = []
    positive_files = []
    positive_run_records = []
    for path in files:
        counts, found = scan(path, targets, canary)
        positive += found
        if found:
            positive_files.append(str(path))
            if args.require_run_record:
                try:
                    record = json.loads(path.read_text())
                except (UnicodeError, json.JSONDecodeError):
                    record = None
                if isinstance(record, dict) and record.get("_type") == "run_record":
                    positive_run_records.append(str(path))
        if any(counts.values()):
            hit_files.append({"path": str(path), "fingerprints": counts})
        for name, count in counts.items():
            totals[name] += count
    result = {"files_scanned": len(files), "positive_control_hits": positive,
              "positive_files": positive_files, "positive_run_records": positive_run_records,
              "fingerprint_hits": totals, "hit_files": hit_files}
    print(json.dumps(result, sort_keys=True))
    return 0 if (positive > 0 and not any(totals.values())
                 and (not args.require_run_record or positive_run_records)) else 1


if __name__ == "__main__":
    raise SystemExit(main())
