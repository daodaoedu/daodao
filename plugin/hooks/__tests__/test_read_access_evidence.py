"""Regression contract for the shared read-access claim validator."""
import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'check-read-access-evidence.py'
spec = importlib.util.spec_from_file_location('read_access', SCRIPT)
assert spec and spec.loader
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)

NA = '讀取權限驗證：不適用：純 CSS 調整，沒有改查詢、權限或篩選'
APPLICABLE = '''讀取權限驗證：適用
### 核心旅程矩陣
| J-01 | 首頁到打卡 | 正常 | 同場 | ✅ 200 |
| J-02 | 首頁到打卡 | 錯誤路徑 | 場外 | ✅ 403 |
### 讀取權限驗證
- 入口與服務：首頁場次篩選 AI feed → server 詳情 → 打卡
- 固定資料：cohort=57，owner=2，peer=3，outsider=4，退出者=5
- 資料庫驗證：✅ PostgreSQL；指令：pytest tests/read_acl.py；結果：12 passed；證據：evidence/db.log
- 快取撤權：✅ 先讀取後退出，再查無舊資料；證據：evidence/cache.log
- 期限邊界：✅ 第90天可讀，第91天拒絕；證據：evidence/expiry.log
| 角色 | 預期 | 實際 | 資料斷言 | 結果 | 證據 |
| 本人 | 200 可讀 | HTTP 200 | 包含自己的打卡 | ✅ | evidence/owner.json |
| 同範圍成員 | 200 可讀 | HTTP 200 | 私人留言不含 marker | ✅ | evidence/peer.json |
| 範圍外使用者 | 403 拒絕 | HTTP 403 | 回應不含 private marker | ✅ | evidence/outsider.json |
| 已退出或移除 | 403 拒絕 | HTTP 403 | 回應不含 private marker | ✅ | evidence/exited.json |
| 未登入 | 403 拒絕 | HTTP 403 | 回應不含 private marker | ✅ | evidence/anonymous.json |
'''


def pr(text):
    return '## 驗證證據\n' + text


class ReadAccessEvidenceTests(unittest.TestCase):
    def test_complete_applicable_contract_and_concrete_na_pass(self):
        self.assertEqual(checker.validate(pr(APPLICABLE), 'pr'), [])
        self.assertEqual(checker.validate(pr(NA), 'pr'), [])
        self.assertEqual(checker.validate('## 驗證\n' + APPLICABLE, 'task'), [])

    def test_legacy_evidence_without_declaration_fails(self):
        self.assertIn('宣告', '\n'.join(checker.validate(pr('https://report.test\n| J-01 | y | 正常 | ✅ |'), 'pr')))

    def test_na_in_unrelated_section_does_not_bypass(self):
        self.assertTrue(checker.validate('## Summary\n' + NA + '\n## 驗證證據\nx', 'pr'))
        self.assertTrue(checker.validate(pr('x') + '\n## Test plan\n' + NA, 'pr'))

    def test_fenced_or_commented_declaration_is_not_evidence(self):
        for example in ('```\n' + NA + '\n```', '<!--\n' + NA + '\n-->'):
            self.assertTrue(checker.validate(pr(example), 'pr'))

    def test_na_requires_specific_reason_and_single_declaration(self):
        for declaration in ('讀取權限驗證：不適用：', '讀取權限驗證：不適用：<原因>', '讀取權限驗證：不適用：TBD'):
            self.assertTrue(checker.validate(pr(declaration), 'pr'))
        self.assertTrue(checker.validate(pr(NA + '\n讀取權限驗證：適用'), 'pr'))

    def test_applicable_cannot_use_core_journey_na(self):
        self.assertIn('不得用', '\n'.join(checker.validate(pr(APPLICABLE + '\n核心旅程不適用：沒有寫入 API'), 'pr')))

    def test_applicable_needs_own_complete_core_pair_even_with_outside_or_fenced_na(self):
        no_pair = APPLICABLE.replace('| J-02 | 首頁到打卡 | 錯誤路徑 | 場外 | ✅ 403 |', '')
        for trailer in ('\n## 舊紀錄\n核心旅程不適用：純CSS', '\n```\n核心旅程不適用：純CSS\n```'):
            self.assertIn('核心旅程矩陣', '\n'.join(checker.validate(pr(no_pair + trailer), 'pr')))

    def test_every_required_role_is_checked(self):
        for role in checker.ROLES:
            broken = '\n'.join(line for line in APPLICABLE.splitlines() if not line.startswith('| ' + role + ' |'))
            self.assertIn(role, '\n'.join(checker.validate(pr(broken), 'pr')))

    def test_role_na_is_explicit_and_specific(self):
        old = '| 已退出或移除 | 403 拒絕 | HTTP 403 | 回應不含 private marker | ✅ | evidence/exited.json |'
        replacement = '| 已退出或移除 | — | 不適用：本功能無成員或撤回操作 | — | 不適用 | — |'
        self.assertEqual(checker.validate(pr(APPLICABLE.replace(old, replacement)), 'pr'), [])
        self.assertTrue(checker.validate(pr(APPLICABLE.replace(old, replacement.replace('| 不適用 |', '| ✅ |'))), 'pr'))
        self.assertTrue(checker.validate(pr(APPLICABLE.replace(old, replacement.replace('本功能無成員或撤回操作', '<原因>'))), 'pr'))

    def test_checkmark_in_wrong_column_cannot_pass(self):
        broken = APPLICABLE.replace('HTTP 200 | 包含自己的打卡 | ✅', 'HTTP 200 ✅ | 包含自己的打卡 | 未填')
        self.assertIn('結果欄', '\n'.join(checker.validate(pr(broken), 'pr')))

    def test_actual_status_not_only_expected_and_negative_assertion_required(self):
        self.assertTrue(checker.validate(pr(APPLICABLE.replace('HTTP 403', '沒有測試')), 'pr'))
        broken = APPLICABLE.replace('回應不含 private marker', '檢查登入頁正常')
        self.assertIn('不含私人資料', '\n'.join(checker.validate(pr(broken), 'pr')))

    def test_data_assertion_and_source_cannot_be_placeholders(self):
        self.assertTrue(checker.validate(pr(APPLICABLE.replace('包含自己的打卡', '<資料斷言>')), 'pr'))
        self.assertTrue(checker.validate(pr(APPLICABLE.replace('evidence/owner.json', '<證據>')), 'pr'))

    def test_all_fields_required_in_own_section(self):
        for field in checker.FIELDS:
            broken = '\n'.join(line for line in APPLICABLE.splitlines() if not line.startswith('- ' + field + '：'))
            self.assertIn(field, '\n'.join(checker.validate(pr(broken), 'pr')))
        broken = APPLICABLE.replace('- 固定資料：', '### Other\n- 固定資料：')
        self.assertTrue(checker.validate(pr(broken), 'pr'))

    def test_database_evidence_must_name_real_engine_command_result(self):
        for bad in ('✅ mocked PostgreSQL；指令：pytest test.py；結果：passed；證據：evidence/db.log',
                    '✅ SQL 字串測試；指令：pytest test.py；結果：passed；證據：evidence/db.log',
                    '✅ PostgreSQL；結果：passed；證據：evidence/db.log'):
            text = APPLICABLE.replace('✅ PostgreSQL；指令：pytest tests/read_acl.py；結果：12 passed；證據：evidence/db.log', bad)
            self.assertIn('真實資料庫', '\n'.join(checker.validate(pr(text), 'pr')))

    def test_real_database_evidence_can_explain_non_mock_or_name_mock_files(self):
        text = APPLICABLE.replace('✅ PostgreSQL；指令：pytest tests/read_acl.py', '✅ PostgreSQL（非 mock）；指令：pytest tests/test_mock_acl.py')
        self.assertEqual(checker.validate(pr(text), 'pr'), [])

    def test_denied_200_empty_collection_requires_negative_data_assertion(self):
        text = APPLICABLE.replace('403 拒絕 | HTTP 403', '200 僅公開 | HTTP 200').replace('回應不含 private marker', '列表長度正確')
        self.assertIn('不含私人資料', '\n'.join(checker.validate(pr(text), 'pr')))

    def test_optional_database_cache_expiry_na_need_reasons(self):
        text = APPLICABLE
        for field in ('資料庫驗證', '快取撤權', '期限邊界'):
            old = next(line for line in text.splitlines() if line.startswith('- ' + field + '：'))
            text = text.replace(old, '- ' + field + '：不適用：本次純 client 路由，不改該行為')
        self.assertEqual(checker.validate(pr(text), 'pr'), [])
        self.assertTrue(checker.validate(pr(text.replace('不適用：本次純 client 路由，不改該行為', '不適用：')), 'pr'))


class JourneyObservationTests(unittest.TestCase):
    def body(self, actual, expected='送達通知已寄出', evidence=''):
        return pr(NA + '\n### 核心旅程矩陣\n'
                  '| ID | 旅程 | 類型 | 輸入 | 預期結果 | 實際 | 證據 |\n'
                  '|---|---|---|---|---|---|---|\n'
                  f'| J-01 | 送達通知 | 正常 | 到期信件 | {expected} | {actual} | {evidence} |\n'
                  '| J-02 | 送達通知 | 錯誤路徑 | 未到期 | 不送信 | ✅ job letter-2 remains delayed; evidence/job-2.json | evidence/job-2.json |')

    def test_generic_success_and_worker_no_request_are_not_observations(self):
        for actual in ('✅ PASS', '✅ pass；evidence/job.json', '✅ 未發請求',
                       '✅ 未發請求（worker）；PASS', '✅ 未發請求（worker）；10/10 PASS', '✅ 未發請求 (background worker)',
                       '✅ 符合預期', '✅ 成功', '✅ 未發請求（queue）',
                       '✅全部通過', '✅all checks PASS', '✅驗證完成'):
            with self.subTest(actual=actual):
                self.assertIn('具體觀察結果', '\n'.join(checker.validate(self.body(actual), 'pr')))

    def test_headerless_legacy_actual_precedes_optional_evidence(self):
        for actual in ('✅200', '✅ job letter-1 delayed→completed'):
            text = pr(NA + '\n|J-01|send|正常|input|expected|' + actual + '|evidence/send.json|')
            self.assertEqual(checker.validate(text, 'pr'), [])
        text = pr(NA + '\n|J-01|send|正常|input|expected|PASS|✅ evidence/send.json|')
        self.assertIn('具體觀察結果', '\n'.join(checker.validate(text, 'pr')))

    def test_pass_counts_are_not_http_observations(self):
        for actual in ('✅100/100 PASS', '✅all 200 checks passed'):
            self.assertIn('具體觀察結果', '\n'.join(checker.validate(self.body(actual), 'pr')))
        self.assertEqual(checker.validate(self.body('✅300 rows PASS'), 'pr'), [])
        self.assertEqual(checker.validate(self.body('✅ HTTP 200；100/100 PASS'), 'pr'), [])

    def test_repeating_expected_text_is_not_an_actual_value(self):
        self.assertIn('具體觀察結果', '\n'.join(checker.validate(self.body('✅ 送達通知已寄出'), 'pr')))
        self.assertEqual(checker.validate(self.body('✅ 201', expected='201'), 'pr'), [])
        self.assertEqual(checker.validate(self.body('✅ 200/201', expected='201'), 'pr'), [])

    def test_ui_validation_has_a_visible_result_even_without_http_request(self):
        actual = '✅ 未發請求：slug 欄位顯示「只能使用小寫英文」'
        self.assertEqual(checker.validate(self.body(actual, expected='顯示格式錯誤'), 'pr'), [])

    def test_worker_and_smtp_results_do_not_need_fabricated_http_status(self):
        for actual in ('✅ job future-letter-1 delayed→completed；evidence/job.json',
                       '✅ Mailpit 收到1封，message-id=mail-7，To=learner@example.invalid',
                       '✅ 畫面顯示「已寄出」，送達前時間軸不含原文'):
            with self.subTest(actual=actual):
                self.assertEqual(checker.validate(self.body(actual), 'pr'), [])

    def test_checkmark_in_evidence_column_does_not_make_actual_concrete(self):
        self.assertIn('具體觀察結果', '\n'.join(checker.validate(self.body('PASS', evidence='✅ evidence/job.json'), 'pr')))

    def test_na_read_access_does_not_bypass_observation_check_in_task_scope(self):
        body = self.body('✅ 未發請求（worker）；PASS').replace('## 驗證證據', '## 驗證')
        self.assertIn('具體觀察結果', '\n'.join(checker.validate(body, 'task')))

    def test_journey_type_annotation_does_not_bypass_observation_check(self):
        body = self.body('✅ PASS').replace('| 正常 |', '| 正常（worker） |')
        self.assertIn('具體觀察結果', '\n'.join(checker.validate(body, 'pr')))

    def test_unverified_rows_keep_the_existing_gate_error_priority(self):
        for actual in ('⬜', '❌'):
            with self.subTest(actual=actual):
                self.assertEqual(checker.validate(self.body(actual), 'pr'), [])

    def test_role_and_unrelated_tables_are_not_journey_observations(self):
        body = pr(NA + '\n| 角色 | 預期 | 實際 | 資料斷言 | 結果 | 證據 |\n'
                  '| 本人 | 正常 | PASS | fixture | ✅ | evidence/user.json |')
        self.assertEqual(checker.validate(body, 'pr'), [])


class TrustedReadAccessWorkflowTests(unittest.TestCase):
    def test_trusted_helper_fetch_supports_root_forks_and_subrepos(self):
        import json
        import os
        import re
        import subprocess
        import tempfile
        import textwrap

        workflow = (SCRIPT.parents[2] / '.github/workflows/pr-evidence-gate.yml').read_text()
        block = re.search(r'        run: \|\n(.*?)\n      - name: Check PR body', workflow, re.S)
        self.assertIsNotNone(block)
        command = textwrap.dedent(block.group(1))
        for repo, helper in (
            ('daodaoedu/daodao', 'plugin/hooks/check-read-access-evidence.py'),
            ('contributor/daodao', 'plugin/hooks/check-read-access-evidence.py'),
            ('daodaoedu/daodao-server', '.github/scripts/check-read-access-evidence.py'),
        ):
            with self.subTest(repository=repo), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                fake_gh = root / 'gh'
                fake_gh.write_text('#!/usr/bin/env python3\nimport json,os,sys\nwith open(os.environ["READ_ACCESS_GH_LOG"],"a") as f:f.write(json.dumps(sys.argv[1:])+"\\n")\nprint("# trusted default branch script")\n')
                fake_gh.chmod(0o755)
                env = {**os.environ, 'GITHUB_REPOSITORY': repo, 'DEFAULT_BRANCH': 'main',
                       'READ_ACCESS_GH_LOG': str(root / 'calls.jsonl'), 'PATH': str(root) + os.pathsep + os.environ['PATH']}
                result = subprocess.run(['bash', '-e', '-c', command], cwd=root, env=env, capture_output=True, text=True, check=False)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                calls = [json.loads(line) for line in (root / 'calls.jsonl').read_text().splitlines()]
                self.assertEqual(calls[1][1], f'repos/{repo}/contents/{helper}?ref=main')
                self.assertTrue(all('?ref=main' in call[1] for call in calls))
                self.assertTrue((root / '.github/scripts/check-read-access-evidence.py').stat().st_size)


if __name__ == '__main__':
    unittest.main()
