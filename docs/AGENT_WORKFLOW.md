# Agent Workflow

GitHub issues are the main way we report bugs and track work. Well-specified issues can be handed to a Claude Code agent, which runs on GitHub Actions and opens a draft PR into `dev` for a human to review and merge.

## How it works

```
issue labeled agent:ready  (by an allowlisted user)
        │
        ▼
.github/workflows/agent.yml
  1. gate: labeler on the allowlist? issue not type:db / area:db?
  2. pick model from the model:* label, label agent:in-progress, comment with model and run link
  3. checkout dev → branch agent/<issue>-<slug>
  4. Claude reads the issue, edits code, runs build/test/lint, commits locally
  5. workflow checks the diff (no supabase/ or .github/), pushes, opens a draft PR
  6. workflow dispatches CI on the branch (the required `ci` check)
  7. label agent:review, comment with PR link
        │
        ▼
human reviews → marks ready → squash-merges into dev
```

Claude never holds a token with push rights. It can only read and edit files, run `npm run build|test|lint`, `npx vitest`, and local `git status|diff|log|add|commit`. Pushing, PR creation and label changes are plain workflow steps.

If the agent can't finish (the issue is ambiguous, build or tests fail, or the change needs out-of-scope files), it labels the issue `agent:needs-human` and comments why. Answer in a comment, then re-add `agent:ready` to retry. A retry starts from fresh `dev` and force-pushes the same `agent/` branch, updating the existing PR.

## Labels

Created by `scripts/setup-agent-labels.sh`.

| Group | Labels | Notes |
|---|---|---|
| `type:*` | feature, fix, refactor, style, docs, chore, db, perf, test | Matches the commit types in `GIT_CONVENTIONS.md`. Bug and feature templates apply theirs automatically. |
| `area:*` | kiosk, hub, discovery, games, cv, mobile, auth, db, ci | Added at triage from the template's Area field. |
| `model:*` | sonnet (default), opus | Optional. Picks the model for the run: `claude-sonnet-5-5` or `claude-opus-5-5`. Only one allowed; with two the run is refused. |
| `agent:*` | ready → in-progress → review, or needs-human | `ready` is the only one humans add; the workflow manages the rest. |

Issues labeled `type:db` or `area:db` are refused: migrations, RLS policies and edge functions stay with humans.

## Writing an agent-ready issue

Add `agent:ready` only once an issue meets this bar:

- **Self-contained.** The agent sees only the issue title, body, labels and comments, plus the repo. Include anything that lives in someone's head.
- **Concrete acceptance criteria.** A checklist that defines done.
- **Scoped.** One logical change. Split bigger work into several issues.
- **Code pointers** where you know them (files, components, an existing pattern to copy).
- **Verifiable without hardware.** Runners have no camera, MediaPipe, WebGL or Supabase, so the agent can only verify with `npm run build` and unit tests. CV, Pixi and kiosk-flow changes still get a manual check on the kiosk before merging. The PR's "Manual verification" section lists what to check.

Good fits: bug fixes with clear repro, pure logic and hooks, mobile UI tweaks, tests, refactors, docs. Poor fits: anything needing design decisions, tuning CV thresholds by feel, or database changes.

## Reviewing agent PRs

Agent PRs are drafts from `agent/<issue>-<slug>` branches and contain `Closes #<issue>`. Review them like any other PR. To ask for changes, push commits yourself, or comment on the issue and re-run it with `agent:ready` (this restarts from `dev` and replaces the branch). Pushing your own commits triggers CI normally.

## Setup (one-time, repo admin)

1. **Claude token.** On a machine with a Claude Pro/Max subscription, run `claude setup-token`, then store the token:
   ```bash
   gh secret set CLAUDE_CODE_OAUTH_TOKEN --env agent -R Spark-Me2You/me2you
   ```
   Every agent run uses that account's subscription limits. The token lasts about a year; regenerate it before it expires, or when the owner leaves the project.
2. **Labels.** `scripts/setup-agent-labels.sh`
3. **Allow Actions to open PRs.** Settings → Actions → General → Workflow permissions → tick "Allow GitHub Actions to create and approve pull requests" (the org setting must allow it too). Or run:
   ```bash
   gh api -X PUT repos/Spark-Me2You/me2you/actions/permissions/workflow \
     -f default_workflow_permissions=read -F can_approve_pull_request_reviews=true
   ```

## Limits and costs

- The repo is public, so GitHub-hosted runner minutes are free. Jobs are capped at 60 minutes by the workflow, and Claude at 80 turns.
- Runs are serialized per issue (`concurrency`), but different issues run in parallel. Each one draws on the same subscription.
- Only allowlisted users can start a run (default `clow427,amernor`). To change the list without a PR, set the `AGENT_ALLOWLIST` repo variable to a comma-separated list of usernames: `gh variable set AGENT_ALLOWLIST -b "clow427,amernor"`. If anyone else adds `agent:ready`, the label is removed and a comment explains why. This also limits prompt-injection exposure from public issues: the person who adds the label is vouching for the issue content.
- The allowlist controls who can start runs, not who can read the token. Anyone with write access can push a branch whose workflow reads repo secrets. The token is therefore stored in the `agent` Environment (the `work` job sets `environment: agent`), which is limited to `main` and requires a reviewer to approve each run. Don't also keep a repo-level copy.
