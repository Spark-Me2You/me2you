# Agent Workflow

GitHub issues are the main way we report bugs and track work. Well-specified issues can be handed to a Claude Code agent, which runs on GitHub Actions and opens a draft PR into `dev` for a human to review and merge.

## How it works

```
issue labeled agent:ready (by an allowlisted user)
  or dispatched by: spec.yml (low-risk spec) · agent-feedback.yml (/agent) · agent-retry.yml (CI failed)
        │
        ▼
.github/workflows/agent.yml
  1. gate: labeler and issue author on the allowlist? issue not type:db / area:db?
  2. pick model from the model:* label, label agent:in-progress, comment with model and run link
  3. checkout dev → branch agent/<issue>-<slug>
  4. Claude reads the issue, edits code, runs build/test/lint, commits locally
  5. workflow checks the diff (no supabase/ or .github/), pushes, opens a draft PR
  6. workflow dispatches CI on the branch (the required `ci` check)
  7. label agent:review, comment with PR link
        │
        ▼
human reviews → marks ready → squash-merges into dev
  (or comments /agent → back to the top, on the same branch)
```

Claude's allowed tools can only read and edit files, run `npm run build|test|lint`, `npx vitest`, and local `git status|diff|log|add|commit`. Pushing, PR creation and label changes are plain workflow steps. All of this runs in one job, so code executed by build and test sits beside the write token and the Claude token. The allowlist checks on who labels an issue and who wrote it are the main protection against that.

If CI fails on the agent's branch, `agent-retry.yml` posts the failing output on the issue and re-runs the agent on the same branch (see "Automation around the agent" below).

If the agent can't finish (the issue is ambiguous, build or tests fail, or the change needs out-of-scope files), it labels the issue `agent:needs-human` and comments why. Answer in a comment that starts with `/agent` (see "Giving the agent feedback"). Re-adding `agent:ready` also works, but it starts from fresh `dev` and force-pushes the same `agent/` branch, updating the existing PR.

## Labels

Created by `scripts/setup-agent-labels.sh`.

| Group | Labels | Notes |
|---|---|---|
| `type:*` | feature, fix, refactor, style, docs, chore, db, perf, test | Matches the commit types in `GIT_CONVENTIONS.md`. Bug and feature templates apply theirs automatically. The task template prefills a `chore:` title, and triage labels from that prefix. |
| `area:*` | kiosk, hub, discovery, games, cv, mobile, auth, db, ci | Added at triage from the template's Area field. |
| `model:*` | sonnet (default), opus | Optional. Picks the model for the run: `claude-sonnet-5-5` or `claude-opus-5-5`. Only one allowed; with two the run is refused. |
| `spec:*` | request, review | Optional. `request` has Claude draft a full spec from a rough issue; `review` marks the drafted spec as waiting for a human. |
| `agent:*` | ready → in-progress → review, or needs-human | `ready` is the only one humans add; the workflow manages the rest. |

Issues labeled `type:db` or `area:db` are refused: migrations, RLS policies and edge functions stay with humans.

## Automation around the agent

Four small workflows sit around `agent.yml`. A human decides what gets built, with one exception: low-risk specs start the agent on their own (see below).

| Workflow | Trigger | What it does |
|---|---|---|
| `triage.yml` | issue opened | Adds `area:*` from the template's Area field and `type:*` from a `feat:`/`fix:`/`docs:` title prefix when the template didn't set one. Deterministic, no model call. |
| `spec.yml` | label `spec:request` | Claude (read-only tools) rewrites a rough issue into the agent-ready format, keeps the original text in a collapsed block at the bottom, applies labels, and swaps `spec:request` for `spec:review`. If the idea is too vague it asks questions in a comment instead; answer, then re-add `spec:request`. Same allowlist as the agent. Low-risk specs skip review (see below). |
| `agent-feedback.yml` | comment or review starting with `/agent` | Re-runs the agent on the existing branch with your feedback. See below. |
| `agent-retry.yml` | CI fails on a run the agent dispatched | Posts the failing output on the issue and re-runs `agent.yml` on the same `agent/` branch (earlier commits are kept), at most twice. After that the issue goes to `agent:needs-human`. CI failures on commits a human pushed to the branch are ignored. |

Typical flow: file a one-line issue, add `spec:request`, read and edit the spec, add `agent:ready`, review the draft PR.

**Low-risk specs start the agent on their own.** When the drafted spec's type is in `AGENT_AUTO_TYPES` (default `docs,test`) and it touches neither `db` nor `ci`, `spec.yml` dispatches `agent.yml` directly instead of waiting on `spec:review`. It still opens a draft PR, so a human reviews the change before it merges; only the spec review is skipped. An existing `type:*` label (for example from the issue form) takes precedence over the model's guess. Change the list with `gh variable set AGENT_AUTO_TYPES -b "docs,test,chore"`, or set it to `none` to turn this off (an empty value falls back to the default).

In Claude Code, the `raise-issue` skill (`.claude/skills/raise-issue/`) does the filing for you: ask it to "raise an issue for X" and it writes a full spec directly (or a rough issue with `spec:request` if you only want to capture the idea). Use `spec.yml` for issues filed any other way, such as the web UI or someone without Claude Code.

## Giving the agent feedback

Once the agent has handed an issue over (`agent:review` or `agent:needs-human`), start a comment or review with `/agent` and say what to change:

- on the issue, e.g. `/agent use the existing SplitCameraPanel instead of a new component`
- in the draft PR's conversation
- as the body of a PR review, with inline comments attached to it
- as a single inline review comment

The agent restarts **on the same branch**, keeping its earlier commits, with the issue thread, the PR conversation, review bodies and inline comments (with their diff hunks) in its context. It updates the existing PR and goes back to `agent:review`. Answering an `agent:needs-human` question works the same way; if no branch exists yet it starts fresh.

- Only allowlisted users can use `/agent`. A comment from anyone else is treated as ordinary discussion and ignored.
- `/agent` must be the first word. Comments without it never start a run, so humans can discuss freely.
- While a run is in progress the command is declined; send it again when the agent finishes.
- Only comments and reviews from allowlisted users (and the Actions bot, for CI failure output) are included in the agent's context. Other people's comments are not shown to it.
- `/agent` is not limited like the CI retries: each revision needs a person to ask for it. If CI then fails on the revision, the usual two automatic retries apply.

## Which copy of a workflow runs

Most of this automation runs from the default branch, `main`, not `dev`. A workflow change merged into `dev` isn't live until `dev` is merged into `main`.

| Trigger | Workflow copy used |
|---|---|
| Issue events, `issue_comment`, `workflow_run`, `gh workflow run` without `--ref` | `main` |
| `pull_request_review`, `pull_request_review_comment` | the PR's merge ref, which for an agent PR is `dev` |

So while `dev` is ahead of `main`, a `/agent` PR review runs `dev`'s `agent-feedback.yml`, which dispatches `main`'s `agent.yml`. If the two disagree on `agent.yml`'s inputs, GitHub rejects the dispatch. Promote workflow changes to `main` soon after they merge, and test them there: the Claude token is only available to runs on `main`.

## Writing an agent-ready issue

Add `agent:ready` only once an issue meets this bar:

- **Opened by someone on the allowlist.** GitHub can't stop other people opening issues in a public repo, so the agent refuses any issue whose author isn't on `AGENT_ALLOWLIST`, whoever adds the label. If someone else reports something worth doing, open a new issue yourself and rewrite the request in your own words.
- **Self-contained.** The agent sees only the issue title, body, labels and comments, plus the repo. Include anything that lives in someone's head.
- **Concrete acceptance criteria.** A checklist that defines done.
- **Scoped.** One logical change. Split bigger work into several issues.
- **Code pointers** where you know them (files, components, an existing pattern to copy).
- **Verifiable without hardware.** Runners have no camera, MediaPipe, WebGL or Supabase, so the agent can only verify with `npm run build` and unit tests. CV, Pixi and kiosk-flow changes still get a manual check on the kiosk before merging. The PR's "Manual verification" section lists what to check.

Good fits: bug fixes with clear repro, pure logic and hooks, mobile UI tweaks, tests, refactors, docs. Poor fits: anything needing design decisions, tuning CV thresholds by feel, or database changes.

## Reviewing agent PRs

Agent PRs are drafts from `agent/<issue>-<slug>` branches and contain `Closes #<issue>`. Review them like any other PR. To ask for changes, push commits yourself or use `/agent` (see "Giving the agent feedback"). Pushing your own commits triggers CI normally. To throw the work away and start over, re-add `agent:ready`, which restarts from `dev` and force-pushes the branch.

## Setup (one-time, repo admin)

1. **Claude token.** On a machine with a Claude Pro/Max subscription, run `claude setup-token`, then store the token:
   ```bash
   gh secret set CLAUDE_CODE_OAUTH_TOKEN --env agent -R Spark-Me2You/me2you
   ```
   Every agent run uses that account's subscription limits. The token lasts about a year; regenerate it before it expires, or when the owner leaves the project.
2. **Labels.** `scripts/setup-agent-labels.sh`
3. **Allowlist.** Set the users who may start runs and whose issues the agent will work on. If unset, it falls back to `clow427,amernor`:
   ```bash
   gh variable set AGENT_ALLOWLIST -b "clow427,amernor" -R Spark-Me2You/me2you
   ```
4. **Allow Actions to open PRs.** Settings → Actions → General → Workflow permissions → tick "Allow GitHub Actions to create and approve pull requests" (the org setting must allow it too). Or run:
   ```bash
   gh api -X PUT repos/Spark-Me2You/me2you/actions/permissions/workflow \
     -f default_workflow_permissions=read -F can_approve_pull_request_reviews=true
   ```

## Limits and costs

- The repo is public, so GitHub-hosted runner minutes are free. Jobs are capped at 60 minutes by the workflow, and Claude at 80 turns.
- Runs are serialized per issue (`concurrency`), but different issues run in parallel. Each one draws on the same subscription.
- Only allowlisted users can start a run, and only on issues opened by an allowlisted user (default `clow427,amernor`). To change the list without a PR, set the `AGENT_ALLOWLIST` repo variable to a comma-separated list of usernames: `gh variable set AGENT_ALLOWLIST -b "clow427,amernor"`. If either check fails, the label is removed and a comment explains why. This limits prompt-injection exposure from public issues. `spec.yml` checks only who added `spec:request`, but a drafted spec still can't start the agent unless the issue's author is on the list.
- The allowlist controls who can start runs, not who can read the token. Anyone with write access can push a branch whose workflow reads repo secrets. The token is therefore stored in the `agent` Environment (the `work` job sets `environment: agent`), which is limited to `main` branches, so a workflow on any other branch can't read it. The environment has no required reviewers, so a run starts as soon as an allowlisted user adds `agent:ready`. To require approval for each run again, add required reviewers under Settings → Environments → agent. Don't also keep a repo-level copy.
- Earlier hardening work that was paused (closed PRs #125-127, the validate-and-resume plan) is archived in a [private doc](https://claude.ai/artifact/RHqW7EWHhGMGgCinMknuwn). Ask a repo admin for access.
