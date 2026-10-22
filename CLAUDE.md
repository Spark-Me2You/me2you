# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start Vite dev server
npm run build     # tsc -b && vite build
npm run lint      # ESLint
```

No test suite exists. TypeScript errors surface via `npm run build` (this is also what CI runs, `.github/workflows/ci.yml`). Additional docs: `docs/architecture.md`, `docs/CONFIG.md`, `.github/workflows/CI-CD.md`.

### Supabase

```bash
supabase functions deploy <function-name>   # deploy a single edge function
supabase db push                            # apply migrations to remote
```

### Environment

Copy `.env.example` to `.env`. Vite only exposes `VITE_`-prefixed vars. Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Optional tuning: `VITE_SESSION_TIMEOUT_MS`, `VITE_GESTURE_COOLDOWN_MS`, `VITE_IDLE_TIMEOUT_MS`, `VITE_TARGET_FPS`, `VITE_ENABLE_LOGGER`, `VITE_ENABLE_PERFORMANCE_MONITOR`, `VITE_DEFAULT_ORG_ID`.

---

## Git Conventions

Full rules in `docs/GIT_CONVENTIONS.md`. Summary: branch from `dev` as `<type>/<kebab-name>` (e.g. `feature/hub-realtime`, `fix/hub-style`), commit as `<type>: <imperative summary>` (e.g. `fix: prevent accessory clipping`), and open PRs into `dev` titled the same way. Never commit directly to `main` or `dev`.

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
- `claim-candy-reward` — Gumball Slice wins: issues a candy voucher (1 per user per day) via `issue_candy_voucher()`
- `delete-user-account` / `delete-user-images` — account deletion helpers

### Database (`supabase/migrations/`)

Sequential numbered migrations (001–025). Current schema includes: `users`, `admin`, `organization`, `image` (profile + gesture photos), `game_score`, `drawings`, claim tokens, `accessories`, `messages`, `candy_voucher` + `reward_config`. RLS policies scope kiosk reads by `auth.jwt() -> 'app_metadata' ->> 'org_id'`.

### CV Gesture System

`useCvCursor` detects two states used throughout the kiosk:
- **Hover** (pointing pose): index extended, other fingers curled → moves cursor
- **Click** (pinch): thumb-tip to index-tip normalized distance < `0.06` → fires click with 300 ms cooldown

Games access the raw `isPinched` field (no cooldown) for continuous paint/drag interactions.
