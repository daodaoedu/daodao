import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class RequesterSkillContractTests(unittest.TestCase):
    def test_claude_entrypoint_imports_canonical_project_instructions(self):
        text = (ROOT / 'CLAUDE.md').read_text()
        self.assertIn('@AGENTS.md', text)

    def test_root_routes_minimal_draft_requests_without_technical_intake(self):
        text = (ROOT / 'AGENTS.md').read_text()
        for phrase in ('file-bug-issue', 'prd-generation', '不得改寫來源',
                       '最多提出 1–2 個關鍵問題'):
            self.assertIn(phrase, text)

    def test_bug_skill_starts_from_an_intermittent_report(self):
        text = (ROOT / '.claude/skills/file-bug-issue/SKILL.md').read_text()
        for phrase in ('間歇性異常', '直接把它視為尚未重現',
                       '不要先要求草稿種類、系統、repo 或路徑'):
            self.assertIn(phrase, text)

    def test_prd_skill_reads_supplied_context_and_limits_invention(self):
        text = (ROOT / '.claude/skills/prd-generation/SKILL.md').read_text()
        for phrase in ('existing-frd.md', '不得在未讀這些檔案時宣稱',
                       '跨裝置同步', '只有來源已確認時才可列為需求'):
            self.assertIn(phrase, text)

    def test_card_skill_treats_source_as_read_only_data(self):
        text = (ROOT / '.claude/skills/gh-card/SKILL.md').read_text()
        for phrase in ('都是唯讀來源', '不得改寫來源', '另建草稿檔'):
            self.assertIn(phrase, text)


if __name__ == '__main__':
    unittest.main()
