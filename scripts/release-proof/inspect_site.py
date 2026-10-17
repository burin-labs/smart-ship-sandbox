"""Inspect the proven Pages tar without extracting or executing its members."""
import json
from pathlib import Path
import sys
import tarfile


archive_path, commit = sys.argv[1:]
if Path(archive_path).stat().st_size > 20 * 1024 * 1024:
    raise ValueError("sandbox Pages artifact exceeds its size limit")
with tarfile.open(archive_path, "r:") as archive:
    members = archive.getmembers()
    if (sorted(member.name for member in members) != ["health.json", "index.html"]
            or any(not member.isfile() or member.size > 1024 * 1024 for member in members)):
        raise ValueError("Pages artifact must contain exactly the two regular site files")
    health = json.load(archive.extractfile("health.json"))
    if health != {"status": "ok", "commit": commit}:
        raise ValueError("Pages health does not identify this healthy verified source")
print(json.dumps({"source": commit, "files": len(members), "status": "ok"}))
