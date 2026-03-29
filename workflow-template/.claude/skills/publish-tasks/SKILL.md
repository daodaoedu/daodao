---
name: publish-tasks
description: Publish uncompleted OpenSpec tasks as GitHub issues with 'auto' label for remote agent automation. Use when the user wants to push tasks to GitHub for automated implementation.
license: MIT
metadata:
  author: xiaoxu
  version: "1.0"
---

Publish uncompleted OpenSpec tasks as GitHub issues with the `auto` label, so remote agents can pick them up and implement automatically.

**Input**: Optionally specify a change name and target repo URL. If omitted, prompt the user.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Run `openspec list --json` to get available changes
   - Auto-select if only one active change exists
   - If ambiguous, use **AskUserQuestion** to let the user select

   Announce: "Publishing tasks from change: <name>"

2. **Get target repo**

   Ask the user which GitHub repo to publish to (e.g., `your-org/your-repo`).
   Validate with `gh repo view <repo> --json name` to confirm access.

3. **Ensure `auto` label exists**

   ```bash
   gh label create auto --repo <repo> --description "Auto-implementable by AI agent" --color 0E8A16 2>/dev/null || true
   ```

4. **Read tasks and context**

   Read these files from `openspec/changes/<name>/`:
   - `tasks.md` — the task list
   - `proposal.md` — for context (Why, What Changes)
   - `design.md` — for technical decisions (if exists)
   - `specs/` — for detailed requirements (if exists)

   Parse `tasks.md` to find all **uncompleted** tasks (lines matching `- [ ]`).

5. **Group tasks into issues**

   Group related tasks into logical issues. Rules:
   - Tasks under the same `## section` header that target the same subproject should be ONE issue
   - Each issue should be 2-8 hours of work (combine small tasks, split huge ones)
   - Keep the hierarchical numbering (e.g., 4.1, 4.2, 4.3)

6. **Preview before publishing**

   Show the user a summary table:
   ```
   | # | Issue Title | Tasks | Subproject | Est. |
   |---|------------|-------|------------|------|
   | 1 | Quick Reactions API | 4.1-4.7 | server | 4h |
   | 2 | Follow API | 6.1-6.8 | server | 4h |
   ```

   Use **AskUserQuestion** to confirm: "Create these issues? You can adjust before publishing."

7. **Create issues**

   For each issue, run:
   ```bash
   gh issue create --repo <repo> --title "<title>" --label "auto" --body "$(cat <<'EOF'
   ## Context

   **Change**: <change-name>
   **Subproject**: <subproject>

   ### Why
   <excerpt from proposal.md — the Why section>

   ## Tasks

   <paste the specific task items from tasks.md, with checkbox format>

   ## Technical Context

   <relevant excerpts from design.md — decisions that affect these tasks>

   ## Specs

   <relevant spec content from specs/<capability>/spec.md if applicable>

   ## Acceptance Criteria

   - All tasks marked as completed
   - Tests pass
   - Code follows project conventions (see config.yaml context)

   ---
   *Auto-generated from OpenSpec change: <name>*
   EOF
   )"
   ```

8. **Report results**

   Show created issues with links:
   ```
   Created 3 issues:
   - #42 Quick Reactions API (tasks 4.1-4.7)
   - #43 Follow API (tasks 6.1-6.8)
   - #44 Connect API (tasks 7.1-7.6)
   ```

**Important notes**:
- Never publish already-completed `[x]` tasks
- Include enough context from proposal/design/specs that the remote agent can work independently
- The remote agent has NO access to local files — the issue body must be self-contained
- Use Traditional Chinese for issue content (matching project conventions)
