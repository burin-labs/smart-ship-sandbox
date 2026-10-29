#!/usr/bin/env python3
"""Emit lengths and hashes of a transient token, never its value."""
import base64
import hashlib
import json
import os
from pathlib import Path
import sys

token = os.environ.get("GH_TOKEN", "").encode()
if not token:
    sys.exit("Missing transient app token")
values = {"token": token, "token_base64": base64.b64encode(token)}
fingerprints = {name: {"length": len(value), "sha256_prefix": hashlib.sha256(value).hexdigest()}
                for name, value in values.items()}
output = Path(os.environ["RUNNER_TEMP"]) / "smart-ship-audit-fingerprints.json"
descriptor = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(descriptor, "w") as stream:
    json.dump(fingerprints, stream)
print(json.dumps({"fingerprints": fingerprints, "positive_canary": os.environ["AUDIT_CANARY"]}))
