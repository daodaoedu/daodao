import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[2] / 'skills/blog-publisher/scripts/preflight.py'


class PreflightBridgeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name).resolve()
        self.frontend = self.root / 'frontend with spaces'
        package = self.frontend / 'packages/blog-content/package.json'
        package.parent.mkdir(parents=True)
        package.write_text(json.dumps({'name': '@daodao/blog-content'}))
        self.content = self.root / 'content with spaces'
        self.content.mkdir()
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        self.arguments = self.root / 'arguments.json'
        self.env = {**os.environ, 'PATH': str(self.bin), 'ARGUMENT_FILE': str(self.arguments)}
        self.python = os.sys.executable

    def tearDown(self):
        self.temp.cleanup()

    def fake_pnpm(self, code):
        executable = self.bin / 'pnpm'
        executable.write_text(f'#!{self.python}\nimport json,os,sys\nopen(os.environ["ARGUMENT_FILE"],"w").write(json.dumps(sys.argv[1:]))\nprint(json.dumps({{"ok":{code == 0!r},"validator":"actual delegated process"}}))\nsys.exit({code})\n')
        executable.chmod(0o755)

    def run_bridge(self, *extra):
        return subprocess.run([self.python, str(SCRIPT), '--frontend', str(self.frontend), '--content', str(self.content), *extra], capture_output=True, text=True, env=self.env)

    def test_missing_tool_does_not_claim_preflight_or_write(self):
        result = self.run_bridge()
        self.assertEqual(result.returncode, 2)
        self.assertIn('pnpm unavailable', json.loads(result.stdout)['errors'][0]['message'])
        self.assertFalse(self.arguments.exists())
        self.assertEqual(list(self.content.iterdir()), [])

    def test_wrong_checkout_stops_before_execution(self):
        self.fake_pnpm(0)
        (self.frontend / 'packages/blog-content/package.json').write_text('{"name":"other"}')
        result = self.run_bridge()
        self.assertEqual(result.returncode, 2)
        self.assertFalse(self.arguments.exists())

    def test_default_publish_forwards_private_inputs_as_arguments_without_shell(self):
        self.fake_pnpm(0)
        approvals = self.root / 'private approval $(do not execute).json'
        baseline = self.root / 'baseline.json'
        result = self.run_bridge('--approvals', str(approvals), '--baseline', str(baseline))
        self.assertEqual(result.returncode, 0)
        arguments = json.loads(self.arguments.read_text())
        self.assertEqual(arguments, ['--dir', str(self.frontend), '--filter', '@daodao/blog-content', 'validate', '--root', str(self.content), '--mode', 'publish', '--approvals', str(approvals), '--baseline', str(baseline)])
        self.assertTrue(json.loads(result.stdout)['ok'])
        self.assertEqual(list(self.content.iterdir()), [])

    def test_validator_rejection_exit_and_output_are_preserved(self):
        self.fake_pnpm(1)
        result = self.run_bridge('--mode', 'draft')
        self.assertEqual(result.returncode, 1)
        self.assertFalse(json.loads(result.stdout)['ok'])
        self.assertEqual(json.loads(self.arguments.read_text())[-2:], ['--mode', 'draft'])

    def test_unknown_mode_does_not_execute_validator(self):
        self.fake_pnpm(0)
        self.assertNotEqual(self.run_bridge('--mode', 'bypass').returncode, 0)
        self.assertFalse(self.arguments.exists())


if __name__ == '__main__':
    unittest.main()
