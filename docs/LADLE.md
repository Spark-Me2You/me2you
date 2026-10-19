# Component stories (Ladle)

Every screen and component can be opened directly in [Ladle](https://ladle.dev), with no login, no Supabase project, no camera and no clicking through flows. The backend, MediaPipe and the camera are replaced with in-memory fakes, so stories render the real components and hooks against seeded data.

```bash
npm run ladle          # dev server at http://localhost:61000
npm run ladle:build    # static build into build/
npm run test:stories   # Playwright smoke test of every story (needs ladle:build first)
```

New to this? Start with the walkthrough in `docs/LADLE_WORKFLOW.md`; this page is the reference.

The first time you run the smoke test, install Chromium with `npx playwright install chromium`. On Linux, `npx playwright install --with-deps chromium` also installs the system libraries it needs.

## Layout

```
.ladle/
  config.mjs            stories glob + Vite config path
  vite.config.ts        app Vite config + module swaps for the mocks
  components.tsx        global provider → StoryEnvironment
  tailwind.css          Tailwind entry with @source pointed at src/
src/stories/
  shared/ mobile/ kiosk/          *.stories.tsx
  _support/
    StoryEnvironment.tsx          per-story reset, router, AuthProvider, <Scenario>
    KioskProviders.tsx            camera / cursor / state machine / QR providers
    mocks/                        Supabase client, edge functions, MediaPipe, face crop
    fixtures/                     seed data, auth presets, typed prop samples, placeholder images
    sim/                          simulated hand / gesture / pose input + fake camera
tests/stories/stories.spec.ts     smoke test
```

## Writing a story

```tsx
import type { Story, StoryDefault } from '@ladle/react';
import App from '@/App';

export default { title: 'Mobile / User Pages', meta: { auth: 'user' } } satisfies StoryDefault;

export const Profile: Story = () => <App />;
Profile.meta = { route: '/user/profile' };
```

You can render a whole route through `<App />` (real router and guards), a kiosk view inside `<KioskProviders state={AppState.HUB}>`, or a presentational component with props from `fixtures/samples.ts`. Use `action('name')` from `@ladle/react` for callbacks.

### `meta` options

Ladle reads `meta` statically, so it must be a plain literal: no function calls or imported constants. Meta set on the default export applies to every story in the file, and a story's own `meta` overrides it.

| Key | Default | Effect |
|---|---|---|
| `auth` | `'unauthenticated'` | Who is signed in: `user` (Sam Rivera, onboarded), `user-new` (no photos/scores), `user-no-profile` (auth account, no user row), `admin`, `kiosk` (org `org-demo`). |
| `route` | `'/'` | Initial router location; may include a query string. |
| `routeState` | | `location.state` for the initial route. |
| `seed` | `'default'` | `'empty'` starts with no rows at all. |
| `delay` | `0` | Milliseconds added to every backend call, or `'forever'` to hold loading states. |
| `fail` | `[]` | Make calls fail: table names (`'user'`), `'fn:<edge function>'`, `'storage'`, `'auth'`. |
| `cv` | `false` | Drive the CV cursor, gestures and pose from mouse + keyboard (below). |
| `camera` | `'ok'` | `'denied'` or `'missing'` makes `getUserMedia` reject. |
| `gesture` | none | Hand gesture held from the start: `'Victory'`, `'Open_Palm'`, `'Thumb_Up'`. |
| `players` | `1` | `2` puts two people in front of the camera (2P FlapFlap). |
| `face` | `true` | `false` makes the simulated face crop find no face. |
| `allowConsoleErrors` | `false` | The story logs errors on purpose (error states); the smoke test tolerates them. |
| `skipSmoke` | `false` | Leave the story out of the smoke test. |

### One-off data: `<Scenario>`

For data that can't be expressed in `meta`, wrap the story. The tweak runs against a fresh copy of the seeded tables before children render:

```tsx
export const ProfileNoPhotos: Story = () => (
  <Scenario tables={(t) => { t.gesture_image = t.gesture_image.filter((r) => r.owner_id !== ME_ID); }}>
    <App />
  </Scenario>
);
```

`functions` overrides edge-function handlers the same way.

## Simulated input (`meta.cv`)

| Input | Simulates |
|---|---|
| Mouse move | Pointing hand → CV cursor position |
| Mouse button held | Pinch (click / paint) |
| `H` | Toggle hand in frame |
| `1` / `2` / `3` (hold) | Peace sign / open palm (wave) / thumbs up |
| `F` / `J` | Arm flap for the left / right player |
| `P` | Toggle the second player |

Native clicks are blocked in `cv` stories, so the hand cursor is the only way to click, as on the kiosk. The same controls are exposed as `window.__sim` for scripting.

The fake camera is a canvas stream that draws a figure for each simulated player. Real MediaPipe is never loaded. The fake tasks read the simulated state and return matching landmarks, so `useCvCursor`, `useGestureRecognition`, `usePoseDetection` and `useArmFlap` run unchanged.

## How the mocks attach

`.ladle/vite.config.ts` swaps these modules at resolve time. App code is untouched, apart from an optional `initialState` prop on `StateProvider` / `AppContainer`.

| Real module | Mock |
|---|---|
| `src/core/supabase/client.ts` | `mocks/supabaseClient.ts` (in-memory tables, auth, storage, realtime, `functions.invoke`) |
| `src/core/cv/mediapipe-loader.ts`, `src/core/cv/cursor/handLandmarkerLoader.ts` | `mocks/mediapipe.ts` |
| `src/features/registration/services/faceCropService.ts` | `mocks/faceCropService.ts` |

Edge functions are emulated in `mocks/edgeFunctions.ts`, including the side effects of DB triggers such as the game-score claim. When a new service touches a table or relation the mock doesn't know, add the seed rows to `fixtures/data.ts` and any foreign-key alias to `RELATION_FKS` in `mocks/queryBuilder.ts`.

## Smoke test

`tests/stories/stories.spec.ts` reads `build/meta.json` and opens each story in preview mode. A story fails if it throws, logs `console.error` (unless `allowConsoleErrors`), or shows the ErrorBoundary fallback. CI runs it in the `stories` job.
