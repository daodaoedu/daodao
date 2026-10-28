import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('draft', ROOT / 'plugin/templates/check-issue-draft.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

CHILD = """<!-- template: child-issue -->
# 讓學習者在挑戰頁看到自己的打卡紀錄

Parent: daodaoedu/daodao#138

## 依賴

none

## 範圍

- 對應母卡 AC：AC-03

## 要做

- [ ] daodao-f2e：挑戰頁加打卡列表

## 做完會看到

- [ ] 在 dev 挑戰頁按「打卡」，列表出現今天的紀錄（AC-03）

## 驗證

- [ ] 測試：checkin.test.ts 新增空列表案例。證據：尚未產生

## 驗收方式

PM：畫面上看得出差別。

## 附錄：交付紀錄

尚未開始
"""


class CheckIssueDraftTests(unittest.TestCase):
    def messages(self, text, template='child'):
        return [message for _, message in module.check(text, template)]

    def test_filled_child_draft_passes(self):
        self.assertEqual(self.messages(CHILD), [])

    def test_unfilled_templates_fail(self):
        for template, name in (('bug', 'bug-issue'), ('central', 'central-issue'), ('child', 'child-issue')):
            text = (ROOT / f'plugin/templates/{name}.md').read_text()
            problems = self.messages(text, template)
            self.assertTrue(any('佔位符' in m for m in problems), template)
            self.assertFalse(any('缺少段落' in m for m in problems), template)

    def test_checked_box_needs_existing_evidence(self):
        text = CHILD.replace('- [ ] 測試', '- [x] 測試')
        self.assertIn('證據尚未產生就不能打勾', self.messages(text))

    def test_verification_box_needs_evidence_label(self):
        text = CHILD.replace('。證據：尚未產生', '')
        self.assertIn('驗證項目要寫「證據：」', self.messages(text))

    def test_real_text_is_not_a_placeholder(self):
        text = CHILD.replace('none', 'TypeError at <anonymous>，`Array<string>`、<br>、x < 3 而 y > 5、[ERROR]、[送出]')
        self.assertEqual(self.messages(text), [])
        bug = (ROOT / 'plugin/templates/bug-issue.md').read_text()
        self.assertTrue(any('[通報者原話]' in m for m in self.messages(bug, 'bug')))
        self.assertFalse(any('[ERROR]' in m for m in self.messages(bug + '\n[ERROR] [object Object]\n', 'bug')))

    def test_uppercase_and_star_boxes_are_checked(self):
        for box in ('- [X] 測試', '* [x] 測試'):
            text = CHILD.replace('- [ ] 測試', box)
            self.assertIn('證據尚未產生就不能打勾', self.messages(text), box)

    def test_code_blocks_do_not_count_as_structure(self):
        fenced = '```\n# 標題\nParent: daodaoedu/daodao#1\n## 依賴\n```\n'
        no_title = CHILD.replace('# 讓學習者在挑戰頁看到自己的打卡紀錄\n', '')
        self.assertIn('缺少標題「# 」', self.messages(fenced + no_title))
        no_parent = CHILD.replace('Parent: daodaoedu/daodao#138', '')
        self.assertTrue(any('Parent' in m for m in self.messages(fenced + no_parent)))
        self.assertFalse(any('段落順序' in m for m in self.messages(CHILD + '\n' + fenced)))

    def test_child_needs_parent_line(self):
        text = CHILD.replace('Parent: daodaoedu/daodao#138', '')
        self.assertTrue(any('Parent' in m for m in self.messages(text)))

    def test_missing_and_misordered_sections(self):
        text = CHILD.replace('## 依賴\n\nnone\n\n', '')
        self.assertIn('缺少段落「## 依賴」', self.messages(text))
        swapped = CHILD.replace('## 要做', '## TMP').replace('## 範圍', '## 要做').replace('## TMP', '## 範圍')
        self.assertTrue(any('段落順序' in m for m in self.messages(swapped)))


if __name__ == '__main__':
    unittest.main()
