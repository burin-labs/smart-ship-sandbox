"""Prove a failing combined tree cannot reuse the preceding release archive."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


REPOSITORY = Path(__file__).resolve().parents[2]


class ReleaseBuildTest(unittest.TestCase):
    def test_failed_combination_removes_previous_release_bytes(self):
        with tempfile.TemporaryDirectory(prefix="smart-ship-release-build-") as temporary:
            root = Path(temporary) / "source"
            shutil.copytree(REPOSITORY, root, ignore=shutil.ignore_patterns(
                ".git", ".codex", ".harn", "__pycache__", ".smart-ship-pages.tar", ".ship-report.xml"
            ))
            for arguments in [
                ["init", "--quiet"], ["add", "--all"], ["commit", "--quiet", "-m", "fixture"],
            ]:
                subprocess.run([
                    "git", "-c", "user.name=Release fixture", "-c", "user.email=fixture@example.invalid",
                    "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", *arguments,
                ], cwd=root, check=True, capture_output=True)
            command = [sys.executable, "verification/build_release.py"]
            first = subprocess.run(command, cwd=root, capture_output=True)
            self.assertEqual(first.returncode, 0, first.stderr.decode())
            artifact = root / ".smart-ship-pages.tar"
            original = artifact.read_bytes()
            second = subprocess.run(command, cwd=root, capture_output=True)
            self.assertEqual(second.returncode, 0, second.stderr.decode())
            self.assertEqual(artifact.read_bytes(), original)
            commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
            inspected = subprocess.run([
                sys.executable, "scripts/release-proof/inspect_site.py", str(artifact), commit,
            ], cwd=root, capture_output=True)
            self.assertEqual(inspected.returncode, 0, inspected.stderr.decode())
            self.assertEqual(json.loads(inspected.stdout)["files"], 2)
            (root / "verification/capacity.py").write_text(
                "IDLE_CAPACITY = 2\n\ndef capacity_for(workers):\n    return IDLE_CAPACITY\n"
            )
            (root / "verification/workers.py").write_text("WORKERS = 3\n")
            (root / "verification/expectations.json").write_text('{"idleCapacity":2}\n')
            failed = subprocess.run(command, cwd=root, capture_output=True)
            self.assertNotEqual(failed.returncode, 0)
            self.assertIn(b"test_every_worker_has_capacity", failed.stderr)
            self.assertFalse(artifact.exists())


if __name__ == "__main__":
    unittest.main()
