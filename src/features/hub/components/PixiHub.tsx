import React, { useEffect, useRef } from 'react';
import { Application, Assets, Sprite, Texture } from 'pixi.js';
import { useAppState } from '@/core/state-machine';
import { AppState } from '@/core/state-machine/appStateMachine';
import { croppedImageService } from '@/features/hub/services/croppedImageService';
import { storageService } from '@/core/supabase/storage';

export interface CharacterClickData {
  owner_id: string;
  cropped_image_id: string;
  storage_path: string;
}

export const PixiHub: React.FC<{ onCharacterClick?: (data: CharacterClickData) => void }> = ({
  onCharacterClick,
}) => {
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
              Assets.load(`/animations/${prefix}${name}.png`).catch(e => {
                console.error(`Failed to load: /animations/${prefix}${name}.png`, e);
                return Texture.WHITE;
              })
            )
          );
        }

        const bgTexture = await Assets.load('/bg_v0.png');
        if (!isMounted) { app.destroy(); return; }

        const bg = new Sprite(bgTexture);
        bg.width = app.screen.width;
        bg.height = app.screen.height;
        app.stage.addChild(bg);

        const IDLE_FRAME_DURATION = 60 / 4;
        const WALK_FRAME_DURATION = 60 / 6;
        const HEAD_OFFSET_X = 0;
        const HEAD_OFFSET_Y = -150;

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
          faceTexture?: Texture,
          centroidPoint?: { x: number; y: number },
          ownerId?: string,
          croppedImageId?: string,
          storagePath?: string
        ) {
          const walker = new Sprite(texture);
          walker.anchor.set(0.5, 1);
          walker.scale.set(0.4);
          app.stage.addChild(walker);

          // Make walker clickable if we have owner data
          if (ownerId && onCharacterClick) {
            walker.interactive = true;
            walker.cursor = 'pointer';
            walker.on('pointerdown', () => {
              onCharacterClick({
                owner_id: ownerId,
                cropped_image_id: croppedImageId || '',
                storage_path: storagePath || '',
              });
            });
          }

          let faceSprite: Sprite | null = null;
          if (faceTexture && centroidPoint) {
            faceSprite = new Sprite(faceTexture);
            faceSprite.anchor.set(
              centroidPoint.x / faceTexture.width,
              centroidPoint.y / faceTexture.height
            );
            faceSprite.scale.set(0.35);
            app.stage.addChild(faceSprite);
          }

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

              walker.scale.x = 0.4;
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

            if (faceSprite) {
              faceSprite.x = walker.x + HEAD_OFFSET_X;
              faceSprite.y = walker.y + HEAD_OFFSET_Y;
              if (state === 'walk') {
                faceSprite.rotation = Math.sin(bobPhase * 0.5) * 0.04;
              } else {
                faceSprite.rotation = 0;
              }
            }
          };
        }

        // Cache body frame textures (loaded once and reused across all walkers)
        const bodyFrames = await Promise.all([
          loadFrames('', ['default', 'default2', 'default3', 'rightstep', 'leftstep']),
        ]);

        const defaultBodyFrames = buildFrameSets(
          bodyFrames[0][0],
          bodyFrames[0][1],
          bodyFrames[0][2],
          bodyFrames[0][3],
          bodyFrames[0][4]
        );

        if (!isMounted) { app.destroy(); return; }

        const w = app.screen.width;
        const h = app.screen.height;

        function randSpawn() {
          return {
            x: w * (0.15 + Math.random() * 0.7),
            y: h * (0.55 + Math.random() * 0.35),
          };
        }

        const tickers: Array<(dt: number) => void> = [];

        // Fetch and load characters in paginated batches
        const loadBatches = async () => {
          let offset = 0;
          const orgId = import.meta.env.VITE_DEFAULT_ORG_ID;

          while (isMounted) {
            try {
              const { rows, pagination } = await croppedImageService.getPaginatedCroppedImages(
                orgId,
                offset,
                10
              );

              if (rows.length === 0) break;

              // Load all characters in this batch in parallel
              await Promise.all(
                rows.map(async (row) => {
                  try {
                    // Generate public URL from storage_path
                    const faceUrl = await storageService.getPhotoUrl(row.storage_path);
                    console.log('[PixiHub] centroid_point:', row.centroid_point); // add here
                    console.log('[PixiHub] face url:', faceUrl);

                    // Load face texture
                    const faceTexture = await Assets.load(faceUrl);

                    if (!isMounted) return;

                    // Create walker with face
                    const position = randSpawn();
                    const ticker = createWalker(
                      position.x,
                      position.y,
                      defaultBodyFrames.idle[0],
                      defaultBodyFrames.idle,
                      defaultBodyFrames.walkRight,
                      defaultBodyFrames.walkLeft,
                      faceTexture,
                      row.centroid_point,
                      row.owner_id,
                      row.id,
                      row.storage_path
                    );

                    // Add ticker to array immediately
                    tickers.push(ticker);
                  } catch (error) {
                    console.error(
                      `[PixiHub] Failed to load character for ${row.id}:`,
                      error
                    );
                  }
                })
              );

              // Check if there are more batches
              if (!pagination.hasMore) break;
              offset = pagination.offset;
            } catch (error) {
              console.error('[PixiHub] Failed to fetch batch:', error);
              break;
            }
          }
        };

        // Start loading batches
        loadBatches();

        // Add ticker to update all walkers
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


