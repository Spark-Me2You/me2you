import React, { useEffect, useRef } from 'react';
import { Application, Assets, Sprite, Texture } from 'pixi.js';
import { useAppState } from '@/core/state-machine';
import { AppState } from '@/core/state-machine/appStateMachine';

export const PixiHub: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const { transitionTo } = useAppState();

  useEffect(() => {
    let isMounted = true;

    const initPixiApp = async () => {
      if (!canvasRef.current) return;

      try {
        const app = new Application();
        await app.init({ resizeTo: window });
        if (!isMounted) { app.destroy(); return; }
        canvasRef.current.appendChild(app.canvas);
        appRef.current = app;

        function loadFrames(prefix: string, names: string[]) {
          return Promise.all(
            names.map(name =>
              Assets.load(`/animations/${prefix}${name}.PNG`).catch(e => {
                console.error(`Failed to load: /animations/${prefix}${name}.PNG`, e);
                return Texture.WHITE;
              })
            )
          );
        }

        const [
          bgTexture,
          [jackDefault, jackDefault2, jackDefault3, jackRightStep, jackLeftStep],
          [noraDefault, noraDefault2, noraDefault3, noraRightStep, noraLeftStep],
          [shawnDefault, shawnDefault2, shawnDefault3, shawnRightStep, shawnLeftStep],
          [asadDefault, asadDefault2, asadDefault3, asadRightStep, asadLeftStep],
        ] = await Promise.all([
          Assets.load('/bg_v0.png'),
          loadFrames('jack_', ['default', 'default2', 'default3', 'rightstep', 'leftstep']),
          loadFrames('nora_', ['default', 'default2', 'default3', 'rightstep', 'leftstep']),
          loadFrames('shawn_', ['default', 'default2', 'default3', 'rightstep', 'leftstep']),
          loadFrames('asad_', ['default', 'default2', 'default3', 'rightstep', 'leftstep']),
        ]);

        if (!isMounted) { app.destroy(); return; }

        const bg = new Sprite(bgTexture);
        bg.width = app.screen.width;
        bg.height = app.screen.height;
        app.stage.addChild(bg);

        const IDLE_FRAME_DURATION = 60 / 4;
        const WALK_FRAME_DURATION = 60 / 6;

        function buildFrameSets(def: Texture, def2: Texture, def3: Texture, right: Texture, left: Texture) {
          return {
            idle: [def, def2, def3, def2],
            walkRight: [right, left, def],
            walkLeft: [left, right, def],
          };
        }

        function createWalker(
          startX: number,
          startY: number,
          texture: Texture,
          idleFrames?: Texture[],
          walkFramesRight?: Texture[],
          walkFramesLeft?: Texture[],
        ) {
          const walker = new Sprite(texture);
          walker.anchor.set(0.5, 1);
          walker.scale.set(0.25);
          app.stage.addChild(walker);

          let wx = startX;
          let wy = startY;
          let speed = 0;
          let angle = Math.random() * Math.PI * 2;
          let stateTimer = 0;
          let state: 'idle' | 'walk' | 'jump' = 'idle';
          let bobPhase = 0;

          let idleFrameIndex = 0;
          let idleFrameTimer = 0;
          let walkFrameIndex = 0;
          let walkFrameTimer = 0;

          let jumpVY = 0;
          let jumpY = 0;

          function pickState() {
            const r = Math.random();
            if (r < 0.55) {
              state = 'idle';
              speed = 0;
              stateTimer = 180 + Math.random() * 300;
              idleFrameIndex = 0;
              idleFrameTimer = 0;
              if (idleFrames) walker.texture = idleFrames[0];
            } else if (r < 0.75) {
              state = 'jump';
              speed = 0;
              jumpVY = -(3 + Math.random() * 2);
              jumpY = 0;
              stateTimer = 999;
              if (idleFrames) walker.texture = idleFrames[0];
            } else {
              state = 'walk';
              speed = 0.3 + Math.random() * 0.4;
              angle = Math.random() * Math.PI * 2;
              stateTimer = 60 + Math.random() * 90;
              walkFrameIndex = 0;
              walkFrameTimer = 0;
              if (walkFramesRight) walker.texture = walkFramesRight[0];
            }
          }
          pickState();

          return (dt: number) => {
            stateTimer -= dt;
            if (stateTimer <= 0) pickState();

            if (state === 'walk') {
              angle += (Math.random() - 0.5) * 0.02 * dt;
              wx += Math.cos(angle) * speed * dt;
              wy += Math.sin(angle) * speed * dt;

              const M = 40;
              const yMin = app.screen.height / 3;

              if (wx < M) { wx = M; angle = Math.PI - angle; }
              if (wx > app.screen.width - M) { wx = app.screen.width - M; angle = Math.PI - angle; }
              if (wy < yMin) { wy = yMin; angle = -angle; }
              if (wy > app.screen.height - M) { wy = app.screen.height - M; angle = -angle; }

              const movingRight = Math.cos(angle) >= 0;
              const activeWalkFrames = movingRight ? walkFramesRight : walkFramesLeft;

              walker.scale.x = 0.25;
              bobPhase += 0.1 * dt;
              walker.y = wy + Math.sin(bobPhase) * 1.8;

              if (activeWalkFrames) {
                walkFrameTimer += dt;
                if (walkFrameTimer >= WALK_FRAME_DURATION) {
                  walkFrameTimer -= WALK_FRAME_DURATION;
                  walkFrameIndex = (walkFrameIndex + 1) % activeWalkFrames.length;
                  walker.texture = activeWalkFrames[walkFrameIndex];
                }
              }
            } else if (state === 'jump') {
              jumpVY += 0.25 * dt;
              jumpY += jumpVY * dt;
              walker.y = wy + jumpY;
              if (jumpY >= 0) {
                jumpY = 0;
                pickState();
              }
            } else {
              walker.y = wy;
              walker.rotation = 0;

              if (idleFrames) {
                idleFrameTimer += dt;
                if (idleFrameTimer >= IDLE_FRAME_DURATION) {
                  idleFrameTimer -= IDLE_FRAME_DURATION;
                  idleFrameIndex = (idleFrameIndex + 1) % idleFrames.length;
                  walker.texture = idleFrames[idleFrameIndex];
                }
              }
            }

            walker.x = wx;
            if (state === 'walk') {
              walker.rotation = Math.sin(bobPhase * 0.5) * 0.04;
            }
          };
        }

        const jack  = buildFrameSets(jackDefault,  jackDefault2,  jackDefault3,  jackRightStep,  jackLeftStep);
        const nora  = buildFrameSets(noraDefault,  noraDefault2,  noraDefault3,  noraRightStep,  noraLeftStep);
        const shawn = buildFrameSets(shawnDefault, shawnDefault2, shawnDefault3, shawnRightStep, shawnLeftStep);
        const asad  = buildFrameSets(asadDefault,  asadDefault2,  asadDefault3,  asadRightStep,  asadLeftStep);

        const w = app.screen.width;
        const h = app.screen.height;

        function randSpawn() {
          return {
            x: w * (0.15 + Math.random() * 0.7),
            y: h * (0.55 + Math.random() * 0.35),
          };
        }

        const positions = [randSpawn(), randSpawn(), randSpawn(), randSpawn()];

        const tickers = [
          createWalker(positions[0].x, positions[0].y, jackDefault,  jack.idle,  jack.walkRight,  jack.walkLeft),
          createWalker(positions[1].x, positions[1].y, noraDefault,  nora.idle,  nora.walkRight,  nora.walkLeft),
          createWalker(positions[2].x, positions[2].y, shawnDefault, shawn.idle, shawn.walkRight, shawn.walkLeft),
          createWalker(positions[3].x, positions[3].y, asadDefault,  asad.idle,  asad.walkRight,  asad.walkLeft),
        ];

        app.ticker.add((time) => {
          tickers.forEach(tick => tick(time.deltaTime));
        });
      } catch (err) {
        console.error('Failed to initialize Pixi app:', err);
      }
    };

    initPixiApp();

    return () => {
      isMounted = false;
      if (appRef.current) {
        appRef.current.destroy();
        appRef.current = null;
      }
    };
  }, [transitionTo]);

  const handleClick = () => {
    transitionTo(AppState.IDLE);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      <button
        onClick={handleClick}
        style={{
          position: 'fixed',
          bottom: '3%',
          right: '4%',
          backgroundColor: '#7105e4',
          color: '#fff',
          border: 'none',
          padding: '14px 28px',
          fontFamily: "'Jersey 10', sans-serif",
          fontSize: 'clamp(16px, 1.8vw, 28px)',
          letterSpacing: '5px',
          cursor: 'pointer',
          borderRadius: 6,
          zIndex: 100,
        }}
      >
        back
      </button>
    </div>
  );
};