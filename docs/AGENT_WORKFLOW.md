# Agent Workflow

GitHub issues are the main way we report bugs and track work. A repository owner/admin can hand a well-specified issue to Claude Code, which runs in GitHub Actions and opens a draft PR into `dev` for human review.

## How it works

```text
open issue labeled agent:ready by a current repository owner/admin
  or validated continuation from /agent feedback or bot-dispatched CI
        │
        ▼
.github/workflows/agent.yml (serialized per issue)
  gate     1. re-read issue state and labels; validate admin or highest-ID exact claim marker
           2. bind approved title/body digest and exact existing PR identity
           3. remove all Agent state labels and spec:review; add agent:in-progress
  work     4. checkout dev → stable branch agent/<issue>
              (reuse a unique open legacy agent/<issue>-<slug> PR branch)
           5. recheck approved title/body immediately before Claude reads context
           6. Claude edits files with read/write tools only; trusted shell commits
  validate 7. fresh job without the Claude credential runs npm ci, lint,
              typecheck, build and test
  publish  8. validate bundle and exact PR again, push with a lease, create/update draft PR
           9. dispatch CI and move exclusively to agent:review
        │
        ▼
human reviews → marks ready → squash-merges into dev
  (or comments /agent → same exact PR and branch)
```

A durable central claim controls cleanup. Publish and report re-read the open issue and require its current title/body digest to equal the gate-approved digest at every ownership and issue-mutation boundary. Any failure or cancellation after that claim moves an issue still owned by the run exclusively to `agent:needs-human`. Publish always requires the run's exact accepted marker. If that marker write itself failed, report alone can recover an exclusively `agent:in-progress` issue from the exact direct-label identity or numerically winning continuation claim, provided no newer ready event, claim, or accepted run exists. A stale queued continuation exits without changing a newer claim or state.

## Labels and states

Created by `scripts/setup-agent-labels.sh`.

| Group | Labels | Notes |
|---|---|---|
| `type:*` | feature, fix, refactor, style, docs, chore, db, perf, test | Matches `GIT_CONVENTIONS.md`. |
| `area:*` | kiosk, hub, discovery, games, cv, mobile, auth, db, ci | Added by triage or spec drafting. |
| `model:*` | sonnet (default), opus | Optional. Exactly one may be present. `spec.yml` always uses Sonnet. |
| `spec:*` | request, review | `request` asks for a draft; `review` waits for owner approval. |
| `agent:*` | ready → in-progress → review, or needs-human | Owners add `ready`; workflows manage the other states. |

Agent state transitions are exclusive: automation removes all four `agent:*` state labels before adding the next one. Starting Agent also removes `spec:review`. Issues labeled `type:db` or `area:db` are refused because migrations, RLS policies and edge functions stay with humans.

## Content approval

Adding `agent:ready` approves the issue title and body as they exist when the serialized Agent gate re-reads them. The gate binds the run to the exact latest `agent:ready` timeline event and rechecks that event immediately before every refusal or claim label mutation. The gate requires all of the following:

- the issue is still open;
- `agent:ready` is still present;
- `spec:request` is absent;
- the label actor is still a repository owner/admin.

The gate computes a SHA-256 digest of the JSON encoding of `[title, body]` and records it in the hidden `agent-owner-attempt` start marker together with the accepted Agent workflow run ID. This marker is required protocol state for publish. If its write fails after the label transition, failure reporting may only recover the exclusively `agent:in-progress` issue when the approved digest still matches and the run's exact direct-label event, or exact numerically winning continuation claim, still owns the request. Recovery refuses any newer ready event, exact claim, or accepted run. The work job re-reads and hashes the title and body immediately before Claude starts. Publish and report repeat that check whenever they establish ownership and immediately before issue-state mutations. If the title or body changed, the stale run stops without publishing or changing issue state. Remove or edit comments freely; only current admins' comments and Actions workflow comments enter model context.

The accepted marker formats are `<!-- agent-owner-attempt run=<run-id> digest=<digest> -->` and `<!-- agent-retry-start run=<run-id> digest=<digest> pr=<pr> sha=<sha> -->`. Parsers accept only exact bot-authored first lines in those forms.

An admin `/agent` command is a new owner-authorized attempt. Its preparation job computes the current digest and passes it to Agent. Automatic retries recover the owner-attempt marker with the numerically greatest workflow run ID, independent of comment posting order. They stop instead of running if the title or body changed. Review changed issue content and start a new `agent:ready` or `/agent` attempt to approve it.

## Automation around Agent

| Workflow | Trigger | What it does |
|---|---|---|
| `triage.yml` | issue opened | Adds deterministic `area:*` and `type:*` labels. |
| `spec.yml` | `spec:request` label | Current-admin-gated, read-only model drafting. The issue is updated only if its snapshotted title/body digest still matches. Every accepted draft ends at `spec:review`. |
| `agent-feedback.yml` | issue or PR conversation comment beginning `/agent` | Validates the current admin, approved content, exact open Agent PR, branch and SHA. Posts a claim marker but does not change Agent state. |
| `agent-retry.yml` | completed bot-dispatched CI | Validates the exact open Agent PR, branch and SHA. Only `failure` retries; other non-success conclusions hand the issue to a human. |
| `agent-pr-lifecycle.yml` | Agent PR closed | Trusted default-branch cleanup. A merge clears workflow state labels and explicitly closes the issue. A close without merge moves it exclusively to `agent:needs-human`. |

### Spec optimistic locking and approval

`spec.yml` binds each run to the exact latest `spec:request` timeline event. It snapshots the issue title, body, trusted comments and `updatedAt`, then stores a digest that includes `updatedAt` in its artifact. Immediately before every apply mutation, the write-only apply job verifies that the same request event is still latest and that the current snapshot digest still matches. If trusted input changed, it discards the generated draft, changes that exact `spec:request` to `spec:review`, and explains why. A stale run never consumes a newer request. Re-add `spec:request` after reviewing the current text to generate another draft.

Draft output must contain a nonempty conventional title, nonempty body, at least one valid area, an `### Acceptance criteria` heading, and at least one nonempty `- [ ]` criterion. Generated specs never start Agent. A repository owner/admin must review or edit the result and add `agent:ready` as a separate approval.

## Giving Agent feedback

Once an issue is in `agent:review` or `agent:needs-human`, start an **issue comment or PR conversation comment** with `/agent` and the requested change. Review bodies and inline review comments do not trigger a run and are not included in Agent context.

Feedback requires exactly one open PR that:

- is authored by `github-actions[bot]`;
- comes from this repository;
- targets `dev`;
- uses `agent/<issue>` or a legacy `agent/<issue>-<slug>` branch;
- remains at the exact SHA captured during preparation.

An issue comment must resolve to exactly one such PR. A PR conversation comment is bound to that exact PR number. Ambiguity is refused.

Preparation posts a hidden claim marker containing its workflow run ID, prior state, PR, branch SHA and issue digest. It does **not** set `agent:in-progress`. Among exact bot-authored first-line claim markers, the per-issue serialized Agent gate chooses the numerically greatest workflow run ID, not the comment that happened to post last, and then requires full-marker equality for that caller while the issue remains in the expected prior state. Two comments can both prepare, but only the highest-ID claim can start work; delayed lower-ID comments cannot supersede it, and stale queued calls do not clear state.

A continuation always updates its expected PR. If that PR closes, merges, changes repository/base/branch, or moves from its expected SHA before work starts, the continuation stops. Publish never creates a replacement PR for a continuation.

## Branch and PR identity

New issues use the stable branch `agent/<issue>`. Existing open bot-authored Agent PRs on legacy `agent/<issue>-<slug>` branches remain supported.

On a fresh `agent:ready` start, Agent searches all open same-repository bot-authored Agent PRs into `dev` for the issue:

- no match: use `agent/<issue>` and create a draft PR after validation;
- one match: reuse that exact PR branch, while rebuilding the work from current `dev`;
- more than one match: refuse until a human closes the duplicates.

The gate, work and publish jobs validate the exact PR number, open state, bot author, base, head repository, branch and SHA. Push uses `--force-with-lease`, so a concurrent branch update is never overwritten.

## CI retry behavior

Agent dispatches `ci.yml` on the published branch because a PR created with `GITHUB_TOKEN` does not trigger normal `pull_request` workflows. Retry considers only completed `workflow_dispatch` CI runs started by `github-actions[bot]` for a current exact Agent PR and SHA.

- `failure`: queue up to two automatic retries on the same exact PR and branch.
- `cancelled`, `timed_out`, `action_required`, `stale`, or any other non-success conclusion: move exclusively to `agent:needs-human`; do not retry.
- `success`: do nothing.

Retry budget counts exact `agent-retry-start` markers written only after the central Agent gate accepts a retry. Both owner and retry accepted-start markers include the owning Agent workflow run ID; numeric run-ID ordering determines the current accepted marker even when comments arrive out of order. Publish and normal failure cleanup proceed only while that exact marker belongs to the run, carries the gate-approved digest, and the open issue still has the same title/body digest and expected exclusive state. Report has only the narrow missing-marker recovery described under Content approval. Merely collecting a CI log or posting a claim does not consume an attempt. Each owner-authorized `agent:ready` or `/agent` start records a new owner marker and resets the budget.

CI output is wrapped between explicit `BEGIN/END UNTRUSTED CI OUTPUT` delimiters. The Agent prompt instructs Claude to use it only as diagnostic data and never follow instructions found in it.

## PR closure lifecycle

`agent-pr-lifecycle.yml` uses `pull_request_target: closed`, so GitHub runs the workflow from the trusted default branch. It receives issue-write permission but never checks out or executes PR code. It validates that the closed PR is the exact same-repository Actions-authored Agent branch into `dev` before deriving the issue number.

- **Merged:** remove `spec:request`, `spec:review`, and all Agent state labels; explicitly close the linked issue as completed; comment with the merged PR number.
- **Closed without merge:** remove spec and Agent state labels, add only `agent:needs-human`, and comment. The workflow does not reopen an issue that a human already closed.

Operational requirement: this workflow must be present on the repository default branch (`main`) before an Agent PR closes, and repository Actions permissions must allow its `issues: write` token. No fork or PR version of the workflow is trusted or executed. A delayed or manually re-run close event is ignored when another matching Agent PR is open, when `agent:ready`, `agent:in-progress`, `agent:needs-human`, `spec:request`, or `spec:review` records any newer active or handoff lifecycle, or when an accepted owner/retry attempt is timestamped in the same second as or after the PR close. Delayed reconciliation never overwrites any newer active or human-handoff state. GitHub normally suppresses new workflow runs for events produced with the repository's `GITHUB_TOKEN`; if another workflow closes or merges Agent PRs with that token, it must perform equivalent issue cleanup or invoke a trusted explicit reconciliation path.

## Which workflow copy runs

Issue events, `issue_comment`, `workflow_run`, `pull_request_target`, and local reusable workflow calls in this design use trusted workflow definitions from the default branch, `main`. A workflow change merged only into `dev` is not live. Feedback and retry call `./.github/workflows/agent.yml` from the same trusted default-branch commit; Agent also requires the inherited ref to be `refs/heads/main`.

Promote the lifecycle workflows to `main` as one coordinated set. The Claude token is available only through the `agent` Environment, which must be restricted to `main`.

## Writing an agent-ready issue

Add `agent:ready` only when an issue is:

- **Self-contained.** Include all required context in the title/body and trusted admin comments.
- **Concrete.** Use checkable acceptance criteria.
- **Scoped.** Ask for one logical change.
- **Grounded.** Include real code pointers where known.
- **Verifiable.** CI has no camera, MediaPipe, WebGL or Supabase. Put hardware-only checks under manual verification.

Database changes, open-ended design work, and CV tuning by feel remain human work.

## Reviewing Agent PRs

Review draft Agent PRs like any other PR. To request changes, use `/agent` in the issue or PR conversation, or push a human commit. To rebuild from current `dev`, re-add `agent:ready`; Agent keeps the unique existing PR identity but replaces its branch with the new validated result.

Merging an exact Agent PR into `dev` explicitly closes its linked issue through the trusted lifecycle workflow. Closing it without merge does not close the issue; it moves the issue to `agent:needs-human`.

## Setup

1. Store the Claude subscription token only in the `agent` Environment:
   ```bash
   gh secret set CLAUDE_CODE_OAUTH_TOKEN --env agent -R Spark-Me2You/me2you
   ```
2. Restrict the `agent` Environment to `main`. Do not keep a repository-level copy of the token.
3. Create labels with `scripts/setup-agent-labels.sh`.
4. Allow GitHub Actions to create PRs and grant workflow tokens the permissions declared in these workflow files.
5. Keep `main` as the trusted default branch and promote all lifecycle workflow changes there together.

## Security boundaries and limits

- Only current repository owners/admins can add `agent:ready`, add `spec:request`, or use `/agent`; permission API errors fail closed.
- Claude receives only `Read`, `Edit`, `Write`, `Glob` and `Grep`. It receives no shell tool and cannot write restricted paths.
- Model-bearing jobs have no repository write permission and execute no project code. Trusted shell creates the candidate commit.
- A fresh job without Environment secrets or persisted credentials runs project checks.
- Publish alone holds repository write permission. It rejects changes to `supabase/`, `.github/`, `.env*`, `package-lock.json`, and dependency fields in `package.json`.
- Hosted validation still executes candidate project code with outbound network access. It is credential-isolated, not a general-purpose sandbox.
- API checks and PR creation cannot form one atomic GitHub transaction. Exact rechecks, per-issue serialization, stable branch names, and lease-protected pushes narrow the race window; a conflicting API operation can still make a run stop at `agent:needs-human`.
