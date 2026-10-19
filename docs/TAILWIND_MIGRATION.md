# Tailwind Migration Plan

Migrating every `*.module.css` file (58 files, ~7.5k lines) plus `src/index.css` to **Tailwind CSS v4**, one page/feature at a time. Each step is a separate commit (and ideally a separate PR into `dev`) so it can be verified and reverted in isolation.

Branch: `style/tailwind-migration` (branched from `dev`). Commit format per `GIT_CONVENTIONS.md`, e.g. `style: migrate UserLandingPage to Tailwind`.

## Decisions

| Topic | Decision |
|---|---|
| Version | Tailwind v4 via `@tailwindcss/vite` (no `tailwind.config.js`, no PostCSS) |
| Theme tokens | Move to `@theme` in CSS; `src/shared/theme/*.ts` is deleted or reduced to values Pixi/TS genuinely needs |
| Large files | Split by screen / step; one migration step each |
| Inline styles | Static ones become utilities; runtime-computed ones (`style={{ left: x }}`) stay, preferably as CSS vars (`style={{ '--x': x }}` + `left-(--x)`) |
| Pixi code | Untouched. Only the DOM wrapper/canvas container classes change |
| Global `index.css` | Left in place during migration; template leftovers removed in the final step |
| Mixing | CSS Modules and Tailwind coexist until the last step. A file is **fully** converted in its step (no half-converted components), and its `.module.css` is deleted in the same commit |

## Per-step workflow (applies to every step from Phase 2 on)

1. Read the component `.tsx` and its `.module.css` together.
2. Replace `className={styles.x}` with utilities. Translate rules faithfully; don't redesign. Use `@theme` tokens, not arbitrary values, where a token exists.
3. Pull-ups that don't map cleanly to utilities (complex `@keyframes`, `clip-path`, multi-layer gradients, pseudo-element art) go in `@theme` (keyframes/animations) or as `[arbitrary]` utilities; only as a last resort into a small named class in `src/styles/components.css`.
4. Delete the `.module.css` and its import. Check nothing else imported it (`grep -rn "<Name>.module.css" src`).
5. `npm run build` and `npm run lint` pass.
6. **Verify visually** against the `dev` branch in a second window (see "Verification" below). Stop here for sign-off before starting the next step.
7. Commit: `style: migrate <Name> to Tailwind`.

## Verification

- For each step, compare the affected route(s) side by side with a second browser window running the `dev` branch, at the relevant viewport.
  - Mobile routes: 390×844 (also check ~320px width; `body` has `min-width: 320px`).
  - Kiosk (`/app`): 1920×1080. The kiosk shell is Figma-scaled, so also check at a smaller window to confirm scaling is unchanged.
- Check hover/active/disabled/focus states and any modal or error state the component has, not only the happy path.
- Watch for Tailwind **preflight** side effects (see Phase 1): headings and lists lose default sizes/margins, buttons lose borders, images become `display: block`.
- Optional: `npm run build` and compare the CSS bundle size in `dist/assets` before and after the final step.

## Phase 0: Baseline (before any code change)

- [ ] Confirm `npm run build` and `npm run lint` pass on the branch as-is.
- [ ] No screenshots: compare against a second browser window running `dev` (e.g. a separate checkout or `git worktree` on port 5174) side by side with the migration branch.
- [ ] Note which routes need real data/auth to render (`/user/*` needs a user session; `/app` needs admin or kiosk session) so you can set up test accounts beforehand.

## Phase 1: Tailwind foundation (no visual change intended)

1. `npm i -D tailwindcss @tailwindcss/vite`
2. Add the plugin to `vite.config.ts`: `import tailwindcss from '@tailwindcss/vite'` and `plugins: [tailwindcss(), react(...)]`.
3. Create `src/styles/tailwind.css`:
   ```css
   @layer theme, base, components, utilities;
   @import "tailwindcss/theme.css" layer(theme);
   /* preflight intentionally NOT imported yet; see step 1.5 */
   @import "tailwindcss/utilities.css" layer(utilities);
   @import "./theme.css";
   ```
   Importing without preflight keeps unconverted pages unchanged while utilities become usable.
4. Create `src/styles/theme.css` with an `@theme { ... }` block porting `colors.ts` (magenta, btn palette, glass, error, gradient stops), `spacing.ts`/`typography.ts` as needed, and fonts from the Google Fonts import in `index.css` (`--font-jersey: "Jersey 10"`, `--font-averia`, `--font-pixelify`, `--font-caveat`, `--font-barlow`). Don't add keyframes yet; add them as each step needs them.
5. Import `./styles/tailwind.css` in `main.tsx` **after** `./index.css`.
6. **Step 1.5 (preflight), decide timing with the user:** preflight changes global defaults (button/heading/img/list resets). Either enable it here and fix fallout everywhere, or (default in this plan) enable it in the final phase once nothing depends on browser defaults. Until then, newly converted components must set what preflight would have (`border-0`, `m-0`, `block` on images) explicitly.
7. Verify: app looks identical on every route; a throwaway `className="bg-magenta"` renders correctly (then remove it).

**Stop and verify.**

## Phase 2: Shared components (used across many pages)

Do these first since later pages depend on them. After each, spot-check 2–3 pages that use it.

| Step | File(s) | Spot-check on |
|---|---|---|
| 2.1 | `shared/components/GlassCard` | Pages using GlassCard (`grep -rn GlassCard src`) |
| 2.2 | `shared/components/ExitButton` | Games screens |
| 2.3 | `shared/components/BadgeDisplay` | `/user/profile` |

## Phase 3: Small standalone pages (low risk, build confidence)

| Step | Route | Files |
|---|---|---|
| 3.1 | `/claim/:tokenId` | `ClaimPage`, `ClaimErrorPage`, `ClaimSuccessPage`, `ClaimQR`, `ClaimScanner` (verify each state: loading, scanning, error, success) |
| 3.2 | `/login` | `AdminLoginPage`, `LoginForm` |
| 3.3 | `/select-org` | `OrgSelectorPage` |
| 3.4 | `/register` (entry) | `RegistrationPage`, `RegistrationError` |

## Phase 4: Mobile user area (`/user/*`)

| Step | Route | Files |
|---|---|---|
| 4.1 | `/user` | `UserLandingPage`, `CreateAccountPrompt` |
| 4.2 | `/user/gallery` | `UserGalleryPage` |
| 4.3 | `/user/game-scores` | `UserGameScoresPage` |
| 4.4 | `/user/messages` | `MessagesView`, `MessageComposePage` |
| 4.5 | `/user/profile` | `UserProfileView` (549 lines), `UserProfileEditForm` (349), `UserPhotoCaptureModal` (247), `UserMiiPixiPreview` |
| 4.6 | `/user/customize` | `CustomizeAvatarView` (282) |

Pixi preview containers (`UserMiiPixiPreview`, avatar canvases): only the wrapper classes change; confirm the canvas sizes and resize behavior are unchanged.

## Phase 5: Registration flow

`RegistrationSteps.module.css` (983 lines) is shared by five components. Split by consumer, one step each, so the shared module shrinks until it is deleted:

| Step | Component | Notes |
|---|---|---|
| 5.1 | `SignUpStep` | |
| 5.2 | `PhotoStep` | camera/face-crop states |
| 5.3 | `ProfileStep` | |
| 5.4 | `BobbleheadPreviewStep` | |
| 5.5 | `GoBackWarning`, `SuccessStep` | Delete `RegistrationSteps.module.css`. Before this, if a rule is used by more than one step, convert it in the first step that uses it and keep it in the module until the last consumer is done |

## Phase 6: Kiosk features

| Step | Feature | Files |
|---|---|---|
| 6.1 | Kiosk QR | `RegistrationQRDisplay`, `PinnedRegistrationQR` |
| 6.2 | Discovery | `DiscoveryView`, `CameraView`, `PoseOverlay`, `RandomImageCard`, `HelpPopup` |
| 6.3 | Games hub | `GamesHub` (428 lines), `CameraOverlay`, `FlapFlapLauncher` |
| 6.4 | FlapFlap 1P | `FlapFlapGame`, `FlapFlapLeaderboard`, `GameOverClaim` |
| 6.5 | FlapFlap 2P | `FlapFlap2PGame`, `SplitCameraPanel` |
| 6.6 | DrawIt (a) | `DrawItMenu`, `DailyPromptScreen`, `Countdown`, `Timer` |
| 6.7 | DrawIt (b) | `DrawItGame`, `DrawingCanvas`, `Toolbox`, `ConfirmModal` |
| 6.8 | DrawIt (c) | `ReviewScreen`, `Gallery`, `ThanksScreen` |

Kiosk screens are driven by the CV cursor. After each step, confirm the hover/click targets still line up (the cursor hit-testing uses element bounds, so sizing/positioning changes matter).

## Phase 7: `AppContainer.module.css` (837 lines, riskiest)

It styles several kiosk states at once with Figma-derived absolute positioning (`left`, `top`, `inset`, rotations) inside a scaled 1920×1080 stage. Do this step-by-step by section (see the section comments in the file), keeping positions pixel-identical:

| Step | Section |
|---|---|
| 7.1 | Shell + Idle screen (logo, power icon, otter, speech bubble) |
| 7.2 | Menu buttons (Discover / Games / Network) |
| 7.3 | Onboarding / "about" cork board and cards |
| 7.4 | Info button + dwell-to-open ring (keyframes go in `@theme`) |
| 7.5 | QR section, polaroid/label SVG frames, legacy/non-idle states |

Prefer Tailwind arbitrary values (`left-[424px] top-[228px] w-[599px] rotate-[4.26deg]`) here to preserve Figma numbers exactly. Compare the two windows at 1920×1080 and at a scaled-down window. Delete `AppContainer.module.css` at the end of 7.5.

## Phase 8: Cleanup

1. Move remaining global rules from `index.css` into `@layer base` in `src/styles/tailwind.css`; drop Vite-template leftovers (the global `button`, `h1`, `a`, `:root` color-scheme rules) after confirming nothing relies on them.
2. Enable preflight (`@import "tailwindcss/preflight.css" layer(base);`) and fix any fallout on every route.
3. Delete `index.css` (move the Google Fonts `@import` into `tailwind.css`/`index.html`).
4. Delete or slim `src/shared/theme/*` per the Decisions table; update any remaining imports (`LoginForm`, `OrgSelectorPage` import it today).
5. Remove the `vite-env`/`*.module.css` typings if present and confirm `grep -r "module.css" src` returns nothing.
6. Full pass over all routes + kiosk states against the `dev` branch in the second window; run `npm run build` and `npm run lint`.

## Documentation updates (done with this plan)

- `CLAUDE.md`: styling convention (Tailwind v4, `@theme` tokens, no new CSS Modules) and a note that the migration is in progress.
- `docs/architecture.md`: new **Styling** section; `theme/` row updated.
- `docs/README.md`: link to this plan.

At the end of the migration (Phase 8), also: remove the "in progress" notes from `CLAUDE.md`/`architecture.md`, update the `theme/` row if it was deleted, and add `@tailwindcss/vite` to any setup notes in `README.md` if relevant.

## Progress

Tick as steps complete.

- [x] Phase 0 baseline (lint baseline: 53 problems, 50 errors, 3 warnings, all pre-existing)
- [x] Phase 1 foundation
- [ ] Phase 2 shared (2.1 done; 2.2–2.3 pending)
- [ ] Phase 3 small pages (3.1–3.4)
- [ ] Phase 4 user area (4.1–4.6)
- [ ] Phase 5 registration (5.1–5.5)
- [ ] Phase 6 kiosk features (6.1–6.8)
- [ ] Phase 7 AppContainer (7.1–7.5)
- [ ] Phase 8 cleanup
