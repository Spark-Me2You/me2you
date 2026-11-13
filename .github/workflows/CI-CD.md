# CI/CD Overview

This document provides a quick summary of the continuous integration and deployment configuration for the `me2you` project.

## Workflows

- **ci.yml**: located at `.github/workflows/ci.yml`. It runs on pushes and pull requests targeting the `main` and `dev` branches, with a read-only `contents: read` token. The `ci` job checks out the repo, sets up Node 22 with npm caching, and executes:

  ```yaml
  - run: npm ci
  - run: npm run lint -- --max-warnings 34
  - run: npm run build
  - run: npm run test:coverage
  - run: npm audit --audit-level=high --omit=dev   # continue-on-error
  ```

  - **Lint ratchet.** Errors fail the build, and so does any increase over the baseline of 34 warnings. Lower the number in `ci.yml` as warnings are fixed; never raise it.
  - **Coverage thresholds.** `test:coverage` fails if coverage drops below the floor in `vitest.config.ts` (lines 50, statements 44, functions 50, branches 33). Raise the floor as coverage improves. Tests under `supabase/functions/_shared/*.test.ts` are collected too.
  - **Audit.** `npm audit` on production dependencies reports high-severity advisories but does not block (`continue-on-error: true`).
  - **Edge functions.** The separate `edge-functions` job runs `deno check supabase/functions/*/index.ts` (`denoland/setup-deno@v2`). It has never run before, so it is `continue-on-error: true`; remove that once it is green to make it blocking.

- **agent.yml**, **triage.yml**, **spec.yml**, **agent-retry.yml**, **agent-feedback.yml**: the issue agent and its automation, documented in `docs/AGENT_WORKFLOW.md`. `agent-retry.yml` reacts to this CI workflow by name, so keep the workflow name `CI`. Before publishing an agent's commits, `agent.yml` refuses (sends the issue to `agent:needs-human`) any change to `supabase/`, `.github/`, `.env*`, `package-lock.json`, the dependency fields or `scripts` of `package.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`, `tsconfig*.json` or `scripts/**`, because those files execute next to the Claude token during the agent's build, test and lint runs. `agent-retry.yml` posts the CI log tail inside a fence marked as untrusted output.

- **deploy.yml**: a template workflow in `.github/workflows/deploy.yml`. Triggered only on pushes to `main`. It currently contains a `build` job that mirrors the CI build and a placeholder `deploy` job. It has `contents: read` permissions and installs with `npm ci`. No actual deployment commands are present until hosting/platform details are added.
