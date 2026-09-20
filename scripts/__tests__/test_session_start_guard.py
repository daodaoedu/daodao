"""session-start hook 的 projects/ 分支判斷。

守兩個 2026-09-20 的教訓：
1. 預期分支硬編成 dev → worker／infra（預設 main）每個 session 都被誤報，整段警告被當噪音。
2. 全形括號緊接 `$var` 會被 bash 併進變數名，在 `set -u` 下直接 unbound variable 中止。
"""

import os
from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
HOOK = ROOT / ".claude/hooks/session-start.sh"


def git(cwd, *args):
    return subprocess.run(["git", *args], cwd=cwd, check=True,
                          capture_output=True, text=True).stdout.strip()


class SessionStartGuardTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="guard-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        git(self.root, "init", "-q")
        (self.root / "projects").mkdir()

    def make_repo(self, name, default_branch):
        """建一個以 default_branch 為預設分支的 remote，並 clone 進 projects/。"""
        bare = self.root / f"{name}.git"
        subprocess.run(["git", "init", "--bare", "-q", "-b", default_branch, str(bare)], check=True)
        seed = self.root / f"seed-{name}"
        seed.mkdir()
        git(seed, "init", "-q", "-b", default_branch)
        git(seed, "config", "user.email", "t@example.invalid")
        git(seed, "config", "user.name", "t")
        (seed / "README.md").write_text("x\n")
        git(seed, "add", "-A")
        git(seed, "commit", "-q", "-m", "init")
        git(seed, "remote", "add", "origin", str(bare))
        git(seed, "push", "-q", "origin", default_branch)
        target = self.root / "projects" / name
        subprocess.run(["git", "clone", "-q", str(bare), str(target)], check=True)
        git(target, "config", "user.email", "t@example.invalid")
        git(target, "config", "user.name", "t")
        return target

    def run_hook(self):
        env = dict(os.environ, CLAUDE_WORKING_DIRECTORY=str(self.root), LC_ALL="en_US.UTF-8")
        result = subprocess.run(["bash", str(HOOK)], env=env, capture_output=True, text=True)
        self.assertNotIn("unbound variable", result.stdout + result.stderr,
                         "全形括號黏在 $var 後面會讓 set -u 中止整支 hook")
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout

    def test_repo_on_its_own_default_branch_is_not_flagged(self):
        """預設分支是 main 的 repo 停在 main 是正常的，不該被當異常。"""
        self.make_repo("repo-main", "main")
        self.make_repo("repo-dev", "dev")
        out = self.run_hook()
        self.assertNotIn("repo-main", out)
        self.assertNotIn("repo-dev", out)

    def test_repo_off_default_branch_is_flagged_with_expectation(self):
        target = self.make_repo("repo-main", "main")
        git(target, "checkout", "-q", "-b", "feature/x")
        out = self.run_hook()
        self.assertIn("repo-main", out)
        self.assertIn("branch=feature/x", out)
        self.assertIn("預期 main", out)

    def test_dirty_repo_on_default_branch_reports_dirty_without_expectation_noise(self):
        target = self.make_repo("repo-dev", "dev")
        (target / "README.md").write_text("changed\n")
        out = self.run_hook()
        line = next(l for l in out.splitlines() if "repo-dev" in l)
        self.assertIn("(dirty)", line)
        # 區塊標題本來就有「預期」，這裡只看該 repo 那一行
        self.assertNotIn("預期", line)

    def test_stale_origin_head_is_refreshed_before_warning(self):
        """遠端改過預設分支時，本機 origin/HEAD 會過期；hook 要重抓再判斷，不能直接誤報。"""
        target = self.make_repo("repo-dev", "dev")
        # 假裝本機 origin/HEAD 還停在舊的預設分支
        subprocess.run(["git", "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/stale"],
                       cwd=target, check=True, capture_output=True)
        out = self.run_hook()
        self.assertNotIn("repo-dev", out)


if __name__ == "__main__":
    unittest.main()
