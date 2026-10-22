# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start Vite dev server
npm run build     # tsc -b && vite build
npm run lint      # ESLint (errors fail CI; warnings don't)
npm run typecheck # tsc -b only, faster than a full build
npm run gen:types # regenerate src/core/supabase/database.types.ts from the remote schema
npm test                  # Vitest unit tests (single run)
npm run test:watch        # Vitest in watch mode
npm run test:coverage     # unit tests + v8 coverage report in coverage/
```

CI (`.github/workflows/ci.yml`) runs `npm run lint`, `npm run build` (TypeScript errors surface here) and `npm test`. Run `npm run typecheck` and `npm run lint` before finishing a change.

### Unit tests

Vitest + jsdom + React Testing Library, configured in `vitest.config.ts` (extends `vite.config.ts`, so path aliases work). Tests are colocated with the source as `*.test.ts(x)`; shared setup lives in `src/test/setup.ts`. Import `describe`/`it`/`expect`/`vi` explicitly from `vitest` (globals are off). Prefer testing pure logic and hooks; jsdom has no canvas, WebGL, camera or MediaPipe, so fake the narrow slice a unit needs (see `floodFill.test.ts`) rather than the whole API. Shared helpers live in `src/test/`: `supabaseMock.ts` (chainable query builder `queryResult`, `supabaseMock`, `fakeChannel`, `resetSupabaseMock`; wire it in with `vi.mock('<client path>', () => import('@/test/supabaseMockModule'))` since the real client throws without env vars), `pixiStub.ts` (Container/Graphics/Text stand-ins), and `console.ts` (`silenceConsole`). Additional docs: `docs/architecture.md`, `docs/CONFIG.md`, `.github/workflows/CI-CD.md`.

### Supabase

```bash
supabase functions deploy <function-name>   # deploy a single edge function
supabase db push                            # apply migrations to remote
```

The client is typed with the generated `Database` type (`src/core/supabase/database.types.ts`), so table and column names are checked by `tsc`. After a migration is applied, run `npm run gen:types` and commit the result with the migration. Don't hand-edit the generated file.

### Environment

Copy `.env.example` to `.env`. Vite only exposes `VITE_`-prefixed vars. Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Optional tuning: `VITE_SESSION_TIMEOUT_MS`, `VITE_GESTURE_COOLDOWN_MS`, `VITE_IDLE_TIMEOUT_MS`, `VITE_TARGET_FPS`, `VITE_ENABLE_LOGGER`, `VITE_ENABLE_PERFORMANCE_MONITOR`, `VITE_DEFAULT_ORG_ID`.

---

## Git Conventions

Full rules in `docs/GIT_CONVENTIONS.md`. Summary: branch from `dev` as `<type>/<kebab-name>` (e.g. `feature/hub-realtime`, `fix/hub-style`), commit as `<type>: <imperative summary>` (e.g. `fix: prevent accessory clipping`), and open PRs into `dev` titled the same way. Never commit directly to `main` or `dev`.

---

## Styling

The repo is styled with **Tailwind CSS v4** (via `@tailwindcss/vite`), migrated from CSS Modules. History and gotchas: `docs/TAILWIND_MIGRATION.md`.

- Design tokens (colors, fonts, spacing, keyframes) live in `@theme` in `src/styles/theme.css`, not in `src/shared/theme/*.ts`.
- Components use Tailwind utilities. Do not create `.module.css` files.
- Keep inline `style={{}}` only for runtime-computed values (prefer CSS vars). Pixi code is not part of the migration.
- Preflight is enabled; app-wide defaults live in `@layer base` in `src/styles/tailwind.css`. A keyframe must not animate a property that a utility also sets, and don't mix a utility and an inline `style` for the same property.

---

## Architecture

This is a React + Vite + TypeScript SPA backed by Supabase (PostgreSQL, Auth, Storage, Edge Functions). It has **two distinct rendering contexts**:

- **Kiosk (`/app`)** — full-screen installation on a physical screen, driven by a state machine and computer-vision hand tracking.
- **Mobile (`/user`, `/register`, `/claim/*`)** — lightweight pages opened on a phone via QR code for account creation and profile management.

### Path Aliases (vite.config.ts)

| Alias | Resolves to |
|---|---|
| `@/` | `src/` |
| `@/core` | `src/core/` |
| `@/features` | `src/features/` |
| `@/shared` | `src/shared/` |

### Routes (App.tsx)

| Path | Access | Component |
|---|---|---|
| `/user` | public | `UserLandingPage` |
| `/user/profile` | user | `UserProfileView` |
| `/user/gallery` | user | `UserGalleryPage` |
| `/user/game-scores` | user | `UserGameScoresPage` |
| `/user/customize` | user | `CustomizeAvatarView` |
| `/user/messages` | user | `MessagesView` |
| `/register` | public | `RegistrationPage` |
| `/login` | public | `AdminLoginPage` |
| `/select-org` | admin | `OrgSelectorPage` |
| `/app` | admin or kiosk | `AppContainer` (state machine) |
| `/claim/:tokenId` | public | `ClaimPage` |

### Provider Hierarchy (main.tsx → AppContainer.tsx)

```
BrowserRouter
  AuthProvider            ← Supabase auth state (mode: admin | kiosk | user | unauthenticated)
    App (React Router)
      ProtectedRoute
        CvCursorEnabledProvider
          SharedCameraProvider   ← single shared MediaStream for all CV consumers
            StateProvider        ← kiosk app state machine
              AppContainerContent → renders by AppState
              CvCursorOverlay    ← hand-cursor drawn on top
```

### Core Layer (`src/core/`)

- **`auth/`** — `AuthProvider` manages three mutually exclusive modes: `admin` (full access), `kiosk` (read-only, org-scoped via JWT `app_metadata`), `user` (mobile). Route guards: `ProtectedRoute`, `AdminOnlyRoute`, `UserProtectedRoute`. See `auth/KIOSK_AUTH.md` for the full kiosk session flow.
- **`state-machine/`** — Six kiosk states: `IDLE`, `AUTH`, `ONBOARDING`, `HUB`, `DISCOVERY`, `GAMES`. Transitions defined in `appStateMachine.ts`. `useAppState()` / `transitionTo()` drive navigation in the kiosk.
- **`cv/`** — `SharedCameraProvider` owns the camera `MediaStream`. `useCvCursor` (in `cv/cursor/`) runs MediaPipe `HandLandmarker`, maps index-finger tip to screen coords (EMA-smoothed), and detects thumb-curl clicks. `CvCursorOverlay` renders the visible cursor. Individual features pull `useSharedCamera()` to read the same stream without opening a second device.
- **`supabase/`** — Supabase client singleton plus typed service wrappers (adminAuth, kioskAuth, etc.).
- **`badges/`** — `badgeService.ts` for earning/fetching badges.
- **`monitoring/`** — `ErrorBoundary` component.

### Feature Layer (`src/features/`)

| Feature | Description |
|---|---|
| `discovery/` | Kiosk mode: gesture-based random profile reveal |
| `hub/` | Kiosk mode: browsable profile network rendered with PixiJS (`PixiHub.tsx`); `hubService.ts`, `croppedImageService.ts`, `hubRealtimeService.ts` |
| `games/` | Kiosk mode: mini-games (see Games section below) |
| `registration/` | Mobile: new user sign-up with QR-code entry; `faceCropService.ts` runs MediaPipe face detection to produce cropped avatar images |
| `profile-editor/` | Mobile: edit profile, retake photo, manage accessories; `accessoryService.ts`, `profileService.ts` |
| `user/` | Mobile: `UserProfileView`, `UserGalleryPage`, `UserGameScoresPage`, `CustomizeAvatarView` |
| `messages/` | Mobile: `MessagesView` inbox; messages are sent via claim token flow (`messagesService.ts`) |
| `admin/` | Admin login + org selector (leads to kiosk session mint) |
| `kiosk/` | `RegistrationQRDisplay` — QR code shown on idle screen |
| `claim/` | Token-based claim flow for linking a drawing or sending a message to a user account |

### Games (`src/features/games/`)

Games are registered in `config/gamesConfig.ts` via `GAMES_REGISTRY` — add new games there. Shared rendering pattern: a PixiJS `Application` managed by `usePixiApp`, a game-loop hook (`useGameLoop`), and a self-contained engine class under `<game>/game/`.

| Game | Input mechanic | Engine |
|---|---|---|
| `flapflap/` (1P) + `flapflap2p/` (2P) | Arm-flap pose detection (`useArmFlap`) via `usePoseDetection`; 2P assigns players per camera half (`assignPlayers.ts`, `SplitCameraPanel`) | `FlapFlapEngine.ts`, `FlapFlap2PEngine.ts` |
| `drawit/` | Pinch-to-paint on canvas; daily word prompt | `DrawingCanvas.tsx` |

The registry entry for FlapFlap is `components/FlapFlapLauncher`, a 1P/2P mode-select that renders either game.

Game input hooks read from `cursorStateRef` (the live ref from `useCvCursorEnabled`) inside the PixiJS RAF callback — this avoids React re-renders on every frame.

### Supabase Edge Functions (`supabase/functions/`)

- `mint-kiosk-session` — verifies admin auth, scopes kiosk JWT to an org, returns tokens
- `generate-registration-qr` / `verify-registration-token` — QR-code registration handshake
- `generate-claim-token` / `execute-claim` / `claim-drawing` / `claim-message` — drawing and message claim flows
- `delete-user-account` / `delete-user-images` — account deletion helpers

### Database (`supabase/migrations/`)

Sequential numbered migrations (001–024). Current schema includes: `users`, `admin`, `organization`, `image` (profile + gesture photos), `game_score`, `drawings`, claim tokens, `accessories`, `messages`. RLS policies scope kiosk reads by `auth.jwt() -> 'app_metadata' ->> 'org_id'`.

### CV Gesture System

`useCvCursor` detects two states used throughout the kiosk:
- **Hover** (pointing pose): index extended, other fingers curled → moves cursor
- **Click** (pinch): thumb-tip to index-tip normalized distance < `0.06` → fires click with 300 ms cooldown

Games access the raw `isPinched` field (no cooldown) for continuous paint/drag interactions.
