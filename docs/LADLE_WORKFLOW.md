# Using Ladle: a walkthrough

This guide covers how to use Ladle day to day: what happens when you open a story, how to check a change, how to add a story, and how the smoke test fits in. For the full list of options, see `docs/LADLE.md`.

## The idea in one paragraph

A **story** is a small function that renders one component or page in one particular state, for example "profile page, signed in, photos missing" or "FlapFlap with two players". Ladle lists every story in a sidebar so you can open any screen directly. Supabase, MediaPipe and the camera are replaced with fakes, so you never log in, never need a real backend or webcam, and never click through earlier screens to reach the one you want. The components themselves are the real ones from `src/`, so a story shows exactly what the app would show.

## What happens when you open a story

```
You click "Mobile / User Pages → Profile No Photos" in the sidebar
        │
        ▼
.ladle/components.tsx   (global provider, wraps every story)
        │  reads the story's `meta`
        ▼
StoryEnvironment        (src/stories/_support/StoryEnvironment.tsx)
        │  1. reset the fake database to the seed data (or empty)
        │  2. sign in as the `auth` preset (user, admin, kiosk, ...)
        │  3. apply `delay` / `fail` settings to backend calls
        │  4. reset the simulated hand/gesture/players and install a fake camera
        │  5. wrap in a MemoryRouter at `route`, plus the real AuthProvider
        ▼
<Scenario>              (optional, inside the story) one-off data edits
        ▼
<KioskProviders>        (kiosk stories only) camera, CV cursor, state machine
        ▼
The real component      calls the real services → these hit the fake Supabase
```

Switching to another story throws all of that away and starts fresh, so stories can't affect each other.

Behind the scenes, `.ladle/vite.config.ts` swaps three modules when Ladle builds:

- `src/core/supabase/client.ts` → an in-memory Supabase client.
- The MediaPipe loaders → fake hand, gesture and pose trackers that read the simulated input.
- `faceCropService` → a fake face crop.

App code doesn't know it's being mocked.

## 1. Run it

```bash
npm run ladle
```

Open http://localhost:61000.

- **Sidebar**: stories grouped by title, such as `Shared / Button`, `Mobile / Registration` and `Kiosk / Discovery`. The groups come from the files in `src/stories/shared`, `src/stories/mobile` and `src/stories/kiosk`.
- **Toolbar** (top right):
  - The **action log** shows callbacks fired by the story (for example `onExit`, `submit`). It's how you confirm a button did something when there's no real handler.
  - The **width** control previews mobile pages at phone sizes.
  - **Fullscreen**, theme, and **story source**.
- **URL**: each story has its own link, for example `http://localhost:61000/?story=mobile--user-pages--profile-no-photos`. Bookmark it or share it.

Edits to components or stories hot-reload, just like `npm run dev`.

## 2. Look at a screen in a specific state

Find the screen in the sidebar. Most screens have a story for each interesting state:

| You want to see | Look for a story like |
|---|---|
| The normal page | `Profile`, `Hub`, `Menu` |
| Loading spinners | `...Loading`, `Validating`, `OrgSelectorLoading` (backend calls never return) |
| Empty state | `HubEmpty`, `GalleryEmpty`, `LeaderboardEmpty` |
| Error state | `...Error`, `...Failed`, `TokenExpired`, `QrError` |
| One step of a multi-step flow | `StepProfile`, `StepPhoto` in `Mobile / Registration` |
| A whole flow you can click through | `FullFlow` (registration), `Game` (DrawIt), `View` (games) |

If the state you need has no story, add one (section 5). It's usually a two-line change.

## 3. Interact with kiosk stories (no camera needed)

Kiosk stories (`Kiosk / ...`) use hand tracking, which a fake camera and a simulated hand stand in for. Click into the preview first so it has keyboard focus.

| Do this | Simulates |
|---|---|
| Move the mouse | Pointing hand, which moves the on-screen CV cursor |
| Hold the mouse button | Pinch: clicks buttons, paints in DrawIt |
| `H` | Hand leaves or enters the frame |
| Hold `1` / `2` / `3` | Peace sign / open palm (wave) / thumbs up, for Discovery |
| `F` / `J` | Flap arms for the left / right player, for FlapFlap |
| `P` | Second player steps in or out |

Normal mouse clicks are blocked inside kiosk stories, because the real kiosk has no mouse. Point and "pinch" instead. The block covers only the story area, so the Ladle sidebar and toolbar work as usual. Kiosk views fill the story area beside the sidebar; use the **Fullscreen** toolbar button to see one at full kiosk size.

Some examples:

- **Discovery**: open `Kiosk / Discovery → Waiting` and hold `1`. A person with a peace-sign photo appears, and the border fills while you keep holding.
- **FlapFlap**: open `Kiosk / Games → FlapFlap Solo` and tap `F` to fly. For 2P, use `FlapFlap Two Player` and tap `F` and `J`.
- **DrawIt**: open `Kiosk / DrawIt → Canvas` and hold the mouse button to draw.

## 4. Typical loop when you change a component

1. Run `npm run ladle` and open the stories for the component you're changing. To find them, search `src/stories/` for the component's name.
2. Make your change and watch it hot-reload. Check the other states too (loading, error, empty), and phone width for mobile pages.
3. If you added a new state or prop that isn't covered, add a story for it (section 5).
4. Before pushing, run the smoke test (section 6). CI runs it too.

## 5. Add a story

Stories live in `src/stories/<shared|mobile|kiosk>/<Area>.stories.tsx`. Add yours to the existing file for that area, or create a new file if it's a new area. Each **named export** is one story; the export's name becomes its sidebar label.

### a) A plain component (props only)

```tsx
// src/stories/shared/Button.stories.tsx
import { action, type Story, type StoryDefault } from '@ladle/react';
import { Button } from '@/shared/components';

export default { title: 'Shared / Button' } satisfies StoryDefault;

export const Disabled: Story = () => (
  <Button onClick={action('click')} disabled>Save</Button>
);
```

`action('click')` logs to the action log, so you can confirm clicks without a real handler. For props that need realistic data (users, leaderboards, claim payloads), use the helpers in `src/stories/_support/fixtures/samples.ts`, such as `sampleUser('user-ava')` or `sampleLeaderboard`.

### b) A mobile page (uses routing, auth and the backend)

Render the whole app and point it at a route, so the real router, route guards and services all run:

```tsx
import type { Story, StoryDefault } from '@ladle/react';
import App from '@/App';

export default { title: 'Mobile / User Pages', meta: { auth: 'user' } } satisfies StoryDefault;

export const Messages: Story = () => <App />;
Messages.meta = { route: '/user/messages' };

export const MessagesLoading: Story = () => <App />;
MessagesLoading.meta = { route: '/user/messages', delay: 'forever' };

export const MessagesFailed: Story = () => <App />;
MessagesFailed.meta = { route: '/user/messages', fail: ['messages'], allowConsoleErrors: true };
```

`meta` on the default export applies to every story in the file; a story's own `meta` overrides it. Common keys:

- **`auth`** picks who is signed in:
  - `'user'`: Sam Rivera, with a full profile.
  - `'user-new'`: a profile with no photos or scores.
  - `'user-no-profile'`: an auth account with no profile row.
  - `'admin'`.
  - `'kiosk'`.
  - The default is signed out.
- **`route`** sets the starting URL; it can include `?query`.
- **`seed: 'empty'`** starts with no data at all.
- **`delay`** holds loading states: a number of ms, or `'forever'`.
- **`fail`** makes calls fail: a table name, `'fn:<edge-function>'`, `'storage'` or `'auth'`.

`meta` must be a plain literal. Ladle reads it without running your code, so function calls and imported constants aren't allowed there and the build will fail on them.

### c) A kiosk view or component

Wrap it in `KioskProviders` with the kiosk state it normally lives in, and turn on simulated input with `cv: true`:

```tsx
import { action, type Story, type StoryDefault } from '@ladle/react';
import { AppState } from '@/core/state-machine';
import { DiscoveryView } from '@/features/discovery/components/DiscoveryView';
import { KioskProviders } from '../_support/KioskProviders';

export default { title: 'Kiosk / Discovery', meta: { auth: 'kiosk', cv: true } } satisfies StoryDefault;

export const HoldingPeaceSign: Story = () => (
  <KioskProviders state={AppState.DISCOVERY}>
    <DiscoveryView />
  </KioskProviders>
);
HoldingPeaceSign.meta = { gesture: 'Victory' };
```

Kiosk-only `meta` keys:

- `gesture`: a gesture held from the start.
- `players: 2`: two people in front of the camera.
- `camera: 'denied' | 'missing'`: the camera fails to open.

### d) Data the seed doesn't have

The seed data (`src/stories/_support/fixtures/data.ts`) is a demo org of about 12 people with photos, accessories, scores, drawings and messages. The signed-in user is Sam Rivera (`ME_ID`). To change it for one story, wrap the story in `<Scenario>`:

```tsx
import { Scenario } from '../_support/StoryEnvironment';
import { ME_ID } from '../_support/fixtures/data';

export const ProfileNoPhotos: Story = () => (
  <Scenario tables={(t) => { t.gesture_image = t.gesture_image.filter((r) => r.owner_id !== ME_ID); }}>
    <App />
  </Scenario>
);
ProfileNoPhotos.meta = { route: '/user/profile' };
```

`tables` receives a fresh copy of every table, which you can edit freely. `functions` replaces edge-function handlers for that story.

If a new service queries a table the mock has never seen, add seed rows for it in `fixtures/data.ts`. If it uses a join the mock can't resolve, add it to `RELATION_FKS` in `mocks/queryBuilder.ts`.

### e) Check it

Your story shows up in the sidebar as soon as you save. Open it and confirm it renders what you expect. Then run the smoke test.

## 6. The smoke test

The smoke test opens **every** story in a headless Chromium and fails if the story:

- throws an error,
- logs `console.error`, or
- shows the ErrorBoundary's "Something went wrong." screen.

It checks that nothing is broken, not what the page looks like.

```bash
npm run ladle:build     # build the stories into build/; rerun after any change
npm run test:stories    # serve build/ and open every story
```

The first time, install the browser with `npx playwright install chromium`. On Linux, use `npx playwright install --with-deps chromium`, which also installs the system libraries it needs.

Each test is named after its story ID, so you can run a subset:

```bash
npm run test:stories -- -g "mobile--registration"       # one file's stories
npm run test:stories -- -g "kiosk--games--hub$"         # one story
```

The story ID is the title plus the export name, lowercased and joined with `--`. For example, `Kiosk / Games` + `FlapFlapSolo` gives `kiosk--games--flap-flap-solo`.

**When a story fails**, the output shows the error. A trace is saved to `test-results/`; open it with `npx playwright show-trace test-results/<folder>/trace.zip` to see a screenshot and the console. On CI, download the `playwright-report` artifact from the failed run.

**If the error is intentional**, for example an error-state story whose component logs an error, add `allowConsoleErrors: true` to the story's `meta`. If the story renders the ErrorBoundary on purpose, use `skipSmoke: true`.

**CI**: the `stories` job in `.github/workflows/ci.yml` runs `ladle:build` and then `test:stories` on every PR into `dev` or `main`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Build error "meta ... must be serializable" | A function call or imported value in `meta`. Inline the literal, or move the data into `<Scenario>` or the story body. |
| Page renders without styling | The Tailwind class is built from a string at runtime. Use full class names so Tailwind can find them in `src/`. |
| Kiosk buttons don't respond to clicks | Expected: native clicks are blocked. Hold the mouse button to pinch. |
| Keyboard controls do nothing | The preview doesn't have focus. Click inside it first. |
| Data missing, or `[mock supabase] Unknown relation` in the console | The mock has no rows or no join mapping for that table. See 5d. |
| Smoke test times out on kiosk stories | Kiosk stories render WebGL without a GPU and are heavy. The config runs 2 workers with a 60s timeout. On a slow machine, close other apps or pass `--workers=1`. |
| `test:stories` shows old results | You didn't rerun `npm run ladle:build`; the test serves the built copy. |
