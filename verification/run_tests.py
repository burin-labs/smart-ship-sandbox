"""Run the complete stock unittest inventory and report cases that actually started."""
import json
from pathlib import Path
import sys
import unittest
import xml.etree.ElementTree as xml


class ObservedResult(unittest.TextTestResult):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.observed = []

    def startTest(self, test):
        self.observed.append(test)
        super().startTest(test)


expected = json.loads(Path("verification/inventory.json").read_text())
if (not isinstance(expected, list) or not expected
        or any(not isinstance(name, str) or not name for name in expected)
        or len(set(expected)) != len(expected)):
    raise ValueError("the declared test inventory is empty, malformed, or duplicated")

suite = unittest.TestSuite([
    unittest.defaultTestLoader.discover(".", pattern="test_calc.py"),
    unittest.defaultTestLoader.discover("verification", pattern="test_*.py"),
])
result = unittest.TextTestRunner(resultclass=ObservedResult, verbosity=2).run(suite)
root = xml.Element("testsuite", tests=str(result.testsRun),
                   failures=str(len(result.failures)), errors=str(len(result.errors)),
                   skipped=str(len(result.skipped)))
failures = {case.id(): message for case, message in result.failures}
errors = {case.id(): message for case, message in result.errors}
skips = {case.id(): reason for case, reason in result.skipped}
for case in result.observed:
    node = xml.SubElement(root, "testcase", name=case.id())
    if case.id() in failures:
        xml.SubElement(node, "failure").text = failures[case.id()]
    elif case.id() in errors:
        xml.SubElement(node, "error").text = errors[case.id()]
    elif case.id() in skips:
        xml.SubElement(node, "skipped", message=skips[case.id()])
xml.ElementTree(root).write(".ship-report.xml", encoding="utf-8", xml_declaration=True)
observed = [case.id() for case in result.observed]
missing = sorted(set(expected) - set(observed))
unexpected = sorted(set(observed) - set(expected))
complete = not missing and not unexpected and len(set(observed)) == len(observed)
print(json.dumps({"declared": len(expected), "observed": len(observed),
                  "missing": missing, "unexpected": unexpected,
                  "complete": complete}), file=sys.stderr)
sys.exit(0 if result.wasSuccessful() and complete else 1)
