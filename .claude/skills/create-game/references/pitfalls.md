# Pitfalls

Each of these has a real cause in this repo. Check the list before calling a game finished.

## The kiosk gets stuck

**The game has to end itself.** Pose games turn the cursor off during play, so the exit button can't be reached, there's no keyboard, and nothing in the app enforces a timeout (`IDLE_TIMEOUT_MS` and `SESSION_TIMEOUT_MS` have no consumers). If a player walks away mid-round and the game waits for input, the kiosk stays there until someone reloads it. End the round when nobody has been detected for a few seconds, or on a timer, and return to a state where the cursor is on. `gumballslice/` warns after 1 second and ends the round after 3 (`PLAYER_LOST_TIMEOUT_MS`).

**Every non-playing screen needs a way out** that works with the hand cursor, meaning `ExitButton` from `@/shared/components`.

## Cursor

**Turn it back on correctly.** `GamesView.handleExitGame` re-enables the cursor when a game exits. Don't re-enable it in an effect cleanup, since a comment there records that this can corrupt React's fiber list. `cursorVariant` is different: `drawit/components/DrawingCanvas.tsx` sets it in an effect and resets it in that effect's cleanup, so copy that.

**Re-enabling takes a moment.** The cursor closes its `HandLandmarker` when disabled and reloads it when enabled. Expect a short gap after a round before it appears.

**Don't start a second `useCvCursor`.** It shares a singleton landmarker with the overlay.

**`isPinched` may be stale while the cursor is disabled,** because it isn't reset in that branch. Don't read it unless the cursor is on.

## Camera and inference

**Mirroring.** The feed is shown with `-scale-x-100`, but landmarks are in raw coordinates, so a player's on-screen left is high raw x. If P1 controls P2, this is why. Use `assignPosesToZones`, and flip x explicitly when drawing landmarks over a mirrored feed.

**Inference rate isn't constant.** Don't assume 13 FPS in gesture thresholds. See "Writing gesture detection" in `computer-vision.md`.

**Bystanders.** People walk behind players at an installation. A gesture read from `landmarksRef` (the first pose) can belong to whoever MediaPipe listed first. With `numPoses` above 1, pick a player with `assignPosesToZones`.

**Partial bodies.** Someone too close to the camera has off-frame landmarks that MediaPipe still reports as guesses. If the game needs the full body, check `visibility` and prompt the player to step back.

**Camera cleanup.** `useGameCamera` stops its tracks on unmount, and `usePoseDetection` closes its landmarker. If you add your own detector, close it on unmount, including when it finishes loading after the unmount (see the `mounted` flag in `usePoseDetection`).

## Pixi

**`usePixiApp` clears the container's children on init,** so React children present at mount disappear. Put overlays beside the container, not inside it.

**Changing its options recreates the app,** so don't pass values that change during play.

**The canvas has `pointerEvents: none`.** Input goes to DOM elements above it, not to Pixi objects.

**Destroy is deferred to a macrotask.** Remove your ticker callback and destroy the engine in the effect cleanup, as in the example in `game-structure.md`, so nothing touches a destroyed app.

**Brand colors.** Pixi can't read CSS tokens. Mirror the hex and name the token in a comment.

## Registration and hub

**`gamesConfig.test.ts` hardcodes the ids,** and it mocks each component so that the test doesn't load Pixi or MediaPipe. Add both for a new game.

**A fourth hub tile probably overflows.** This comes from reading the classes, since it hasn't been rendered. Look at it at 1920×1080.

**`GamesHub` special-cases `drawit` and `gumballslice`** for their look. Other games get the default glass tile unless you add to that.

## Stale guidance

`useGameLoop` isn't the shared loop, whatever older branches or docs say, and FlapFlap's hand-copied camera and inference wiring predates `cv/`. When a doc and the code disagree, trust the code.
