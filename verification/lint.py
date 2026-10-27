"""Small, dependency-free lint gate for Smart Ship repair fixtures."""

from pathlib import Path
import sys


def main():
    fixture_paths = sorted(Path("verification").glob("*.py"))
    if not fixture_paths:
        print("verification Python files are missing", file=sys.stderr)
        return 1
    paths = [Path("calc.py"), *fixture_paths]
    failures = []
    for path in paths:
        source = path.read_text(encoding="utf-8")
        try:
            compile(source, str(path), "exec")
        except SyntaxError as error:
            failures.append(f"{path}:{error.lineno}: {error.msg}")
        for number, line in enumerate(source.splitlines(), 1):
            if line.rstrip(" \t") != line:
                failures.append(f"{path}:{number}: trailing whitespace")
    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1
    print(f"lint passed: {len(paths)} Python files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
