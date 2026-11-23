#!/usr/bin/env python3
"""Read-only bridge to the shared content validator; no schema or approval generation."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frontend", required=True, type=Path)
    parser.add_argument("--content", required=True, type=Path)
    parser.add_argument("--mode", choices=("draft", "publish"), default="publish")
    parser.add_argument("--approvals", type=Path)
    parser.add_argument("--baseline", type=Path)
    args = parser.parse_args()
    frontend = args.frontend.resolve()
    package = frontend / "packages/blog-content/package.json"
    try:
        if not package.is_file() or json.loads(package.read_text()).get("name") != "@daodao/blog-content":
            raise ValueError("Frontend checkout lacks @daodao/blog-content; obtain the verified #533 package first")
        if not args.content.is_dir():
            raise ValueError("Content checkout does not exist")
        if not os.environ.get("BLOG_CONTENT_DIR"):
            raise ValueError("Trusted caller BLOG_CONTENT_DIR is required; preserve configured scope rather than copying --content")
        if (args.mode == "publish" or args.approvals is not None or args.baseline is not None) and not os.environ.get("BLOG_EVIDENCE_ROOT"):
            raise ValueError("Trusted caller BLOG_EVIDENCE_ROOT is required for private JSON; do not derive it from file arguments")
        executable = shutil.which("pnpm")
        if not executable:
            raise ValueError("pnpm unavailable; preflight not performed")
        command = [executable, "--dir", str(frontend), "--filter", "@daodao/blog-content", "validate",
                   "--root", str(args.content.resolve()), "--mode", args.mode]
        for flag, value in (("--approvals", args.approvals), ("--baseline", args.baseline)):
            if value is not None:
                command.extend([flag, str(value.resolve())])
        # inherit output: a failed validator must retain its own actionable diagnostics and exit code.
        return subprocess.run(command, check=False).returncode
    except (OSError, ValueError) as error:
        print(json.dumps({"ok": False, "stage": "preflight", "errors": [{"message": str(error)}]}))
        return 2


if __name__ == "__main__":
    sys.exit(main())
