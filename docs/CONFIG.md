# Configuration Overview

This document summarizes the linting and build configuration used in the `me2you` project.

## ESLint

- ESLint is configured via `eslint.config.js` in the project root.
- Uses `@eslint/js` parser and plugins for React (`eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`).
- `typescript-eslint` is included for TypeScript support.

### Common commands

```bash
npm run lint          # run ESLint across the project
```

## TypeScript

- The project is a TypeScript application (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`).
- `tsc -b` is used during the build process to compile the code.

## Build Tooling

- Vite is the development/build tool (`vite.config.ts`).
- Scripts defined in `package.json`:
  - `dev` – start Vite dev server
  - `build` – run TypeScript build and then `vite build`
  - `preview` – run `vite preview`

## Notes

- The repo currently contains only React and React DOM as dependencies; add additional packages as needed and update this summary accordingly.
- Keep the `package-lock.json` committed to ensure reproducible builds.
- Ensure file paths respect case sensitivity to avoid CI build failures on Linux runners.
