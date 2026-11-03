# Agent Workflow

GitHub issues are the main way we report bugs and track work. Well-specified issues can be handed to a Claude Code agent, which runs on GitHub Actions and opens a draft PR into `dev` for a human to review and merge.

## How it works

```
issue labeled agent:ready  (by an allowlisted user)
        │
        ▼
.github/workflows/agent.yml
  gate     1. labeler on the allowlist? issue not type:db / area:db?
           2. pick model from the model:* label, label agent:in-progress, comment with model and run link
  work     3. checkout dev → branch agent/<issue>-<slug>
           4. Claude reads the issue, edits code, runs build/test/lint, commits locally
           5. upload the new commits as a git bundle artifact
  publish  6. check the bundle (on top of the start commit, no supabase/ or .github/), push, open a draft PR
           7. dispatch CI on the branch (the required `ci` check)
           8. label agent:review, comment with PR link
        │
        ▼
human reviews → marks ready → squash-merges into dev
```

Claude can only read and edit files, run `npm run build|typecheck|test|lint`, `npx vitest`, and local `git status|diff|log|add|commit`. Build and test execute code the agent wrote, so the `work` job that runs them has a read-only `github.token` and no `GH_TOKEN`. Pushing, PR creation and label changes happen in `publish`, which holds the write token, runs no repo code, and treats the artifact from `work` as untrusted. It refuses changes to `supabase/`, `.github/`, `.env*`, `package-lock.json` or the dependency fields of `package.json`, and pushes with `--force-with-lease`: if someone pushed to the `agent/` branch during the run, nothing is overwritten and the issue goes to `agent:needs-human`. The Claude OAuth token is necessarily in `work`; if you suspect it leaked, regenerate it (see Setup). Any failure or cancellation after the issue is claimed moves it to `agent:needs-human`.

If CI fails on the agent's branch, `agent-retry.yml` posts the failing output on the issue and re-runs the agent on the same branch (see "Automation around the agent" below).

If the agent can't finish (the issue is ambiguous, build or tests fail, or the change needs out-of-scope files), it labels the issue `agent:needs-human` and comments why. Answer in a comment that starts with `/agent` (see "Giving the agent feedback"). Re-adding `agent:ready` also works, but it starts from fresh `dev` and replaces the same `agent/` branch, updating the existing PR.

## Labels

Created by `scripts/setup-agent-labels.sh`.

| Group | Labels | Notes |
|---|---|---|
| `type:*` | feature, fix, refactor, style, docs, chore, db, perf, test | Matches the commit types in `GIT_CONVENTIONS.md`. Bug and feature templates apply theirs automatically. |
| `area:*` | kiosk, hub, discovery, games, cv, mobile, auth, db, ci | Added at triage from the template's Area field. |
| `model:*` | sonnet (default), opus | Optional. Picks the model for the run via the Claude Code `sonnet` / `opus` alias, i.e. the newest model of that family in the pinned `claude-code-action`. Only one allowed; with two the run is refused. `spec.yml` always uses `sonnet`. |
| `spec:*` | request, review | Optional. `request` has Claude draft a full spec from a rough issue; `review` marks the drafted spec as waiting for a human. |
| `agent:*` | ready → in-progress → review, or needs-human | `ready` is the only one humans add; the workflow manages the rest. |

Issues labeled `type:db` or `area:db` are refused: migrations, RLS policies and edge functions stay with humans.

## Automation around the agent

Three small workflows sit around `agent.yml`. None of them add `agent:ready`: a human still decides what gets built.

| Workflow | Trigger | What it does |
|---|---|---|
| `triage.yml` | issue opened | Adds `area:*` from the template's Area field and `type:*` from a `feat:`/`fix:`/`docs:` title prefix when the template didn't set one. Deterministic, no model call. |
| `spec.yml` | label `spec:request` | Claude (read-only tools) rewrites a rough issue into the agent-ready format, keeps the original text in a collapsed block at the bottom, applies labels, and swaps `spec:request` for `spec:review`. If the idea is too vague it asks questions in a comment instead; answer, then re-add `spec:request`. Same allowlist as the agent. Low-risk specs skip review (see below). |
| `agent-feedback.yml` | comment or review starting with `/agent` | Re-runs the agent on the existing branch with your feedback. See below. |
| `agent-retry.yml` | CI fails on a run the agent dispatched | Posts the failing output on the issue and re-runs `agent.yml` on the same `agent/` branch (earlier commits are kept), at most twice. After that the issue goes to `agent:needs-human`. CI failures on commits a human pushed to the branch are ignored. |

Typical flow: file a one-line issue, add `spec:request`, read and edit the spec, add `agent:ready`, review the draft PR.

**Low-risk specs start the agent on their own.** When the drafted spec's type is in `AGENT_AUTO_TYPES` (default `docs,test`) and neither the model's areas nor the issue's existing `area:*` labels include `db` or `ci`, `spec.yml` dispatches `agent.yml` directly instead of waiting on `spec:review`. It still opens a draft PR, so a human reviews the change before it merges; only the spec review is skipped. An existing `type:*` label (for example from the issue form) takes precedence over the model's guess. Change the list with `gh variable set AGENT_AUTO_TYPES -b "docs,test,chore"`, or set it to `none` to turn this off (an empty value falls back to the default).

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
- While a run is in progress, or queued from an earlier `/agent`, the command is declined; send it again when the agent finishes.
- Only comments and reviews from allowlisted users (and the Actions bot, for CI failure output) are included in the agent's context, and in the spec drafter's. Other people's comments are not shown to either.
- `/agent` is not limited like the CI retries: each revision needs a person to ask for it. If CI then fails on the revision, it gets a fresh two automatic retries. The count resets at every human-started attempt (`agent:ready`, `/agent`, spec auto-start), which `agent.yml` marks with a hidden `<!-- agent-run -->` in its start comment.

Review events (`pull_request_review`, `pull_request_review_comment`) run the copy of `agent-feedback.yml` from the PR's merge ref, which for an agent PR is the one on `dev`. That workflow holds no secrets and only checks the allowlist before dispatching `agent.yml`.

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
3. **Allowlist.** Set the users who may start runs. Until this is set, every workflow refuses to run:
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
- Only users in the `AGENT_ALLOWLIST` repo variable (comma-separated logins, see Setup) can start a run, draft a spec or use `/agent`. It is the single source for all four workflows and has no default, so an unset variable means nobody. If anyone else adds `agent:ready`, the label is removed and a comment explains why. This also limits prompt-injection exposure from public issues: the person who adds the label is vouching for the issue content.
- The allowlist controls who can start runs, not who can read the token. Anyone with write access can push a branch whose workflow reads repo secrets. The token is therefore stored in the `agent` Environment (only the `work` job sets `environment: agent`), which is limited to `main` branches, so a workflow on any other branch can't read it. The environment has no required reviewers, so a run starts as soon as an allowlisted user adds `agent:ready`. To require approval for each run again, add required reviewers under Settings → Environments → agent. Don't also keep a repo-level copy.
