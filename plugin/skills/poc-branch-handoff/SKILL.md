---
name: poc-branch-handoff
description: Prepare an existing Dao Dao proof of concept on a focused, isolated Git branch for engineering review. Use when asked to publish a POC branch; use request-feature separately when a Planning issue is needed.
---

# POC branch handoff

Prepare a reviewable implementation reference from an existing POC. A POC branch does not mean the change is production-ready, fully accepted, or approved to merge.

This workflow requires filesystem, Git, worktree support, and a shell that can run Git (Bash or PowerShell). Check the current client's actual capabilities first. If a required capability is missing, do not claim to prepare or publish a branch; provide the verified scope and explain which repo-equipped environment or access is needed to continue. Run Bash-specific repository checks only when Bash is available; otherwise report those checks as not run.

## Workflow

1. Read the complete relevant Codex thread, including earlier requests and later corrections, plus the related issue, FRD, screenshots, repository guidance, and POC notes. Build a short list of settled behavior and scope; set aside superseded variants and unrelated experiments.
2. Confirm the target repo, user-selected base branch, existing remote branch, worktrees, and source worktree status. Dao Dao frontend POCs normally belong in [daodaoedu/daodao-f2e](https://github.com/daodaoedu/daodao-f2e); verify the relevant repo using the feature map and current source. Preserve all existing user changes. If the source is mixed or dirty, port only the requested POC changes in an isolated worktree based on the selected base branch; do not substitute `dev` unless it is the selected base.
3. Before any remote write, verify the GitHub account and target branch. Use the Codex built-in browser signed in as `peggy1213-create` when available. If browser automation is unavailable, use another available method; if the account cannot be verified, keep the work local and do not create a remote branch or publish. A browser login or commit author alone does not establish the Git push identity. If the requested remote branch already exists, verify it is the intended branch and check whether it contains the selected base. If it does, check it out without replacing its history. If it does not, do not rebase, overwrite, or push to it; ask the user whether to use its existing history, select a different base or branch, or keep the work local. If the remote branch does not exist, create it from the selected base only after the user authorizes publishing. Without publishing authorization, create a local branch instead. Before pushing, verify the Git credential publishes as `peggy1213-create`.
4. Port the requested behavior onto current code rather than copying stale components wholesale. Preserve newer shared context, translations, API contracts, and route behavior. Keep demonstration data synthetic. Add concise review notes that explain how to open the POC, what it demonstrates, and what remains unvalidated.
5. Read the repository's `AGENTS.md` and applicable checks. Review the full diff for scope, stale assumptions, secrets, and unrelated generated files. Run the repository-required and focused checks that apply to the changed files; record what ran, failed, or could not run. If checks are skipped or CI is blocked by an account or service issue, say that tests did not run; do not describe the infrastructure failure as a code failure or a pass.
6. Review the POC against current behavior and the complete requirement list. For Lighthouse cohort interfaces, verify that pages retain the active cohort's organization context, confirm API field meanings against the server schema or implementation before using them in labels or counts, hide or disable links when a required public identifier is missing, and inspect print/PDF layouts separately so interactive columns do not overflow the page. Treat review findings as items to verify and fix within the authorized POC scope.
7. Stage only the intended files and create a POC commit. Follow the repo's exact commit-message and push review approvals. Push only when publishing is authorized and the account is verified, and only to the remote branch created or confirmed in step 3; never force-push. If publishing is not authorized or the identity cannot be verified, keep the commit local and report that publication is pending. Do not open a PR, merge, deploy, or change the Planning board unless separately requested.
8. After a push, read the published branch and commit on GitHub to confirm the POC files are actually present. For a local-only handoff, report that remote readback could not be done. Report the repo and branch link when available, commit, review notes, checks and review actually completed, and remaining limitations. Link related Planning issues and source documents, describing the POC as an implementation reference rather than live product behavior.

## Boundaries

- Publishing a remote branch requires the user's authorization. Preparing local notes or a local diff does not authorize a push.
- Preserve the source checkout, its staged changes, and unrelated experiments. Do not reset or clean them to simplify the handoff.
- Do not change the target repo, base, GitHub account, or an existing remote branch without user direction.
- A POC handoff is separate from creating a Planning feature item. Use [request-feature](../request-feature/SKILL.md) when the user also asks to create a Planning card.
