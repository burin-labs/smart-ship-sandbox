import json
from pathlib import Path
import unittest

from capacity import IDLE_CAPACITY, capacity_for
from workers import WORKERS


class CapacityTests(unittest.TestCase):
    def test_every_worker_has_capacity(self):
        self.assertGreaterEqual(capacity_for(WORKERS), WORKERS)

    def test_capacity_stays_within_budget(self):
        self.assertLessEqual(capacity_for(WORKERS), 10)

    def test_reviewed_idle_limit_is_preserved(self):
        expected = json.loads(
            Path(__file__).with_name("expectations.json").read_text()
        )["idleCapacity"]
        self.assertEqual(IDLE_CAPACITY, expected)
        self.assertEqual(capacity_for(1), expected)

    def test_configuration_is_nonempty(self):
        self.assertIsInstance(WORKERS, int)
        self.assertGreater(WORKERS, 0)
        self.assertIsInstance(IDLE_CAPACITY, int)
        self.assertGreater(IDLE_CAPACITY, 0)
