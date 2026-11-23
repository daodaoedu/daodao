"""Windows setup regressions: hook loading and test-integrity enforcement."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import shutil
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
ADAPTER = ROOT / 'plugin' / 'hooks' / 'run-windows.py'
spec = importlib.util.spec_from_file_location('windows_adapter', ADAPTER)
adapter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)


class WindowsHooks(unittest.TestCase):
    def test_hook_metadata_uses_fields_accepted_by_codex(self):
        config = json.loads((ROOT / '.codex' / 'hooks.json').read_text(encoding='utf-8'))
        self.assertEqual(set(config), {'description', 'hooks'})
        handlers = [h for groups in config['hooks'].values() for g in groups for h in g['hooks']]
        self.assertEqual(len(handlers), 7)
        self.assertTrue(all(h.get('commandWindows') for h in handlers))

    def test_normalization_preserves_file_content(self):
        event = {'cwd': 'C:\\repo', 'tool_input': {'file_path': 'C:\\repo\\test.spec.ts', 'content': 'a\\b'}}
        result = adapter.normalize_event(event)
        self.assertEqual(result['cwd'], 'C:/repo')
        self.assertEqual(result['tool_input']['file_path'], 'C:/repo/test.spec.ts')
        self.assertEqual(result['tool_input']['content'], 'a\\b')

    def run_integrity(self, text):
        with tempfile.TemporaryDirectory() as directory:
            event = {'tool_name': 'Write', 'cwd': directory,
                     'tool_input': {'file_path': str(Path(directory) / 'sample.test.ts'), 'content': text}}
            return subprocess.run([sys.executable, str(ADAPTER), 'test-integrity-guard.py'],
                                  input=json.dumps(event), text=True, capture_output=True)

    def test_focused_test_is_still_blocked_through_adapter(self):
        result = self.run_integrity("test." + "only('example', () => {});\n")
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn('Test integrity blocked', result.stderr)

    def test_executable_test_is_allowed_through_adapter(self):
        result = self.run_integrity("test('example', () => { expect(1 + 1).toBe(2); });\n")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_arbitrary_script_cannot_be_selected(self):
        result = subprocess.run([sys.executable, str(ADAPTER), '../scripts/arbitrary.py'],
                                input='{}', text=True, capture_output=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn('canonical Dao Dao hook', result.stderr)

    def test_bash_hook_starts_in_the_windows_execution_environment(self):
        result = subprocess.run(
            [sys.executable, str(ADAPTER), 'session-start.sh'],
            input=json.dumps({'hook_event_name': 'SessionStart', 'cwd': str(ROOT)}),
            encoding='utf-8', capture_output=True, timeout=40,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('daodao-guard', result.stdout)
        self.assertNotRegex(result.stderr, r'child_copy:|dofork:|Resource temporarily unavailable|NtCreateDirectoryObject')

    def test_real_codex_patch_event_blocks_sensitive_file(self):
        patch = '*** Begin Patch\n*** Add File: disposable.env\n+SYNTHETIC=1\n*** End Patch'
        event = {'tool_name': 'apply_patch', 'hook_event_name': 'PreToolUse',
                 'cwd': str(ROOT), 'tool_input': {'command': patch}}
        result = subprocess.run([sys.executable, str(ADAPTER), 'pre-write-guard.sh'],
                                input=json.dumps(event), encoding='utf-8', capture_output=True, timeout=40)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn('禁止寫入敏感檔案', result.stderr)

    def test_stop_returns_codex_json(self):
        event = {'hook_event_name': 'Stop', 'cwd': str(ROOT)}
        result = subprocess.run([sys.executable, str(ADAPTER), 'stop-quality-gate.sh'],
                                input=json.dumps(event), encoding='utf-8', capture_output=True, timeout=40)
        self.assertEqual(result.returncode, 0, result.stderr)
        output = json.loads(result.stdout)
        self.assertIsInstance(output, dict)
        self.assertIn('systemMessage', output)

    def test_powershell_preserves_the_guard_rejection_code(self):
        config = json.loads((ROOT / '.codex' / 'hooks.json').read_text(encoding='utf-8'))
        command = config['hooks']['PreToolUse'][0]['hooks'][0]['commandWindows']
        event = {'tool_name': 'apply_patch', 'hook_event_name': 'PreToolUse', 'cwd': str(ROOT),
                 'tool_input': {'command': '*** Begin Patch\n*** Add File: dummy.env\n+FIXTURE=1\n*** End Patch'}}
        result = subprocess.run([shutil.which('pwsh') or 'powershell.exe', '-NoProfile', '-NonInteractive', '-Command', command],
                                cwd=ROOT, input=json.dumps(event), encoding='utf-8', capture_output=True, timeout=40)
        self.assertEqual(result.returncode, 2, result.stderr)

    def test_patch_integrity_checks_later_files_in_a_multi_file_patch(self):
        patch = ('*** Begin Patch\n*** Add File: harmless.json\n+{}\n'
                 '*** Add File: dummy.test.ts\n+test.' + "only('fixture', () => {});\n*** End Patch")
        event = {'tool_name': 'apply_patch', 'hook_event_name': 'PreToolUse', 'cwd': str(ROOT),
                 'tool_input': {'command': patch}}
        result = subprocess.run([sys.executable, str(ADAPTER), 'test-integrity-guard.py'],
                                input=json.dumps(event), encoding='utf-8', capture_output=True, timeout=40)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn('Test integrity blocked', result.stderr)

    def test_update_patch_preserves_legacy_markers_but_blocks_new_ones(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'legacy.test.ts'
            before = "test." + "skip('legacy', () => {});\nconst value = 1;\n"
            path.write_text(before, encoding='utf-8')
            patch = f'*** Begin Patch\n*** Update File: {path.as_posix()}\n@@\n-const value = 1;\n+const value = 2;\n*** End Patch'
            event = {'tool_name': 'apply_patch', 'hook_event_name': 'PreToolUse', 'cwd': directory,
                     'tool_input': {'command': patch}}
            allowed = subprocess.run([sys.executable, str(ADAPTER), 'test-integrity-guard.py'],
                                     input=json.dumps(event), encoding='utf-8', capture_output=True, timeout=40)
            self.assertEqual(allowed.returncode, 0, allowed.stderr)
            event['tool_input']['command'] = patch.replace('+const value = 2;', "+test." + "only('new', () => {});")
            blocked = subprocess.run([sys.executable, str(ADAPTER), 'test-integrity-guard.py'],
                                     input=json.dumps(event), encoding='utf-8', capture_output=True, timeout=40)
            self.assertEqual(blocked.returncode, 2, blocked.stderr)
            self.assertEqual(path.read_text(encoding='utf-8'), before)

    def test_bootstrap_reads_a_unicode_checkout_path(self):
        config = json.loads((ROOT / '.codex' / 'hooks.json').read_text(encoding='utf-8'))
        command = config['hooks']['SessionStart'][0]['hooks'][0]['commandWindows']
        with tempfile.TemporaryDirectory() as directory:
            checkout = Path(directory) / '測試-checkout'
            hooks = checkout / 'plugin' / 'hooks'
            hooks.mkdir(parents=True)
            (hooks / 'run-windows.py').write_text("print('unicode-bootstrap-ok')\n", encoding='utf-8')
            subprocess.run(['git', 'init', '-q', str(checkout)], check=True, capture_output=True)
            result = subprocess.run([shutil.which('pwsh') or 'powershell.exe', '-NoProfile', '-NonInteractive', '-Command', command],
                                    cwd=checkout, input='{}', encoding='utf-8', capture_output=True, timeout=40)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout.strip(), 'unicode-bootstrap-ok')


    def test_shell_python_uses_selected_interpreter_without_a_python3_alias(self):
        # MXC virtualizes the Windows TEMP directory differently for MSYS.
        with tempfile.TemporaryDirectory(prefix='.windows-hook-test-', dir=ROOT) as directory:
            hooks = Path(directory) / 'plugin' / 'hooks'
            hooks.mkdir(parents=True)
            shutil.copyfile(ADAPTER, hooks / 'run-windows.py')
            (hooks / 'session-start.sh').write_text(
                "python3 -c 'import sys; print(sys.executable)'\n", encoding='utf-8')
            env = os.environ.copy()
            env['CODEX_HOME'] = str(Path(directory) / 'empty-codex-home')
            private_bash = ROOT.parent / 'daodao-hook-runtime' / 'usr' / 'bin' / 'bash.exe'
            if 'DAODAO_HOOK_BASH' not in env and private_bash.is_file():
                env['DAODAO_HOOK_BASH'] = str(private_bash)
            result = subprocess.run([sys.executable, str(hooks / 'run-windows.py'), 'session-start.sh'],
                                    env=env, input='{}', encoding='utf-8', capture_output=True, timeout=40)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(Path(result.stdout.strip()).resolve(), Path(sys.executable).resolve())


if __name__ == '__main__':
    unittest.main()
