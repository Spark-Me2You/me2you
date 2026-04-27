import React, { useEffect, useRef } from "react";
import { Application, Assets, Sprite, Texture } from "pixi.js";
import { useAppState } from "@/core/state-machine";
import { AppState } from "@/core/state-machine/appStateMachine";
import { croppedImageService } from "@/features/hub/services/croppedImageService";
import { storageService } from "@/core/supabase/storage";
import { HUB_ACCESSORY_TUNING } from "@/shared/utils";
import { ExitButton } from "@/shared/components";

// Global hub mii scaling knob. 0.8 means all character parts render at 80% size.
const HUB_MII_SIZE_FACTOR = 0.8;
const HUB_BODY_BASE_SCALE = 0.4;
const HUB_FACE_BASE_SCALE = 0.35;

export interface CharacterClickData {
  owner_id: string;
  cropped_image_id: string;
  storage_path: string;
}

export const PixiHub: React.FC<{
  onCharacterClick?: (data: CharacterClickData) => void;
  orgId: string;
}> = ({ onCharacterClick, orgId }) => {
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
        if (!isMounted) {
          app.destroy();
          return;
        }
        canvasRef.current.appendChild(app.canvas);
        appRef.current = app;

        function loadFrames(prefix: string, names: string[]) {
          return Promise.all(
            names.map((name) =>
              Assets.load(`/animations/${prefix}${name}.png`).catch((e) => {
                console.error(
                  `Failed to load: /animations/${prefix}${name}.png`,
                  e,
                );
                return Texture.WHITE;
              }),
            ),
          );
        }

        const bgTexture = await Assets.load("/bg_draft1.png");
        if (!isMounted) {
          app.destroy();
          return;
        }

        const bg = new Sprite(bgTexture);
        bg.width = app.screen.width;
        bg.height = app.screen.height;
        app.stage.addChild(bg);

        const IDLE_FRAME_DURATION = 60 / 4;
        const WALK_FRAME_DURATION = 60 / 6;
        const BODY_SCALE = HUB_BODY_BASE_SCALE * HUB_MII_SIZE_FACTOR;
        const FACE_SCALE = HUB_FACE_BASE_SCALE * HUB_MII_SIZE_FACTOR;
        // Scale head offset along with body/head so face placement stays proportional.
        const HEAD_OFFSET_X = 5 * HUB_MII_SIZE_FACTOR;
        const HEAD_OFFSET_Y = -145 * HUB_MII_SIZE_FACTOR;

        function buildFrameSets(
          def: Texture,
          def2: Texture,
          def3: Texture,
          right: Texture,
          left: Texture,
        ) {
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
          storagePath?: string,
          accessoryOptions?: {
            accessory: string;
            texture: Texture;
            leftEyePoint?: { x: number; y: number };
            rightEyePoint?: { x: number; y: number };
            foreheadTopPoint?: { x: number; y: number };
          },
        ) {
          const walker = new Sprite(texture);
          walker.anchor.set(0.5, 1);
          walker.scale.set(BODY_SCALE);
          app.stage.addChild(walker);

          // Make walker clickable if we have owner data
          if (ownerId && onCharacterClick) {
            walker.interactive = true;
            walker.cursor = "pointer";
            walker.on("pointerdown", () => {
              onCharacterClick({
                owner_id: ownerId,
                cropped_image_id: croppedImageId || "",
                storage_path: storagePath || "",
              });
            });
          }

          let faceSprite: Sprite | null = null;
          if (faceTexture && centroidPoint) {
            faceSprite = new Sprite(faceTexture);
            // Use center anchor since centroid is relative to original image, not crop
            faceSprite.anchor.set(0.5, 0.5);
            faceSprite.scale.set(FACE_SCALE);
            app.stage.addChild(faceSprite);
          }

          // Accessory sprite — positioned via face landmarks or fixed body offset
          let accessorySprite: Sprite | null = null;
          let accOffsetX = 0;
          let accOffsetY = 0;
          let accRelativeToFace = true;
          let accUseBalloonHandAnchor = false;
          let accBaseRotation = 0;

          if (accessoryOptions && faceSprite) {
            const { accessory, texture: accTex } = accessoryOptions;
            accessorySprite = new Sprite(accTex);
            accessorySprite.anchor.set(0.5, 0.5);
            app.stage.addChild(accessorySprite);

            const faceW = faceSprite.width;
            const faceH = faceSprite.height;
            const aspect = accTex.width / accTex.height;

            // Offsets derived from the customize-screen CSS proportions so hub and
            // preview look the same. All positions are relative to the face sprite center.
            if (accessory === "sunglasses" || accessory === "glasses") {
              accessorySprite.width =
                faceW * HUB_ACCESSORY_TUNING.sunglasses.widthFactor;
              accessorySprite.height = accessorySprite.width / aspect;
              accOffsetX =
                faceW * HUB_ACCESSORY_TUNING.sunglasses.offsetXFactor;
              accOffsetY =
                faceH * HUB_ACCESSORY_TUNING.sunglasses.offsetYFactor;
            } else if (accessory === "hat") {
              accessorySprite.width =
                faceW * HUB_ACCESSORY_TUNING.hat.widthFactor;
              accessorySprite.height = accessorySprite.width / aspect;
              accOffsetX = faceW * HUB_ACCESSORY_TUNING.hat.offsetXFactor;
              accOffsetY = faceH * HUB_ACCESSORY_TUNING.hat.offsetYFactor;
            } else if (accessory === "balloon") {
              accessorySprite.width =
                faceW * HUB_ACCESSORY_TUNING.balloon.widthFactor;
              accessorySprite.height = accessorySprite.width / aspect;
              // Balloon should anchor to hand, not face.
              accRelativeToFace = false;
              accUseBalloonHandAnchor = true;
              accBaseRotation = HUB_ACCESSORY_TUNING.balloon.tiltRadians;
            }
          }

          let wx = startX;
          let wy = startY;
          let speed = 0;
          let angle = Math.random() * Math.PI * 2;
          let stateTimer = 0;
          let state: "idle" | "walk" | "jump" = "idle";
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
              state = "idle";
              speed = 0;
              stateTimer = 180 + Math.random() * 300;
              idleFrameIndex = 0;
              idleFrameTimer = 0;
              if (idleFrames) walker.texture = idleFrames[0];
            } else if (r < 0.75) {
              state = "jump";
              speed = 0;
              jumpVY = -(3 + Math.random() * 2);
              jumpY = 0;
              stateTimer = 999;
              if (idleFrames) walker.texture = idleFrames[0];
            } else {
              state = "walk";
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

            if (state === "walk") {
              angle += (Math.random() - 0.5) * 0.02 * dt;
              wx += Math.cos(angle) * speed * dt;
              wy += Math.sin(angle) * speed * dt;

              const M = 40;
              const yMin = app.screen.height / 3;

              if (wx < M) {
                wx = M;
                angle = Math.PI - angle;
              }
              if (wx > app.screen.width - M) {
                wx = app.screen.width - M;
                angle = Math.PI - angle;
              }
              if (wy < yMin) {
                wy = yMin;
                angle = -angle;
              }
              if (wy > app.screen.height - M) {
                wy = app.screen.height - M;
                angle = -angle;
              }

              const movingRight = Math.cos(angle) >= 0;
              const activeWalkFrames = movingRight
                ? walkFramesRight
                : walkFramesLeft;

              walker.scale.x = BODY_SCALE;
              bobPhase += 0.1 * dt;
              walker.y = wy + Math.sin(bobPhase) * 1.8;

              if (activeWalkFrames) {
                walkFrameTimer += dt;
                if (walkFrameTimer >= WALK_FRAME_DURATION) {
                  walkFrameTimer -= WALK_FRAME_DURATION;
                  walkFrameIndex =
                    (walkFrameIndex + 1) % activeWalkFrames.length;
                  walker.texture = activeWalkFrames[walkFrameIndex];
                }
              }
            } else if (state === "jump") {
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
            if (state === "walk") {
              walker.rotation = Math.sin(bobPhase * 0.5) * 0.04;
            }

            if (faceSprite) {
              faceSprite.x = walker.x + HEAD_OFFSET_X;
              faceSprite.y = walker.y + HEAD_OFFSET_Y;
              if (state === "walk") {
                faceSprite.rotation = Math.sin(bobPhase * 0.5) * 0.04;
              } else {
                faceSprite.rotation = 0;
              }
            }

            if (accessorySprite) {
              const bobRotation =
                state === "walk" ? Math.sin(bobPhase * 0.5) * 0.04 : 0;

              if (accUseBalloonHandAnchor) {
                // Anchor the balloon string endpoint into the right hand and then
                // back-solve the balloon center, accounting for rotation.
                const handX =
                  walker.x +
                  walker.width * HUB_ACCESSORY_TUNING.balloon.handXFactor;
                const handY =
                  walker.y -
                  walker.height * HUB_ACCESSORY_TUNING.balloon.handYFactor;

                const totalRotation = accBaseRotation + bobRotation;
                const stringEndDx =
                  accessorySprite.width *
                  (HUB_ACCESSORY_TUNING.balloon.stringEndU - 0.5);
                const stringEndDy =
                  accessorySprite.height *
                  (HUB_ACCESSORY_TUNING.balloon.stringEndV - 0.5);

                const cos = Math.cos(totalRotation);
                const sin = Math.sin(totalRotation);
                const rotatedDx = stringEndDx * cos - stringEndDy * sin;
                const rotatedDy = stringEndDx * sin + stringEndDy * cos;

                accessorySprite.x = handX - rotatedDx;
                accessorySprite.y = handY - rotatedDy;
              } else if (accRelativeToFace) {
                accessorySprite.x = walker.x + HEAD_OFFSET_X + accOffsetX;
                accessorySprite.y = walker.y + HEAD_OFFSET_Y + accOffsetY;
              } else {
                accessorySprite.x = walker.x + accOffsetX;
                accessorySprite.y = walker.y + accOffsetY;
              }

              accessorySprite.rotation = accBaseRotation + bobRotation;
            }
          };
        }

        // Cache body frame textures (loaded once and reused across all walkers)
        const bodyFrames = await Promise.all([
          loadFrames("", [
            "default",
            "default2",
            "default3",
            "rightstep",
            "leftstep",
          ]),
        ]);

        const defaultBodyFrames = buildFrameSets(
          bodyFrames[0][0],
          bodyFrames[0][1],
          bodyFrames[0][2],
          bodyFrames[0][3],
          bodyFrames[0][4],
        );

        if (!isMounted) {
          app.destroy();
          return;
        }

        // Load accessory textures once (SVG placeholders — replace with PNGs when final art is ready)
        const loadAccessoryTexture = async (
          path: string,
        ): Promise<Texture | null> => {
          try {
            return await Assets.load(path);
          } catch {
            console.warn(`[PixiHub] Could not load accessory texture: ${path}`);
            return null;
          }
        };

        const [sgTex, hatTex, balloonTex] = await Promise.all([
          loadAccessoryTexture("/accessories/sunglasses.svg"),
          loadAccessoryTexture("/accessories/hat.svg"),
          loadAccessoryTexture("/accessories/balloon.svg"),
        ]);

        const accessoryTextures: Record<string, Texture> = {};
        if (sgTex) accessoryTextures["sunglasses"] = sgTex;
        if (hatTex) accessoryTextures["hat"] = hatTex;
        if (balloonTex) accessoryTextures["balloon"] = balloonTex;

        if (!isMounted) {
          app.destroy();
          return;
        }

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

          while (isMounted) {
            try {
              const { rows, pagination } =
                await croppedImageService.getPaginatedCroppedImages(
                  orgId,
                  offset,
                  10,
                );

              if (rows.length === 0) break;

              // Load all characters in this batch in parallel
              await Promise.all(
                rows.map(async (row) => {
                  try {
                    // Generate public URL from storage_path
                    const faceUrl = await storageService.getPhotoUrl(
                      row.storage_path,
                    );

                    // Load face texture
                    const faceTexture = await Assets.load(faceUrl);

                    if (!isMounted) return;

                    // Create walker with face and optional accessory
                    const position = randSpawn();
                    const accTex = row.accessory
                      ? accessoryTextures[row.accessory]
                      : undefined;
                    const ticker = createWalker(
                      position.x,
                      position.y,
                      defaultBodyFrames.idle[0],
                      defaultBodyFrames.idle,
                      defaultBodyFrames.walkRight,
                      defaultBodyFrames.walkLeft,
                      faceTexture,
                      row.centroid_point ?? undefined,
                      row.owner_id,
                      row.id,
                      row.storage_path,
                      row.accessory && accTex
                        ? {
                            accessory: row.accessory,
                            texture: accTex,
                            leftEyePoint: row.left_eye_point ?? undefined,
                            rightEyePoint: row.right_eye_point ?? undefined,
                            foreheadTopPoint:
                              row.forehead_top_point ?? undefined,
                          }
                        : undefined,
                    );

                    // Add ticker to array immediately
                    tickers.push(ticker);
                  } catch (error) {
                    console.error(
                      `[PixiHub] Failed to load character for ${row.id}:`,
                      error,
                    );
                  }
                }),
              );

              // Check if there are more batches
              if (!pagination.hasMore) break;
              offset = pagination.offset;
            } catch (error) {
              console.error("[PixiHub] Failed to fetch batch:", error);
              break;
            }
          }
        };

        // Start loading batches
        loadBatches();

        // Add ticker to update all walkers
        app.ticker.add((time) => {
          tickers.forEach((tick) => tick(time.deltaTime));
        });
      } catch (err) {
        console.error("Failed to initialize Pixi app:", err);
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
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      <ExitButton onClick={handleClick} />
    </div>
  );
};
