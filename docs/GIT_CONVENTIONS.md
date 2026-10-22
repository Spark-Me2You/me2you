# Git Conventions

## Branch model

| Branch | Purpose |
|---|---|
| `main` | Production-ready. Deploys on push. Only updated by merging `dev`. |
| `dev` | Integration branch. All work lands here first. |
| `<type>/<name>` | Short-lived working branches, created from `dev`. |

Never commit directly to `main` or `dev`. CI (`npm run build`) runs on pushes and PRs targeting either.

## Branch naming

Format: `<type>/<short-kebab-case-name>`

```
feature/message-system
fix/hub-style
docs/git-conventions
```

- Lowercase, hyphen-separated, 2-5 words, describing the change (not the person or ticket-less "wip").
- If useful, append an issue number: `fix/123-avatar-accessory-display`.
- One purpose per branch. Delete the branch after it is merged.
- `agent/<issue>-<slug>` is reserved for branches created by the agent workflow (`docs/AGENT_WORKFLOW.md`).

### Types

Branch types and commit types share the same list:

| Type | Use for |
|---|---|
| `feature` / `feat` | New user-facing functionality |
| `fix` | Bug fixes |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `style` | Formatting / CSS-only changes with no logic change |
| `docs` | Documentation only |
| `chore` | Tooling, dependencies, config, repo maintenance |
| `db` | Supabase migrations, RLS, edge functions |
| `perf` | Performance improvements |
| `test` | Adding or fixing tests |
| `hotfix` | Urgent production fix, branched from `main` |

Branch names use `feature/`; commit prefixes use `feat:`. All other types are identical.

## Commit messages

Format: `<type>: <summary>`

```
feat: add 2-player FlapFlap game
fix: prevent avatar accessory from clipping on mobile
db: add messages delete policy
chore: update pixi.js to 8.17
```

Rules:

- Summary is imperative mood ("add", not "added"/"adds"), lowercase after the prefix, no trailing period, 72 characters or fewer.
- One logical change per commit. Don't mix refactors with behavior changes.
- Commit often on your branch; commits should build (`npm run build` passes).
- Use the body (blank line after the summary) to explain *why*, not *what*, when it isn't obvious. Wrap at 72 characters.
- Reference issues in the footer: `Closes #123`.
- Mark breaking changes with `BREAKING CHANGE:` in the footer.
- Don't commit secrets, `.env` files, or downloaded model files.

## Workflow

1. Update `dev`: `git checkout dev && git pull`
2. Branch: `git checkout -b feature/my-change`
3. Commit work using the format above.
4. Keep up to date by rebasing onto `dev` (`git fetch && git rebase origin/dev`) before opening the PR. Don't rebase branches others are working on.
5. Push and open a PR into `dev`.
6. After green CI (and a review, where practical), merge, then delete the branch.
7. Releases: open a PR from `dev` into `main`.

Hotfixes branch from `main` as `hotfix/<name>`, are PR'd into `main`, and then merged back into `dev`.

Prefer `--force-with-lease` over `--force` when force-pushing, and only rewrite history you own (your own feature branch). Force pushes to `dev` are not blocked by the ruleset, but should be rare, announced to the team, and never used to rewrite commits others have pulled. Never force-push `main`.

## Pull requests

**Title:** same format as a commit: `<type>: <summary>` (e.g. `feat: add messaging inbox`).

**Description should include:**

- **Summary**: what changed and why.
- **Changes**: bullet list of notable changes (include any migrations or new env vars).
- **Testing**: how you verified it (no automated test suite, so list manual steps, e.g. kiosk flow or mobile page checked).
- **Screenshots/video**: for UI or gameplay changes.
- **Related issues**: `Closes #123`.

**Expectations:**

- Target `dev` (releases target `main`).
- Keep PRs small and focused; split unrelated changes.
- `npm run build` and `npm run lint` pass; CI is green.
- Request a review from a teammate; approval and resolved comments are encouraged but not enforced by GitHub.
- Author merges once CI is green. Prefer squash merge for small feature/fix branches so history stays one commit per change; use a merge commit for `dev` → `main` releases.
- Database changes: add a new numbered migration in `supabase/migrations/`, never edit an applied one.

## GitHub enforcement

Branch rules are stored in `.github/rulesets/` and imported via Settings → Rules → Rulesets → New ruleset → Import a ruleset.

| Ruleset | Enforces on `dev` |
|---|---|
| `dev-branch-protection.json` | PR required (no direct pushes), no required approvals or thread resolution, squash merge only, `ci` check must pass, branch cannot be deleted |

Force pushes to `dev` are intentionally allowed. Squash merging must also be enabled under Settings → General → Pull Requests. If you rename the `ci` job in `.github/workflows/ci.yml`, update the status check name in the ruleset. A matching ruleset for `main` (merge commits only) is not yet defined.
