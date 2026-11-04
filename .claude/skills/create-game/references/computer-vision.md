# Computer vision in games

## Contents

- How the pieces fit
- Pose games
- Multiplayer zones
- Cursor games
- Raw hand tracking
- Two-hand games
- Writing gesture detection
- Current limits

## How the pieces fit

Inference is too slow to run inside the render loop, so it runs on its own timer and leaves results in refs. The Pixi ticker reads those refs every frame. React state isn't involved, because re-rendering at frame rate would stall the game.

```
useGameCamera ── <video> ──► useInferenceLoop ──► detector refs ──► Pixi ticker ──► engine
```

Everything lives in `src/features/games/cv/`:

| Export | Job |
|---|---|
| `useGameCamera({ width?, height? })` | Opens the game's camera. Returns `{ videoRef, attachVideo, isLoading, error }` |
| `useInferenceLoop({ videoRef, detect, enabled?, intervalMs? })` | Calls `detect(video, timestamp)` on a timer, once the video has frames |
| `usePoseDetection({ numPoses? })` | Pose detector. Returns `{ landmarksRef, allLandmarksRef, frameSequenceRef, isInitialized, error, processFrame }` |
| `assignPosesToZones(poses, zoneCount)` | Sorts poses into per-player strips of the frame |
| `getZoneForX(x, zoneCount)` | The zone for one raw landmark x |

Always get the camera through `useGameCamera`, not `useCamera` or `getUserMedia`. Whether games should read the shared 1280×720 stream instead of opening their own hasn't been decided (it needs comparing on the kiosk), and this hook is the single place that decision will change.

## Pose games

```tsx
const { setEnabled: setCvCursorEnabled, cursorVisibleRef } = useCvCursorEnabled();
const { videoRef, attachVideo, isLoading, error } = useGameCamera();
const pose = usePoseDetection({ numPoses: 1 });

useInferenceLoop({
  videoRef,
  detect: pose.processFrame,
  enabled: pose.isInitialized,
});
```

Show the feed, mirrored, so players see themselves the way they expect. `isLoading` and `error` both need a visible state, because a kiosk with no camera shouldn't look frozen. `pose.error` covers the model failing to load.

```tsx
<video
  ref={attachVideo}
  autoPlay
  playsInline
  muted
  className="h-full w-full -scale-x-100 object-cover"
/>
```

In the ticker, process each inference once. `frameSequenceRef` goes up after every inference, including ones that found nobody, so an unchanged value means there is nothing new:

```ts
let lastSequence = -1;

const tick = () => {
  // ...fixed-step engine update first (see game-structure.md)

  const sequence = pose.frameSequenceRef.current;
  if (sequence === lastSequence) return;
  lastSequence = sequence;

  const landmarks = pose.landmarksRef.current;
  engine.setPlayerPresent(landmarks !== null);

  // The pointing pose that moves the cursor looks like an arm gesture.
  if (cursorVisibleRef.current || !landmarks) return;
  detectGesture(landmarks);
};
```

Turn the cursor off during active play with `setCvCursorEnabled(state !== "PLAYING")` from the state callback. It runs a second hand model, and it would be picking up players' arms. Turning it off means the player can't reach any on-screen button, which is why the round has to end by itself. See `pitfalls.md`.

## Multiplayer zones

```ts
const pose = usePoseDetection({ numPoses: PLAYER_COUNT });

const [p1, p2] = assignPosesToZones(pose.allLandmarksRef.current, PLAYER_COUNT);
```

- Zones are equal-width strips numbered from the left of the mirrored screen, so index 0 is the player on the left. The raw landmark x runs the other way, and `assignPosesToZones` already accounts for that. Don't flip x yourself.
- In a crowded zone the widest shoulders win, as a proxy for whoever is closest, so a bystander behind a player doesn't take over.
- Set `numPoses` to the player count, because MediaPipe stops looking beyond it. Higher counts cost inference time, so check the frame rate on the kiosk.
- A person standing on a split can flip between zones. Draw the split lines on the camera feed so players can see where to stand (`flapflap2p/components/SplitCameraPanel` shows the look).
- Give each player their own gesture detector, so one player's movement history and cooldown don't affect another's.

## Cursor games

Don't open a camera or start a detector. The cursor already runs, and a second `useCvCursor` collides with its single `HandLandmarker`. Read the live state in your loop:

```ts
const { cursorStateRef, setCursorVariant } = useCvCursorEnabled();

const { x, y, visible, isPinched } = cursorStateRef.current;
```

- `x`, `y` are viewport pixels, so convert them to canvas space (`drawit/hooks/useDrawingController.ts` has `toCanvasSpace`).
- `isPinched` is raw and has no cooldown, which suits painting and dragging. Trigger one-shot actions on the rising edge of it.
- After a screen change, ignore input for a moment so the pinch that pressed the button doesn't draw a stray stroke (`suspendUntilRef` in the same hook).
- `setCursorVariant("brush" | "hidden" | "default")` changes how the cursor looks. Set it in an effect and reset it in the cleanup (`drawit/components/DrawingCanvas.tsx`).
- DOM buttons respond to the cursor without extra work, because the overlay sends synthetic mouse and pointer events. Make them large, since a hand from across the room isn't precise.
- A pinch is only detected in the pointing pose, and the exact rule lives in `core/cv/cursor/useCvCursor.ts`. Read it, and test the gesture you are actually asking players to make.

## Raw hand tracking

The cursor only reports a hand in the pointing pose, and it smooths the position, which adds lag. For fast movement in any hand pose, read `handTrackRef` instead. `useCvCursor` updates it in place on every inference, with no React state and no smoothing:

```ts
const { handTrackRef, setCursorVariant } = useCvCursorEnabled();

const { detected, tipX, tipY, handScale, wristX, wristY, timestamp, frameId } =
  handTrackRef.current;
```

- `tipX`, `tipY` are viewport pixels. `wristX`, `wristY` are normalized camera coordinates. `handScale` gets bigger as the hand gets closer.
- Compare `frameId` to process each inference once, and use `timestamp` to ignore old samples. Copy any sample you keep, since the object is overwritten in place.
- It comes from the cursor's detector, so the cursor has to stay enabled during play. Use `setCursorVariant("hidden")` to hide it and draw your own.
- There is only one hand per inference, and it may be a bystander's. `gumballslice/logic/PlayerLock.ts` locks onto the hand that started the round and rejects ones that are too small or jump too far.

`gumballslice/game/GumballSliceEngine.ts` is the working example, and it reads the sample through a getter passed to the engine.

## Two-hand games

The shared `HandLandmarker` is a singleton configured for one hand, and the cursor closes it when disabled, so a game can't borrow it.

Check first whether `burgerstack/hooks/useHandLandmarks.ts` has landed on `dev`, and reuse it if so. If it hasn't, create your own landmarker through `src/core/cv/mediapipe-loader.ts`, turn the cursor off during play, and drive it with `useInferenceLoop`. Follow `usePoseDetection` for the shape: bump a sequence ref on every inference, and close the landmarker on unmount.

## Writing gesture detection

- **Use time, not sample counts.** Inference rate changes with load, so a threshold on movement per sample behaves differently on different machines. `flapflap/hooks/useArmFlap.ts` measures per sample and is tuned to its current rate, so don't copy that part. Divide by elapsed milliseconds.
- **Scale by body size.** Someone at the back of the room moves fewer normalized units for the same gesture. Divide distances by shoulder width.
- **Check `visibility`.** MediaPipe guesses positions for landmarks it can't see, and those guesses jump around. Ignore landmarks below a threshold (`useArmFlap` uses 0.2).
- **Fire on a rising edge, with a cooldown,** so holding a gesture doesn't repeat it.
- **Use `PoseLandmark` from `@/shared/utils/gestureConstants`** rather than bare indices.
- **Keep it pure.** A function from landmarks to a result can be tested with fixture arrays, as in `flapflap2p/utils/assignPlayers.test.ts`.

## Current limits

- Games open their own camera stream alongside the cursor's, so the device serves two streams.
- `src/core/cv` hardcodes the MediaPipe WASM URL at `@0.10.32`, while the installed package is 0.10.34. Don't add more copies of that URL. Go through `mediapipe-loader.ts`.
- `core/cv/cameraManager.ts` is an unimplemented stub, and `useSharedCamera` isn't what games use today, whatever older docs imply.
