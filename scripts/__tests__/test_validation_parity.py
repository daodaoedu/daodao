import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("check_validation_parity", ROOT / "scripts" / "check-validation-parity.py")
mod = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = mod
SPEC.loader.exec_module(mod)

SLUG_OPENAPI = "^[a-z0-9]+(?:-[a-z0-9]+)*$"


class ExtractRulesTest(unittest.TestCase):
    def test_html_pattern_literal_and_const(self):
        text = (
            'const SLUG_HTML = "[a-z0-9]+(-[a-z0-9]+)*";\n'
            '<input pattern="[0-9]{4}" />\n'
            "<input pattern={SLUG_HTML} />\n"
        )
        rules = mod.extract_rules(text, "a.tsx")
        html = [r for r in rules if r.kind == "html-pattern"]
        self.assertEqual([r.source for r in html], ["[0-9]{4}", "[a-z0-9]+(-[a-z0-9]+)*"])
        self.assertEqual(html[1].name, "SLUG_HTML")
        self.assertEqual(html[0].line, 2)

    def test_anchored_regex_literal_only(self):
        text = (
            "const COHORT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;\n"
            'name.replace(/\\.[a-z0-9]+$/i, "")\n'  # 非錨定開頭，不算驗證規則
            "const EMAIL = /^[^@]+@[^@]+$/i;\n"
        )
        rules = mod.extract_rules(text, "b.tsx")
        self.assertEqual([r.source for r in rules], ["^[a-z0-9]+(?:-[a-z0-9]+)*$", "^[^@]+@[^@]+$"])
        self.assertEqual(rules[0].name, "COHORT_SLUG_PATTERN")

    def test_unresolvable_const_is_unchecked(self):
        rules = mod.extract_rules("<input pattern={FROM_ELSEWHERE} />", "c.tsx")
        self.assertEqual(rules[0].status, "UNCHECKED")
        self.assertEqual(rules[0].source, "")


class JsStringDecodeTest(unittest.TestCase):
    def test_const_source_escapes_become_runtime_string(self):
        # 原始碼 "[a-z0-9\\-]+" 在執行期是 [a-z0-9\-]+（跳脫的連字號，v flag 可編譯）
        rules = mod.extract_rules('const P = "[a-z0-9\\\\-]+";\n<input pattern={P} />', "d.tsx")
        html = [r for r in rules if r.kind == "html-pattern"]
        self.assertEqual(html[0].source, "[a-z0-9\\-]+")
        out = mod.compile_with_node([html[0].source])
        self.assertEqual(out[html[0].source], "")

    def test_jsx_attribute_string_is_not_decoded(self):
        rules = mod.extract_rules('<input pattern="\\d{4}" />', "e.tsx")
        self.assertEqual(rules[0].source, "\\d{4}")

    def test_inline_js_expression_string_is_decoded(self):
        rules = mod.extract_rules('<input pattern={"\\\\d{4}"} />', "f.tsx")
        self.assertEqual(rules[0].source, "\\d{4}")


class NormalizeTest(unittest.TestCase):
    def test_anchor_and_noncapturing_group_are_ignored(self):
        self.assertEqual(mod.normalize(SLUG_OPENAPI), mod.normalize("[a-z0-9]+(-[a-z0-9]+)*"))
        self.assertNotEqual(mod.normalize(SLUG_OPENAPI), mod.normalize("[a-z0-9-]+"))


class OpenApiTest(unittest.TestCase):
    def test_collects_nested_patterns(self):
        doc = {"paths": {"/x": {"post": {"requestBody": {"content": {"application/json": {"schema": {
            "properties": {"slug": {"type": "string", "pattern": SLUG_OPENAPI},
                           "nested": {"items": {"pattern": "^[0-9]+$"}}}}}}}}}}}
        self.assertEqual(mod.load_openapi_patterns(doc), {SLUG_OPENAPI, "^[0-9]+$"})


class ClassifyTest(unittest.TestCase):
    def test_invalid_pattern_blocks_before_matching(self):
        r = mod.Rule("a.tsx", 1, "html-pattern", "[a-z0-9-]+")
        mod.classify([r], {"^[a-z0-9-]+$"}, "", {"[a-z0-9-]+": "Invalid character class"})
        self.assertEqual(r.status, "INVALID")

    def test_match_documented_unmatched(self):
        match = mod.Rule("a.tsx", 1, "html-pattern", "[a-z0-9]+(-[a-z0-9]+)*")
        documented = mod.Rule("a.tsx", 2, "regex-literal", "^[0-9]{4}$")
        unmatched = mod.Rule("a.tsx", 3, "regex-literal", "^x+$")
        mod.classify([match, documented, unmatched], {SLUG_OPENAPI}, "BE 規則來源 ^[0-9]{4}$ year.schema.ts:3",
                     {"[a-z0-9]+(-[a-z0-9]+)*": ""})
        self.assertEqual(match.status, "MATCH")
        self.assertEqual(match.matched_openapi, SLUG_OPENAPI)
        self.assertEqual(documented.status, "DOCUMENTED")
        self.assertEqual(unmatched.status, "UNMATCHED")

    def test_case_insensitive_flag_is_not_a_match(self):
        # /^[a-z]+$/i 放行大寫，server 的 ^[a-z]+$ 會 400：文字相同也不能算 MATCH
        rules = mod.extract_rules("const R = /^[a-z]+$/i;\nconst S = /^[a-z]+$/;", "g.ts")
        self.assertEqual([r.flags for r in rules], ["i", ""])
        mod.classify(rules, {"^[a-z]+$"}, "", {})
        self.assertEqual([r.status for r in rules], ["UNMATCHED", "MATCH"])
        self.assertIn("i flag", rules[0].detail)

    def test_without_node_html_patterns_are_unchecked(self):
        r = mod.Rule("a.tsx", 1, "html-pattern", "[a-z0-9-]+")
        mod.classify([r], set(), "", None)
        self.assertEqual(r.status, "UNCHECKED")


class ResolveBaseTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="parity-base-"))
        run = lambda *a: subprocess.run(["git", "-C", str(self.tmp), *a], check=True, capture_output=True)
        run("init", "-q")
        (self.tmp / "a.txt").write_text("x")
        run("add", "-A")
        run("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "base")
        self.run_git = run

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_explicit_base_is_kept(self):
        self.assertEqual(mod.resolve_base(self.tmp, "origin/release"), "origin/release")

    def test_auto_falls_back_to_main_when_dev_is_missing(self):
        self.run_git("update-ref", "refs/remotes/origin/main", "HEAD")
        self.assertEqual(mod.resolve_base(self.tmp, "auto"), "origin/main")

    def test_auto_prefers_dev_over_main(self):
        self.run_git("update-ref", "refs/remotes/origin/main", "HEAD")
        self.run_git("update-ref", "refs/remotes/origin/dev", "HEAD")
        self.assertEqual(mod.resolve_base(self.tmp, "auto"), "origin/dev")


class NodeCompileTest(unittest.TestCase):
    """需要 node（CI 由 setup-node 提供）；沒有 node 這組會直接失敗，不靜默略過。"""

    def test_node_is_available(self):
        self.assertIsNotNone(shutil.which("node"), "node 不可用：這個 signal 依賴瀏覽器等價的 v-flag 編譯")

    def test_v_flag_rejects_trailing_dash_in_class(self):
        out = mod.compile_with_node(["[a-z0-9-]+", "[a-z0-9]+(-[a-z0-9]+)*"])
        self.assertIsNotNone(out)
        self.assertTrue(out["[a-z0-9-]+"])  # error message
        self.assertEqual(out["[a-z0-9]+(-[a-z0-9]+)*"], "")


class EndToEndTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="parity-"))
        (self.tmp / "src").mkdir()
        (self.tmp / "openapi.json").write_text(json.dumps(
            {"components": {"schemas": {"Cohort": {"properties": {"slug": {"pattern": SLUG_OPENAPI}}}}}}))

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _run(self, source: str, extra: list[str] | None = None) -> int:
        f = self.tmp / "src" / "form.tsx"
        f.write_text(source)
        return mod.main(["--repo", str(self.tmp), "--openapi", str(self.tmp / "openapi.json"),
                         "--files", str(f), "--json", *(extra or [])])

    def test_issue_188_shape_fails(self):
        # #188 原始碼形狀：無效 HTML pattern → exit 1
        self.assertEqual(self._run('<input pattern="[a-z0-9-]+" />'), 1)

    def test_fixed_shape_passes(self):
        self.assertEqual(self._run('const P = "[a-z0-9]+(-[a-z0-9]+)*";\n<input pattern={P} />'), 0)

    def test_strict_flags_unmatched(self):
        self.assertEqual(self._run("const R = /^zzz$/;"), 0)
        self.assertEqual(self._run("const R = /^zzz$/;", ["--strict"]), 1)


if __name__ == "__main__":
    unittest.main()
