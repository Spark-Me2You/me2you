# Agent Workflow

GitHub issues are the main way we report bugs and track work. Well-specified issues can be handed to a Claude Code agent, which runs on GitHub Actions and opens a draft PR into `dev` for a human to review and merge.

## How it works

```
issue labeled agent:ready (by a repository owner/admin)
  or validated by: agent-feedback.yml (/agent) · agent-retry.yml (CI failed)
        │
        ▼ reusable call to the trusted agent.yml on main
.github/workflows/agent.yml
  gate     1. direct starter is a current repository admin, or the reusable call
              has a trusted main ref, valid inputs and reason-specific checks?
              issue not type:db / area:db?
           2. pick model from the model:* label, label agent:in-progress, comment with model and run link
  work     3. checkout dev → branch agent/<issue>-<slug> (or the existing branch for /agent and CI retries)
           4. Claude reads the issue and edits files with read/write tools only
           5. trusted shell validates the result, commits with hooks disabled, and uploads a bundle
  validate 6. a fresh job with no Environment secrets checks out the candidate and runs npm ci,
              lint, typecheck, build and test
  publish  7. check the bundle (on top of the start commit, no supabase/ or .github/), push, open a draft PR
           8. dispatch CI on the branch (the required `ci` check), since PRs opened with GITHUB_TOKEN don't trigger pull_request workflows
           9. label agent:review, comment with PR link
        │
        ▼
human reviews → marks ready → squash-merges into dev
  (or comments /agent → back to the top, on the same branch)
```

Any failure or cancellation after the issue is claimed moves it to `agent:needs-human`. See "Security model" for what the agent is allowed to do.

If CI fails on the agent's branch, `agent-retry.yml` posts the failing output on the issue and re-runs the agent on the same branch (see "Automation around the agent" below).

If the agent can't finish (the issue is ambiguous, the change needs out-of-scope files, or the secretless validation job fails), it labels the issue `agent:needs-human` and comments why. Answer in a comment that starts with `/agent` (see "Giving the agent feedback"). Re-adding `agent:ready` also works, but it starts from fresh `dev` and replaces the same `agent/` branch, updating the existing PR.

## Labels

Created by `scripts/setup-agent-labels.sh`.

| Group | Labels | Notes |
|---|---|---|
| `type:*` | feature, fix, refactor, style, docs, chore, db, perf, test | Matches the commit types in `GIT_CONVENTIONS.md`. Bug and feature templates apply theirs automatically. The task template prefills a `chore:` title, and triage labels from that prefix. |
| `area:*` | kiosk, hub, discovery, games, cv, mobile, auth, db, ci | Added at triage from the template's Area field. |
| `model:*` | sonnet (default), opus | Optional. Picks the model for the run via the Claude Code `sonnet` / `opus` alias, i.e. the newest model of that family in the pinned `claude-code-action`. Only one allowed; with two the run is refused. `spec.yml` always uses `sonnet`. |
| `spec:*` | request, review | Optional. `request` has Claude draft a full spec from a rough issue; `review` marks the drafted spec as waiting for a repository admin. |
| `agent:*` | ready → in-progress → review, or needs-human | `ready` is the only one repository admins add; the workflow manages the rest. |

Issues labeled `type:db` or `area:db` are refused: migrations, RLS policies and edge functions stay with humans.

## Automation around the agent

Four small workflows sit around `agent.yml`. A repository owner/admin decides what gets built, and every generated spec requires a separate `agent:ready` approval.

| Workflow | Trigger | What it does |
|---|---|---|
| `triage.yml` | issue opened | Adds `area:*` from the template's Area field and `type:*` from a `feat:`/`fix:`/`docs:` title prefix when the template didn't set one. Deterministic, no model call. |
| `spec.yml` | label `spec:request` | After verifying the labeler is a current repository admin in a narrow gate job, Claude rewrites the request with read-only tools in the secret-bearing generation job. A separate job with issue write permission applies the spec, keeps the original text, and swaps `spec:request` for `spec:review`. If the idea is too vague it asks questions instead; answer, then re-add `spec:request`. Every drafted spec waits for a second admin action: review or edit it, then add `agent:ready`. |
| `agent-feedback.yml` | issue or PR conversation comment starting with `/agent` | After verifying that the commenter is a current repository admin and the PR identity is valid, prepares the continuation and calls the trusted reusable `agent.yml` on the existing branch. Review bodies and inline review comments do not trigger it. See below. |
| `agent-retry.yml` | CI fails on a run the agent dispatched | Validates the bot-started CI run and exact PR, posts the failing output on the issue, then calls the trusted reusable `agent.yml` on the same `agent/` branch (earlier commits are kept), at most twice. After that the issue goes to `agent:needs-human`. CI failures on commits a human pushed to the branch are ignored. |

Typical flow: file a one-line issue, add `spec:request`, read and edit the spec, add `agent:ready`, review the draft PR.

**Every generated spec requires a second admin approval.** `spec.yml` always adds `spec:review` and never starts `agent.yml`. A repository owner/admin must read or edit the generated spec and then add `agent:ready`. Database guidance still applies: issues labeled `type:db` or `area:db` are refused by the agent.

In Claude Code, the `raise-issue` skill (`.claude/skills/raise-issue/`) does the filing for you: ask it to "raise an issue for X" and it writes a full spec directly (or a rough issue with `spec:request` if you only want to capture the idea). Use `spec.yml` for issues filed any other way, such as the web UI or someone without Claude Code.

## Giving the agent feedback

Once the agent has handed an issue over (`agent:review` or `agent:needs-human`), start an **issue comment or PR conversation comment** with `/agent` and say what to change:

- on the issue, e.g. `/agent use the existing SplitCameraPanel instead of a new component`
- in the draft PR's conversation

The agent restarts **on the same branch**, keeping its earlier commits, with the issue thread and PR conversation comments in its context. It updates the existing PR and goes back to `agent:review`. Review bodies and inline review comments neither trigger a run nor enter the agent context.

- Only current repository owners/admins can use `/agent`. The workflow checks permission live and ignores everyone else.
- `/agent` must be the first word. Comments without it never start a run, so humans can discuss freely.
- `/agent` requires the existing open agent PR. A PR conversation command is accepted only on an open bot-authored PR from this repository into `dev` whose branch exactly matches `agent/<issue>-<slug>`. An issue command must resolve to exactly one such PR; zero or multiple matches are refused.
- While a run is in progress, or queued from an earlier `/agent`, the command is declined; send it again when the agent finishes.
- Only comments from current repository admins (and the Actions bot for workflow output) are included in the agent's and spec drafter's context.
- `/agent` is not limited like the CI retries: each revision needs an admin to ask for it. If CI then fails on the revision, it gets a fresh two automatic retries. The count resets at every admin-started attempt (`agent:ready` or `/agent`), which `agent.yml` marks with a hidden `<!-- agent-run -->` in its start comment.

## Which copy of a workflow runs

Issue events, `issue_comment` and `workflow_run` use workflow files from the default branch, `main`, not `dev`. A workflow change merged into `dev` isn't live until `dev` is merged into `main`.

Both continuation workflows call the reusable `agent.yml` from the same trusted `main` commit. The agent gate also requires the inherited ref to be `refs/heads/main`, so pull-request merge refs and other branches cannot enter the secret-bearing jobs. Feedback and retry therefore use an atomic, trusted workflow set without a separate dispatch or caller-run timing check. Promote workflow changes to `main` soon after they merge, and test them there: the Claude token is only available to runs on `main`.

## Writing an agent-ready issue

Add `agent:ready` only once an issue meets this bar:

- **Self-contained.** The agent sees only the issue title, body, labels and comments, plus the repo. Include anything that lives in someone's head.
- **Concrete acceptance criteria.** A checklist that defines done.
- **Scoped.** One logical change. Split bigger work into several issues.
- **Code pointers** where you know them (files, components, an existing pattern to copy).
- **Verifiable without hardware.** The secretless validation runner has no camera, MediaPipe, WebGL or Supabase, so it can only verify with project checks and unit tests. CV, Pixi and kiosk-flow changes still get a manual check on the kiosk before merging. The PR's "Manual verification" section lists what to check.

Good fits: bug fixes with clear repro, pure logic and hooks, mobile UI tweaks, tests, refactors, docs. Poor fits: anything needing design decisions, tuning CV thresholds by feel, or database changes.

## Reviewing agent PRs

Agent PRs are drafts from `agent/<issue>-<slug>` branches and contain `Closes #<issue>`. Review them like any other PR. To ask for changes, push commits yourself or use `/agent` (see "Giving the agent feedback"). Pushing your own commits triggers CI normally. To throw the work away and start over, re-add `agent:ready`, which restarts from `dev` and replaces the branch.

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

## Security model

- **Who can start runs.** Only current repository owners/admins can add `agent:ready`, add `spec:request`, or use `/agent`. Each entry workflow checks the actor live through GitHub's repository permission API and requires admin permission; API errors fail closed. If anyone else adds a start label, the label is removed and the run does not reach the Claude token. The admin who adds the label is vouching for the issue body.
- **Reusable calls.** Feedback and retry call the reusable `agent.yml` from the same trusted `main` commit; there is no generic or manual Agent dispatch. The agent gate requires `refs/heads/main`, validates the reason, branch and expected SHA, rechecks the feedback initiator's identity and current admin permission, and verifies that the branch still has the expected commit. `agent-retry.yml` first requires bot-started failed CI and an exact open bot-authored PR from this repository into `dev`. The feedback and retry preparation jobs hold no secrets and cannot grant more permission than their reusable-call jobs declare.
- **What the agent can do.** Claude can use only `Read`, `Edit`, `Write`, `Glob` and `Grep`; it has no Bash tool and cannot write restricted paths, including `.git/`. Trusted workflow shell validates its structured output and creates the commit with hooks disabled. A fresh job with no Environment secrets or persisted checkout credential runs `npm ci`, lint, typecheck, build and test against the candidate commit.
- **Where the write token is.** Pushing, PR creation and label changes happen in `publish`, which holds the repository write token, runs no repo code, and treats the artifact from `work` as untrusted. It refuses changes to `supabase/`, `.github/`, `.env*`, `package-lock.json` or the dependency fields of `package.json`. It pushes with `--force-with-lease`: if someone pushed to the `agent/` branch during the run, nothing is overwritten and the issue goes to `agent:needs-human`. Spec generation cannot mutate issues; a separate secretless `apply` job holds only `issues: write`.
- **Where the Claude token is.** Repository-admin checks control who can start runs, not who can read the token. Anyone with write access can push a branch whose workflow reads repo secrets, so the token is stored in the `agent` Environment (only `agent.yml`'s non-executing `work` job and `spec.yml`'s read-only `generate` job set `environment: agent`), which is limited to `main`. A workflow on any other branch can't read it. Don't also keep a repo-level copy. Neither job installs dependencies, runs project commands, offers Claude Bash, or holds repository write permission; generated code runs later without the Claude credential. If you suspect the token leaked, regenerate it (see Setup).
- **Approvals.** Every generated spec stops at `spec:review`; a repository owner/admin must add `agent:ready` as a second action. The environment has no required reviewers, so an otherwise valid run starts after that admin action. To require another approval for each run, add required reviewers under Settings → Environments → agent.
