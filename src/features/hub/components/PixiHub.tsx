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

        const [bgTexture, textureA, textureB] = await Promise.all([
          Assets.load('/penguin.png'),
          Assets.load('/shawn.png'),
          Assets.load('/jack.png'),
        ]);

        if (!isMounted) { app.destroy(); return; }

        const bg = new Sprite(bgTexture);
        bg.width = app.screen.width;
        bg.height = app.screen.height;
        app.stage.addChild(bg);

        function createWalker(startX: number, startY: number, texture: Texture) {
          const walker = new Sprite(texture);
          walker.anchor.set(0.5, 1);
          walker.scale.set(0.25);
          app.stage.addChild(walker);

          let wx = startX;
          let wy = startY;
          let speed = 0;
          let angle = Math.random() * Math.PI * 2;
          let stateTimer = 0;
          let state: 'idle' | 'walk' = 'idle';
          let bobPhase = 0;

          function pickState() {
            if (Math.random() < 0.6) {
              state = 'idle';
              speed = 0;
              stateTimer = 180 + Math.random() * 300;
            } else {
              state = 'walk';
              speed = 0.3 + Math.random() * 0.4;
              angle = Math.random() * Math.PI * 2;
              stateTimer = 60 + Math.random() * 90;
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
              if (wx < M) { wx = M; angle = Math.PI - angle; }
              if (wx > app.screen.width - M) { wx = app.screen.width - M; angle = Math.PI - angle; }
              if (wy < M) { wy = M; angle = -angle; }
              if (wy > app.screen.height - M) { wy = app.screen.height - M; angle = -angle; }

              walker.scale.x = Math.cos(angle) >= 0 ? 0.25 : -0.25;
              bobPhase += 0.1 * dt;
              walker.y = wy + Math.sin(bobPhase) * 1.8;
            } else {
              walker.y = wy;
              walker.rotation = 0;
            }

            walker.x = wx;
            if (state === 'walk') {
              walker.rotation = Math.sin(bobPhase * 0.5) * 0.04;
            }
          };
        }

        const tickA = createWalker(app.screen.width * 0.35, app.screen.height * 0.8, textureA);
        const tickB = createWalker(app.screen.width * 0.65, app.screen.height * 0.8, textureB);

        app.ticker.add((time) => {
          tickA(time.deltaTime);
          tickB(time.deltaTime);
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