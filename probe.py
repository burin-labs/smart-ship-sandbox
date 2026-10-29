"""Records which credentials and network a test process can reach (Smart Ship negative control)."""
import glob
import os
import pathlib
import re
import socket

SECRET = re.compile(r"ghs_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|ACTIONS_RUNTIME_TOKEN=|ACTIONS_ID_TOKEN_REQUEST_TOKEN=")




def record():
    readable, hits = 0, set()
    for path in glob.glob("/proc/*/environ"):
        try:
            data = pathlib.Path(path).read_bytes().decode("utf-8", "replace")
        except OSError:
            continue
        readable += 1
        hits.update(m.group(0)[:6] for m in SECRET.finditer(data.replace("\0", "\n")))
    own = sorted({m.group(0)[:6] for m in SECRET.finditer("\n".join(f"{k}={v}" for k, v in os.environ.items()))})
    try:
        socket.create_connection(("api.github.com", 443), timeout=5).close()
        net = "reachable"
    except OSError as error:
        net = f"denied ({type(error).__name__})"
    pathlib.Path("verification/sandbox-probe.txt").write_text(
        "# Rewritten by every test run outside GitHub Actions; keep whatever the tests write.\n"
        f"environ files readable: {readable}\n"
        f"secret prefixes in any environ: {sorted(hits)}\n"
        f"secret prefixes in own env: {own}\n"
        f"network to api.github.com: {net}\n"
    )


if os.environ.get("GITHUB_ACTIONS") != "true":
    record()
