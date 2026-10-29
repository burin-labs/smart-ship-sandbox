#!/usr/bin/env python3
import base64
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

scanner = str(Path(__file__).with_name("smart_ship_credential_audit.py"))
token = b"synthetic-token-for-scanner-falsifier-0123456789"
encoded = base64.b64encode(token)
canary = "synthetic-positive-control"
targets = {
    name: {"length": len(value), "sha256_prefix": hashlib.sha256(value).hexdigest()[:16]}
    for name, value in {"token": token, "token_base64": encoded}.items()
}

with tempfile.TemporaryDirectory(prefix="ship-audit-control-") as directory:
    root = Path(directory)
    fingerprints = root / "fingerprints.json"
    fingerprints.write_text(json.dumps(targets))
    evidence = root / "evidence.txt"
    command = ["python3", scanner, "--fingerprints", str(fingerprints), "--canary", canary, str(evidence)]
    cases = [
        (b"ordinary evidence " + canary.encode(), 0, {"token": 0, "token_base64": 0}, 1),
        (b"ordinary evidence without control", 1, {"token": 0, "token_base64": 0}, 0),
        (b"x" * (1024 * 1024 - 8) + token + canary.encode(), 1, {"token": 1, "token_base64": 0}, 1),
        (b"x" * (1024 * 1024 - 8) + encoded + canary.encode(), 1, {"token": 0, "token_base64": 1}, 1),
    ]
    for payload, expected_exit, expected_hits, expected_positive in cases:
        evidence.write_bytes(payload)
        result = subprocess.run(command, capture_output=True, text=True, check=False)
        data = json.loads(result.stdout)
        assert result.returncode == expected_exit, result.stderr
        assert data["fingerprint_hits"] == expected_hits, data
        assert data["positive_control_hits"] == expected_positive, data
    record_command = command[:-1] + ["--require-run-record", str(evidence)]
    evidence.write_text(json.dumps({"_type": "not_a_run_record", "task": canary}))
    result = subprocess.run(record_command, capture_output=True, text=True, check=False)
    assert result.returncode == 1
    evidence.write_text(json.dumps({"_type": "run_record", "task": canary}))
    result = subprocess.run(record_command, capture_output=True, text=True, check=False)
    assert result.returncode == 0
    assert json.loads(result.stdout)["positive_run_records"] == [str(evidence)]
    print("scanner controls passed: absent, missing canary, token and base64 across chunk boundaries")
