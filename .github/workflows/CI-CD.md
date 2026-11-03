# CI/CD Overview

This document provides a quick summary of the continuous integration and deployment configuration for the `me2you` project.

## Workflows

- **ci.yml**: located at `.github/workflows/ci.yml`. It runs on pushes and pull requests targeting the `main` and `dev` branches. The job checks out the repo, sets up Node 22 with npm caching, and executes:

  ```yaml
  - run: npm ci
  - run: npm run lint
  - run: npm run build
  - run: npm test
  ```

  This ensures that every commit or PR lints cleanly (warnings allowed, errors fail), builds and passes unit tests before being merged.

- **agent.yml**, **triage.yml**, **spec.yml**, **agent-retry.yml**, **agent-feedback.yml**: the issue agent and its automation, documented in `docs/AGENT_WORKFLOW.md`. `agent-retry.yml` reacts to this CI workflow by name, so keep the workflow name `CI`.

- **deploy.yml**: a template workflow in `.github/workflows/deploy.yml`. Triggered only on pushes to `main`. It currently contains a `build` job that mirrors the CI build and a placeholder `deploy` job. No actual deployment commands are present until hosting/platform details are added.
