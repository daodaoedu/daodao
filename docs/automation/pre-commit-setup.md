# Pre-commit Setup Guide

Install the secret-scan + dependency-audit pre-commit hook for each of the 8 sub-repos.

---

## Prerequisites

Install these tools once on your machine:

```bash
# Secret scanner (required — ggshield preferred)
pip install ggshield
ggshield auth login          # authenticate with GitGuardian

# Fallback: gitleaks (if ggshield is unavailable)
brew install gitleaks

# Python dependency audit
pip install pip-audit

# Node dependency audit — already bundled with pnpm/npm
```

---

## Install per sub-repo

Run the following steps inside each sub-repo directory.

### Node repos: daodao-server, daodao-f2e, daodao-admin-ui, daodao-mcp, daodao-worker

```bash
# 1. Install husky
pnpm add -D husky
pnpm exec husky init

# 2. Copy the hook template
cp <monorepo-root>/templates/husky-pre-commit.sh .husky/pre-commit
chmod +x .husky/pre-commit

# 3. Commit the hook
git add .husky/pre-commit package.json pnpm-lock.yaml
git commit -m "chore: add pre-commit secret scan + dependency audit"
```

### Python repo: daodao-ai-backend

```bash
# 1. Install pre-commit framework
pip install pre-commit

# 2. Copy the hook template into husky-style layout (used directly as git hook)
mkdir -p .husky
cp <monorepo-root>/templates/husky-pre-commit.sh .husky/pre-commit
chmod +x .husky/pre-commit

# 3. Register the hook
git config core.hooksPath .husky

# 4. Commit
git add .husky/pre-commit
git commit -m "chore: add pre-commit secret scan + pip-audit"
```

> The template auto-detects `requirements.txt` / `pyproject.toml` and skips Node audit.

### Infrastructure repos: daodao-storage, daodao-infra

These repos are **high-risk** (SQL migrations, IaC). Secret scanning is especially critical here.

```bash
# Same steps as Node repos above — husky + pnpm audit
pnpm add -D husky
pnpm exec husky init
cp <monorepo-root>/templates/husky-pre-commit.sh .husky/pre-commit
chmod +x .husky/pre-commit
git add .husky/pre-commit package.json pnpm-lock.yaml
git commit -m "chore: add pre-commit secret scan + dependency audit"
```

---

## Sub-repo quick reference

| Sub-repo | Runtime | Secret scan | Dep audit |
|---|---|---|---|
| daodao-server | Node | ggshield | pnpm audit |
| daodao-f2e | Node | ggshield | pnpm audit |
| daodao-admin-ui | Node | ggshield | pnpm audit |
| daodao-mcp | Node | ggshield | pnpm audit |
| daodao-worker | Node | ggshield | pnpm audit |
| daodao-ai-backend | Python | ggshield | pip-audit |
| daodao-storage | Node | ggshield | pnpm audit |
| daodao-infra | Node | ggshield | pnpm audit |

---

## Verification — confirm the hook is working

### 1. Verify secret detection (fake AWS key)

```bash
# Create a test file with a fake credential
echo 'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' > /tmp/fake-secret.txt
git add /tmp/fake-secret.txt 2>/dev/null || git add fake-secret.txt

# Attempt commit — should be REJECTED by ggshield/gitleaks
git commit -m "test: should be blocked"
# Expected: non-zero exit, error message about detected secret

# Clean up
git restore --staged .
rm -f fake-secret.txt /tmp/fake-secret.txt
```

### 2. Verify dependency audit runs

```bash
# For Node repos: check pnpm audit fires
git stash   # ensure clean state
git stash pop
# Make a trivial change and commit — audit output should appear in hook output

# For Python repos: check pip-audit fires
git stash
git stash pop
```

### 3. Verify hook is registered

```bash
# Should print path to .husky/pre-commit
git config core.hooksPath

# For husky-managed repos this is .husky by default
cat .husky/pre-commit | head -5
```

---

## CI double-check (recommended)

Add the same checks to your CI pipeline (GitHub Actions) as a second layer of defense.

Example `.github/workflows/security.yml` snippet:

```yaml
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Secret scan (gitleaks)
        uses: gitleaks/gitleaks-action@v2

      - name: Node dep audit
        if: hashFiles('package.json') != ''
        run: pnpm audit --audit-level=high

      - name: Python dep audit
        if: hashFiles('requirements.txt') != '' || hashFiles('pyproject.toml') != ''
        run: |
          pip install pip-audit
          pip-audit --strict
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `ggshield: command not found` | `pip install ggshield && ggshield auth login` |
| `gitleaks: command not found` | `brew install gitleaks` |
| `pip-audit: command not found` | `pip install pip-audit` |
| Hook not firing on commit | Check `git config core.hooksPath`; ensure `.husky/pre-commit` is executable (`chmod +x`) |
| `pnpm audit` reports false positives | Use `pnpm audit --audit-level=critical` temporarily; open a ticket to upgrade the dep |
| ggshield blocks a test fixture / fake key | Add a `# pragma: allowlist secret` comment on that line in the source file |
