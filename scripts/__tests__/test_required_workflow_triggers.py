import unittest
from pathlib import Path

import yaml


WORKFLOWS_DIR = Path(__file__).resolve().parents[2] / ".github" / "workflows"
REQUIRED_WORKFLOWS = (
    "spec-audit-regression.yml",
    "skill-evals.yml",
    "shared-config-regression.yml",
)


class RequiredWorkflowTriggersTest(unittest.TestCase):
    def test_pull_requests_always_schedule_required_workflows(self):
        for filename in REQUIRED_WORKFLOWS:
            with self.subTest(workflow=filename):
                # BaseLoader preserves GitHub's `on` key instead of YAML 1.1 booleans.
                workflow = yaml.load(
                    (WORKFLOWS_DIR / filename).read_text(), Loader=yaml.BaseLoader
                )
                events = workflow["on"]
                self.assertIn("pull_request", events)
                trigger = events["pull_request"] or {}
                for key in ("paths", "paths-ignore", "branches-ignore"):
                    self.assertNotIn(key, trigger)
                if "branches" in trigger:
                    self.assertIn("main", trigger["branches"])
                if "types" in trigger:
                    self.assertTrue(
                        {"opened", "reopened", "synchronize"}.issubset(trigger["types"])
                    )

    def test_required_jobs_are_unconditional(self):
        for filename in REQUIRED_WORKFLOWS:
            workflow = yaml.load(
                (WORKFLOWS_DIR / filename).read_text(), Loader=yaml.BaseLoader
            )
            self.assertTrue(workflow["jobs"])
            for name, job in workflow["jobs"].items():
                with self.subTest(workflow=filename, job=name):
                    self.assertNotIn("if", job)
                    self.assertNotIn("needs", job)
                    self.assertNotIn("continue-on-error", job)


if __name__ == "__main__":
    unittest.main()
