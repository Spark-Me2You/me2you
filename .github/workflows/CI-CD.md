# CI/CD Overview

This document provides a quick summary of the continuous integration and deployment configuration for the `me2you` project.

## Workflows

- **ci.yml**: located at `.github/workflows/ci.yml`. It runs on pushes and pull requests targeting the `main` and `dev` branches. The job checks out the repo, sets up Node 22 with npm caching, and executes:

  ```yaml
  - run: npm ci
  - run: npm run build
  - run: npm test
  ```

  This ensures that every commit or PR builds and passes unit tests before being merged.

  A second job, `stories`, builds the Ladle component catalog and smoke-tests every story in headless Chromium:

  ```yaml
  - run: npx playwright install --with-deps chromium
  - run: npm run ladle:build
  - run: npm run test:stories
  ```

  A story fails if it throws, logs a console error, or renders the ErrorBoundary fallback. On failure the Playwright HTML report (with traces) is uploaded as the `playwright-report` artifact. See `docs/LADLE.md`.

- **deploy.yml**: a template workflow in `.github/workflows/deploy.yml`. Triggered only on pushes to `main`. It currently contains a `build` job that mirrors the CI build and a placeholder `deploy` job. No actual deployment commands are present until hosting/platform details are added.
