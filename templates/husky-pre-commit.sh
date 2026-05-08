#!/usr/bin/env bash
# Pre-commit hook: secret scan + dependency audit
# Supports node (package.json) and python (requirements.txt / pyproject.toml) repos.
# Copy to .husky/pre-commit and chmod +x.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"

# ---------------------------------------------------------------------------
# 1. Secret scan (ggshield preferred, gitleaks fallback)
# ---------------------------------------------------------------------------
if command -v ggshield > /dev/null 2>&1; then
  echo "[pre-commit] running ggshield secret scan..."
  ggshield secret scan pre-commit
elif command -v gitleaks > /dev/null 2>&1; then
  echo "[pre-commit] ggshield not found, falling back to gitleaks..."
  gitleaks protect --staged --redact --no-git
else
  echo "[pre-commit] WARNING: neither ggshield nor gitleaks is installed. Secret scan skipped."
  echo "             Install ggshield: pip install ggshield && ggshield auth login"
fi

# ---------------------------------------------------------------------------
# 2. Dependency audit — Node (pnpm)
# ---------------------------------------------------------------------------
if [ -f "${REPO_ROOT}/package.json" ]; then
  echo "[pre-commit] running pnpm audit (high+)..."
  if command -v pnpm > /dev/null 2>&1; then
    pnpm audit --audit-level=high
  elif command -v npm > /dev/null 2>&1; then
    npm audit --audit-level=high
  else
    echo "[pre-commit] WARNING: pnpm/npm not found. Node audit skipped."
  fi
fi

# ---------------------------------------------------------------------------
# 3. Dependency audit — Python (pip-audit)
# ---------------------------------------------------------------------------
if [ -f "${REPO_ROOT}/requirements.txt" ] || [ -f "${REPO_ROOT}/pyproject.toml" ]; then
  echo "[pre-commit] running pip-audit..."
  if command -v pip-audit > /dev/null 2>&1; then
    if [ -f "${REPO_ROOT}/requirements.txt" ]; then
      pip-audit --strict -r "${REPO_ROOT}/requirements.txt"
    else
      pip-audit --strict
    fi
  else
    echo "[pre-commit] WARNING: pip-audit not found. Python audit skipped."
    echo "             Install: pip install pip-audit"
  fi
fi

echo "[pre-commit] all checks passed."
