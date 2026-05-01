# me2you Architecture

This document reflects the current repository structure.

## Top-Level Shape

```text
me2you/
├── public/                    # static assets, models, screensaver, accessories, badges
├── supabase/                  # migrations, seed data, edge functions
├── src/
│   ├── core/                  # infrastructure shared by features
│   │   ├── auth/              # AuthContext/AuthProvider and route guards
│   │   ├── supabase/          # client, admin/user/kiosk auth, claim/gallery services
│   │   ├── state-machine/     # app states and state provider
│   │   ├── cv/                # camera + mediapipe config + cursor system
│   │   ├── badges/            # badgeService
│   │   └── monitoring/        # error boundaries
│   ├── features/              # domain features (see table below)
│   ├── shared/                # reusable UI, hooks, sound, theme, constants
│   ├── App.tsx                # router entry
│   └── AppContainer.tsx       # state-machine driven kiosk shell
├── docs/                      # project documentation
└── scripts/                   # development scripts
```

## Routing and App Flow

React Router handles top-level routes in `src/App.tsx`:

| Route | Component | Context |
|---|---|---|
| `/login` | `AdminLoginPage` | Admin |
| `/select-org` | `OrgSelectorPage` | Admin-only |
| `/user` | `UserLandingPage` | Mobile |
| `/user/profile` | `UserProfileView` | Mobile (auth required) |
| `/user/gallery` | `UserGalleryPage` | Mobile (auth required) |
| `/user/game-scores` | `UserGameScoresPage` | Mobile (auth required) |
| `/user/customize` | `CustomizeAvatarView` | Mobile (auth required) |
| `/user/messages` | `MessagesView` | Mobile (auth required) |
| `/register` | `RegistrationPage` | Mobile |
| `/claim/:tokenId` | `ClaimPage` | Mobile |
| `/claim/success` | `ClaimSuccessPage` | Mobile |
| `/claim/error` | `ClaimErrorPage` | Mobile |
| `/app` | `AppContainer` | Kiosk (admin or kiosk auth) |
| `/` | redirect → `/user` | — |

Inside `/app`, `src/AppContainer.tsx` switches views by app state from `src/core/state-machine`.

## Authentication

- Auth state is managed with React Context in `src/core/auth/AuthProvider.tsx`.
- Three mutually exclusive modes: `admin` (full access), `kiosk` (read-only, org-scoped via JWT `app_metadata`), `user` (mobile).
- Route guards: `ProtectedRoute`, `AdminOnlyRoute`, `UserProtectedRoute`.
- Supabase auth/database services are in `src/core/supabase/`: `adminAuth.ts`, `kioskAuth.ts`, `userRegistrationAuth.ts`, `claimService.ts`, `drawingsGallery.ts`, `kioskQrService.ts`, `storage.ts`.
- See `auth/KIOSK_AUTH.md` for the full kiosk session flow.

## State Machine

Six kiosk states in `src/core/state-machine/appStateMachine.ts`:

```
IDLE → DISCOVERY | HUB | GAMES | AUTH
AUTH → ONBOARDING (new user) | HUB (existing user)
ONBOARDING → HUB
```

- `useAppState()` / `transitionTo()` drive navigation in the kiosk.
- `stateContext.tsx` exposes the context; current implementation is `useState`-based.

## Computer Vision

- `SharedCameraProvider.tsx` owns the single camera `MediaStream`.
- `cameraManager.ts` handles device enumeration and stream lifecycle.
- `face-detector-config.ts` / `mediapipe-config.ts` / `mediapipe-loader.ts` configure and load MediaPipe models.
- CV cursor logic lives in `src/core/cv/cursor/`:
  - `useCvCursor` runs `HandLandmarker`, maps index-finger tip to screen coords (EMA-smoothed), detects pinch clicks (thumb-to-index distance < `0.06`, 300 ms cooldown).
  - `CvCursorOverlay` renders the visible cursor.
- Individual features pull `useSharedCamera()` to read the same stream without opening a second device.

## Avatar Rendering (Hub + User)

- Pixi is the single rendering path for all mii surfaces.
  - Hub animated scene: `src/features/hub/components/PixiHub.tsx`
  - User static previews: `src/features/user/components/UserMiiPixiPreview.tsx`
- Shared avatar/accessory placement math lives in `src/shared/utils/accessoryLayout.ts`.
  - `HUB_ACCESSORY_TUNING` drives baseline hat/sunglasses/balloon placement.
  - `getAccessoryPlacement` and `getBalloonCenterFromHandAnchor` are reused by both renderers.
  - `convertPreviewDeltaToHubPixels` applies accessory-table relative deltas consistently.
- Shared avatar part scales/offsets (`MII_BODY_SCALE`, `MII_FACE_SCALE`, `MII_HEAD_OFFSET_X`, `MII_HEAD_OFFSET_Y`) keep body/face proportions aligned between animated hub and static user previews.
- User pages (`UserProfileView`, `CustomizeAvatarView`, `UserProfileEditForm`) render through Pixi with the same placement logic as hub — no CSS accessory overlays.

### Accessory Settings and Fallbacks

- Accessory placement state stored in `public.accessories`: `selected_accessory`, `relative_x`, `relative_y`, `scale`.
- User preview inputs include the latest cropped-image landmark payload from `profileService.getCurrentProfile()` (`centroid_point`, `left_eye_point`, `right_eye_point`, `forehead_top_point`).
- If landmark data is missing, user Pixi previews render a graceful fallback and defer accessory rendering until landmarks are available.

## Feature Layer (`src/features/`)

| Feature | Description |
|---|---|
| `discovery/` | Kiosk: gesture-based random profile reveal |
| `hub/` | Kiosk: browsable profile network (`hubService.ts`, `croppedImageService.ts`, `hubRealtimeService.ts`) |
| `games/` | Kiosk: mini-games — `drawit/` (freehand drawing via pinch), `flapflap/` (flap game) |
| `registration/` | Mobile: new user sign-up with QR-code entry; includes face crop step |
| `profile-editor/` | Mobile: `ProfileCreator`, multi-step form hooks, `accessoryService.ts`, `profileService.ts` |
| `user/` | Mobile: `UserProfileView`, `UserGalleryPage`, `UserGameScoresPage`, `CustomizeAvatarView`, `UserMiiPixiPreview` |
| `messages/` | Mobile: `MessagesView`, `MessageComposePage`, `messagesService.ts` |
| `claim/` | Token-based claim flow — `ClaimPage`, `ClaimScanner`, `ClaimQR`, success/error pages |
| `admin/` | Admin login + org selector (leads to kiosk session mint) |
| `kiosk/` | `RegistrationQRDisplay`, `PinnedRegistrationQR`, `RegistrationQRContext` |
| `system/` | Cross-cutting hooks: `useIdleTimeout`, `useOverlayDismiss`, `usePresence` |

## Shared Layer (`src/shared/`)

| Subdirectory | Contents |
|---|---|
| `components/` | `Button`, `Modal`, `LoadingSpinner`, `GlassCard`, `BadgeDisplay`, `ConfirmDialog`, `ExitButton`, and others |
| `hooks/` | `useDebounce`, `useInterval`, `useKeyboardShortcut`, `useSessionStorage` |
| `sound/` | `playClaimSound.ts` |
| `theme/` | `colors.ts`, `spacing.ts`, `typography.ts` |
| `utils/` | `accessoryLayout.ts`, `constants.ts`, `gestureConstants.ts` |

## Supabase Edge Functions (`supabase/functions/`)

- `mint-kiosk-session` — verifies admin auth, scopes kiosk JWT to an org
- `generate-registration-qr` / `verify-registration-token` — QR-code registration handshake
- `generate-claim-token` / `execute-claim` / `claim-drawing` / `claim-message` — drawing/message claim flow
- `delete-user-account` / `delete-user-images` — account deletion helpers

## Database (`supabase/migrations/`)

24 sequential migrations. Current schema includes: `users`, `admin`, `organization`, `image` (profile + gesture photos, with landmark columns), `game_score`, `drawings`, `accessories`, `messages`, and claim tokens. RLS policies scope kiosk reads by `auth.jwt() -> 'app_metadata' ->> 'org_id'`.

## Public Assets (`public/`)

```text
public/
├── accessories/      # hat.svg, sunglasses.svg, balloon.svg
├── animations/       # mii walk-cycle frames (default, leftstep, rightstep, …)
├── badges/           # badge artwork PNGs
├── models/           # MediaPipe WASM/tflite models (downloaded via scripts/download-models.ts)
└── screensaver/      # screensaver content
```
