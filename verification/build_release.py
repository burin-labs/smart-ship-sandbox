"""Verify the source and build the exact tar bytes consumed by GitHub Pages."""
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile


def build():
    output = Path(".smart-ship-pages.tar")
    output.unlink(missing_ok=True)
    subprocess.run([sys.executable, "verification/run_tests.py"], check=True)
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    if len(commit) != 40 or any(char not in "0123456789abcdef" for char in commit):
        raise ValueError("release source commit is unmeasured")
    status = Path("app/status.txt").read_text().strip()
    files = {
        "health.json": json.dumps({"status": status, "commit": commit}, sort_keys=True) + "\n",
        "index.html": "Smart Ship sandbox\n",
    }
    with tarfile.open(output, "w", format=tarfile.USTAR_FORMAT) as archive:
        for name, content in sorted(files.items()):
            data = content.encode()
            info = tarfile.TarInfo(name)
            info.size = len(data)
            info.mode = 0o644
            info.mtime = 0
            archive.addfile(info, io.BytesIO(data))


if __name__ == "__main__":
    build()
