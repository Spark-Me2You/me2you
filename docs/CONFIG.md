# Configuration Overview

Build, lint and test configuration for `me2you`.

## Tooling

| Concern | Config | Notes |
|---|---|---|
| Build / dev server | `vite.config.ts` | React plugin with the React Compiler babel plugin, `@tailwindcss/vite`, path aliases (`@/`, `@/core`, `@/features`, `@/shared`) |
| TypeScript | `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | `npm run typecheck` runs `tsc -b`; aliases are mirrored in `tsconfig.app.json` |
| Lint | `eslint.config.js` | `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`; errors fail CI, warnings do not |
| Tests | `vitest.config.ts` | Vitest + jsdom + React Testing Library; extends `vite.config.ts`; setup in `src/test/setup.ts` |
| Styling | `src/styles/theme.css`, `src/styles/tailwind.css` | Tailwind CSS v4; see `BRAND_BOOK.md` |

## Main dependencies

React 19, React Router, Supabase (`@supabase/supabase-js`), PixiJS, MediaPipe Tasks Vision, `html5-qrcode` and `qrcode.react`. The `supabase` CLI is a dev dependency. See `package.json` for exact versions.

## Environment

Copy `.env.example` to `.env`. Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Optional Gumball Slice overrides: `VITE_GUMBALL_*` (defaults in `src/features/games/gumballslice/config/gumballSliceConfig.ts`).

## Notes

- Keep `package-lock.json` committed; CI installs with `npm ci`.
- Ensure file paths respect case sensitivity to avoid CI build failures on Linux runners.
