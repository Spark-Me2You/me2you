# CI/CD Overview

This document provides a quick summary of the continuous integration and deployment configuration for the `me2you` project.

## Workflows

- **ci.yml**: located at `.github/workflows/ci.yml`. It runs on pushes and pull requests targeting the `main` and `dev` branches. The job checks out the repo, sets up Node 20 with npm caching, and executes:

  ```yaml
  - run: npm ci
  - run: npm run build
  ```

  This ensures that every commit or PR builds successfully before being merged.

- **deploy.yml**: a template workflow in `.github/workflows/deploy.yml`. Triggered only on pushes to `main`. It currently contains a `build` job that mirrors the CI build and a placeholder `deploy` job. No actual deployment commands are present until hosting/platform details are added.
