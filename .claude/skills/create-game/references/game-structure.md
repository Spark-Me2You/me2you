# Game structure

## Contents

- Layout
- The engine
- The React component
- Saving scores
- Tests

## Layout

```
src/features/games/<game>/
  components/<Game>Game.tsx   the registered component: wiring and DOM UI
  config/<game>Config.ts      sizes, physics, gesture thresholds
  game/<Game>Engine.ts        Pixi scene and game rules, no React
  hooks/, utils/              gesture detection and other pure logic
  types/
```

Pixi games follow this. A canvas or DOM game like `drawit/` doesn't need an engine, but still keeps its logic out of the component.

`hooks/useGameLoop.ts` is not the pattern. Nothing in production uses it. The loop is the Pixi ticker, shown below.

## The engine

A plain class that takes the Pixi `Application`, with no React and no CV imports. Input reaches it as method calls (`engine.flap()`), which is what lets the keyboard fallback and the gesture share a path. An engine fed by a continuous position can take a getter instead and add itself to the ticker (`gumballslice/game/GumballSliceEngine.ts`).

```ts
export class MyGameEngine {
  constructor(app: Application) { /* build the scene */ }
  setCallbacks(onStateChange: (state: MyGameState) => void) { /* ... */ }
  update(dt: number) { /* advance one fixed step */ }
  restart() { /* ... */ }
  destroy() { /* remove what you added to the stage */ }
}
```

Use a small explicit state set, such as `WAITING`, `PLAYING`, `GAME_OVER`. The component uses state changes to toggle the cursor and show overlays.

## The React component

```tsx
export const MyGame: React.FC<GameProps> = ({ onExit }) => {
  const { app, containerRef, isReady } = usePixiApp({
    width: MY_GAME_CONFIG.WIDTH,
    height: MY_GAME_CONFIG.HEIGHT,
    backgroundColor: MY_GAME_CONFIG.BACKGROUND,
    resolution: Math.min(window.devicePixelRatio, 1.25),
  });
  const engineRef = useRef<MyGameEngine | null>(null);
  const [gameState, setGameState] = useState<MyGameState>("WAITING");

  useEffect(() => {
    if (!app || !isReady) return;

    const engine = new MyGameEngine(app);
    engineRef.current = engine;
    engine.setCallbacks((state) => {
      // The engine calls this from inside the ticker. Leave that callback
      // before touching React state.
      setTimeout(() => setGameState(state), 0);
    });

    const FIXED_STEP = 1 / 60;
    const MAX_STEPS = 4;
    let accumulator = 0;

    const tick = (time: Ticker) => {
      accumulator += Math.min(time.deltaMS / 1000, 0.05);
      let steps = 0;
      while (accumulator >= FIXED_STEP && steps < MAX_STEPS) {
        engine.update(FIXED_STEP);
        accumulator -= FIXED_STEP;
        steps += 1;
      }
      // ...read CV refs here (see computer-vision.md)
    };

    app.ticker.add(tick);
    return () => {
      app.ticker.remove(tick);
      engine.destroy();
      engineRef.current = null;
    };
  }, [app, isReady]);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div ref={containerRef} />
      {/* Overlays and camera go here, as siblings of the container */}
      <ExitButton onClick={onExit} />
    </div>
  );
};
```

The fixed step keeps physics the same whatever the frame rate. The clamps stop a stalled tab from fast-forwarding the game when it wakes up.

Things to keep in mind:

- **React only hears about things that change rarely,** such as state changes, final scores and presence. For a live HUD, poll a ref a few times a second rather than setting state from the ticker.
- **Callbacks the ticker uses go in refs,** updated in an effect, so the effect above doesn't tear down the game when they change identity.
- **`GameProps.onScoreChange` is never passed** by `GamesView`, and `GameDefinition.thumbnail`, `GameState`, `GameScore` and `PoseFrame` are unused. Don't build on them.
- **Scaling:** `usePixiApp` makes a fixed-size canvas. To fit the screen, measure the parent with a `ResizeObserver` and apply a CSS `scale` (see `flapflap/components/FlapFlapGame.tsx`).

## Saving scores

A saved score goes through a claim: the kiosk shows a QR code and a phone scan attaches the score to that user's account.

- Render `ClaimSection` from `@/features/claim`. `flapflap/components/GameOverClaim.tsx` is the working example, and `src/features/claim/README.md` explains the flow.
- The payload has `type: "game_score"` and `data: { game_id, score, played_at }`. A database trigger (`supabase/migrations/016_game_score.sql`) inserts the `game_score` row.
- `game_id` is free text, so a new game doesn't need a migration or a new edge function.
- Rewards other than a score need more. Gumball Slice's `candy_reward` claim has its own migrations and edge function, and database work isn't agent work (`docs/AGENT_WORKFLOW.md`).

Saving is the only part that works generically. Tell the user about these before promising a leaderboard or profile entry:

- `services/gameScoreService.ts` (leaderboard) and `features/user/components/UserGameScoresPage.tsx` are hardcoded to FlapFlap, so a new game's scores save but aren't shown anywhere until those are generalized.
- `core/badges/badgeService.ts` awards the first-place badge from the top score across all games, without filtering by `game_id`. A game with large score numbers would take that badge from every FlapFlap player. Fix this in the same PR if your scores can exceed FlapFlap's.

## Tests

- Colocate `*.test.ts(x)`, and import `describe`, `it`, `expect` and `vi` from `vitest`.
- Test gesture logic with fixture landmark arrays, and engine rules with `src/test/pixiStub.ts`.
- Mock `@/core/cv/mediapipe-loader` for anything that touches a detector (`hooks/usePoseDetection.test.ts`).
- Use `src/test/supabaseMock.ts` for score services.
