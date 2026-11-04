---
name: create-game
description: Create, register, run and verify a kiosk game in src/features/games, including its computer vision input (pose, hands, CV cursor, multiplayer zones). Use when asked to add, build, prototype or change a game or mini-game, wire a gesture or camera input into a game, or when asking how games are set up or how to run one, even if the request doesn't say "skill".
---

# Create a game

Kiosk games are played standing up, from across a room, with no keyboard, and with strangers walking in and out of frame. Most of what goes wrong comes from those conditions, not from game logic. This skill covers the decisions, the build and how to check it.

Read a reference when you reach the step that needs it:

| Reference | Read it when |
|---|---|
| `references/computer-vision.md` | Wiring any camera or gesture input |
| `references/game-structure.md` | Building the engine, the React component, or score saving |
| `references/pitfalls.md` | Before calling the game finished, or when something behaves oddly |

## 1. Settle the design

Ask about whatever the request leaves open. If nobody can answer (an agent run), use the defaults and state them in the PR.

1. **Input:** body pose, CV cursor (one pointing hand and pinch), raw hand tracking (one hand in any pose, fast), or two free hands? Default to the closest fit for the mechanic. This decides the most, so see the table in step 2.
2. **Players:** how many, and do they share the camera? Default 1. Each extra player needs room in the frame, and a kiosk camera only fits so many.
3. **How does a round end without anyone touching it?** A player who walks away can't press exit, and pose games turn the cursor off during play anyway. Default: end the round after a few seconds with nobody detected, or on a timer. `gumballslice/` does both.
4. **Score:** none, shown only, or saved to a profile by QR claim? Default: shown only. Saved scores need more work and don't yet appear on the profile page (see `references/game-structure.md`).

Push back if the mechanic needs precision the camera can't deliver. Pose runs at about 13 FPS with visible latency, so frame-perfect timing or fine finger control will feel broken.

## 2. Pick the input path

| Mechanic | Use | Reference game |
|---|---|---|
| Body moves, poses, arm gestures | `src/features/games/cv/` with `usePoseDetection` | `flapflap/` (written before `cv/` existed) |
| Several players on one camera | The same, plus `assignPosesToZones` | `flapflap2p/` |
| Point and pinch, drawing, dragging | `cursorStateRef` from `useCvCursorEnabled`. No camera or detector of your own | `drawit/` |
| One fast hand in any pose, such as slashing | `handTrackRef` from `useCvCursorEnabled`. No camera or detector of your own | `gumballslice/` |
| Two free hands | No shared detector yet. See `references/computer-vision.md` | none on `dev` yet |

New pose games use `cv/`. FlapFlap still has a hand-copied version of this wiring and is waiting to migrate, so don't copy its camera or inference code when you use it as a reference.

## 3. Build it

1. Branch from `dev` as `feature/<game-name>` (`docs/GIT_CONVENTIONS.md`).
2. Create `src/features/games/<game>/`, with `components/`, `config/`, `game/` (the engine), and `hooks/` or `utils/` as needed. Keep tuning numbers in `config/` and gesture logic in pure functions, because those are what you can unit test.
3. Build the engine and component from `references/game-structure.md`, and the input from `references/computer-vision.md`.
4. Add a keyboard fallback for every gesture. It's how you test the game without standing in front of a camera.
5. Read `docs/BRAND_BOOK.md`, §10 first, before styling DOM UI. Purple (`action-games`) is the games hue. Pixi can't read CSS tokens, so mirror the hex and name the token in a comment (§9).

## 4. Register it

1. Add an entry to `GAMES_REGISTRY` in `config/gamesConfig.ts`: `{ id, name, description, component }`. The component receives `GameProps` (`onExit`).
2. Update `config/gamesConfig.test.ts`. It hardcodes the list of ids and mocks each game component, so it fails until you add yours.
3. Check the hub. The grid fits three tiles in a row at 1920×1080, and each tile has a `min-h-[60vh]` inside a clipped `h-screen`, so a fourth tile probably wraps off the screen. Fix the layout in your PR if your game is the one that overflows. Tile styling is special-cased by game id in `GamesHub`, and any other game gets the default glass tile.
4. A new mode of an existing game goes in that game's launcher (see `components/FlapFlapLauncher`), not in the registry.

## 5. Run it

```bash
npm run dev
```

There is no deep link to a game. The route is `/login` (admin account), `/select-org`, `/app`, tap through the idle screen, the Games tile, then your tile. Refreshing puts you back on the idle screen.

Check which block is active in `.env` first. Local dev can point at the main database, and claiming a test score writes a real row. Don't print `.env` values.

## 6. Verify it

Run `npm run typecheck`, `npm run lint` and `npm test`. jsdom has no canvas, camera or MediaPipe, so test the pure logic: gesture detection from fixture landmarks, zone rules, scoring and engine state, using the fakes in `src/test/`.

Passing tests don't show that a gesture works. Before reporting it as done, go through this on a camera, ideally on the kiosk:

- [ ] The game loads and starts from the hub using only the hand cursor
- [ ] The gesture fires reliably, from the real playing distance, and doesn't fire when standing still
- [ ] Walking out of frame clears the player and ends the round without anyone touching anything
- [ ] Each player controls their own side of the screen (mirroring is correct)
- [ ] A bystander behind the player doesn't take over
- [ ] The cursor returns after the round, and exit works from every screen
- [ ] Playing several rounds doesn't slow down or leak the camera (the camera light goes off after exit)

If you can't get to a camera, say so plainly and list these as a `### Manual verification` section in the PR rather than implying they passed. Put screenshots at 1920×1080 in the PR.
