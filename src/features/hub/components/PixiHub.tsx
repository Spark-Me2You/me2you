import React, { useEffect, useRef } from "react";
import { Application, Assets, Sprite, Texture } from "pixi.js";
import type { Accessory } from "@/core/auth/AuthContext";
import { useAppState } from "@/core/state-machine";
import { AppState } from "@/core/state-machine/appStateMachine";
import { croppedImageService, type CroppedImageRow } from "@/features/hub/services/croppedImageService";
import { hubRealtimeService } from "@/features/hub/services/hubRealtimeService";
import { storageService } from "@/core/supabase/storage";
import {
  HUB_ACCESSORY_TUNING,
  MII_BODY_SCALE,
  MII_FACE_SCALE,
  MII_HEAD_OFFSET_X,
  MII_HEAD_OFFSET_Y,
  getAccessoryPlacement,
  getBalloonCenterFromHandAnchor,
} from "@/shared/utils";
import { ExitButton } from "@/shared/components";
import type { AccessorySettings } from "@/features/profile-editor/types/profileTypes";

export interface CharacterClickData {
  owner_id: string;
  cropped_image_id: string;
  storage_path: string;
}

type AccessoryOptions = {
  accessory: Accessory | "glasses";
  texture: Texture;
  leftEyePoint?: { x: number; y: number };
  rightEyePoint?: { x: number; y: number };
  foreheadTopPoint?: { x: number; y: number };
  relativeX?: number;
  relativeY?: number;
  scale?: number;
};

interface WalkerHandle {
  ownerId: string;
  tick: (dt: number) => void;
  replaceAccessory: (options?: AccessoryOptions) => void;
  replaceFace: (storagePath: string) => Promise<void>;
}

export const PixiHub: React.FC<{
  onCharacterClick?: (data: CharacterClickData) => void;
  orgId: string;
}> = ({ onCharacterClick, orgId }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const addWalkerRef = useRef<((row: CroppedImageRow) => Promise<void>) | null>(null);
  const updateAccRef = useRef<((ownerId: string, settings: AccessorySettings) => void) | null>(null);
  const replaceFaceRef = useRef<((ownerId: string, storagePath: string) => Promise<void>) | null>(null);
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
        const BODY_SCALE = MII_BODY_SCALE;
        const FACE_SCALE = MII_FACE_SCALE;
        const HEAD_OFFSET_X = MII_HEAD_OFFSET_X;
        const HEAD_OFFSET_Y = MII_HEAD_OFFSET_Y;

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
          accessoryOptions?: AccessoryOptions,
        ): WalkerHandle {
          const walker = new Sprite(texture);
          walker.anchor.set(0.5, 1);
          walker.scale.set(BODY_SCALE);
          app.stage.addChild(walker);

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
            faceSprite.anchor.set(0.5, 0.5);
            faceSprite.scale.set(FACE_SCALE);
            app.stage.addChild(faceSprite);
          }

          let accessorySprite: Sprite | null = null;
          let accOffsetX = 0;
          let accOffsetY = 0;
          let accRelativeToFace = true;
          let accUseBalloonHandAnchor = false;
          let accBaseRotation = 0;

          function applyAccessoryOptions(options?: AccessoryOptions) {
            if (accessorySprite) {
              app.stage.removeChild(accessorySprite);
              accessorySprite.destroy();
              accessorySprite = null;
            }
            accOffsetX = 0;
            accOffsetY = 0;
            accRelativeToFace = true;
            accUseBalloonHandAnchor = false;
            accBaseRotation = 0;

            if (options && faceSprite) {
              const {
                accessory,
                texture: accTex,
                relativeX = 0,
                relativeY = 0,
                scale = 1,
              } = options;
              accessorySprite = new Sprite(accTex);
              accessorySprite.anchor.set(0.5, 0.5);
              app.stage.addChild(accessorySprite);

              const faceW = faceSprite.width;
              const faceH = faceSprite.height;
              const aspect = accTex.width / accTex.height;

              const normalizedAccessory: Accessory =
                accessory === "glasses" ? "sunglasses" : accessory;
              const placement = getAccessoryPlacement({
                accessory: normalizedAccessory,
                faceWidth: faceW,
                faceHeight: faceH,
                accessoryAspectRatio: aspect,
                relativeX,
                relativeY,
                scale,
              });

              accessorySprite.width = placement.width;
              accessorySprite.height = placement.height;
              accOffsetX = placement.offsetX;
              accOffsetY = placement.offsetY;
              accBaseRotation = placement.baseRotation;
              accRelativeToFace = placement.anchor === "face";
              accUseBalloonHandAnchor = placement.anchor === "balloon-hand";
            }
          }

          applyAccessoryOptions(accessoryOptions);

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

          function tick(dt: number) {
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
                const handX =
                  walker.x +
                  walker.width * HUB_ACCESSORY_TUNING.balloon.handXFactor;
                const handY =
                  walker.y -
                  walker.height * HUB_ACCESSORY_TUNING.balloon.handYFactor;

                const totalRotation = accBaseRotation + bobRotation;
                const center = getBalloonCenterFromHandAnchor({
                  handX,
                  handY,
                  balloonWidth: accessorySprite.width,
                  balloonHeight: accessorySprite.height,
                  rotationRadians: totalRotation,
                  userDeltaX: accOffsetX,
                  userDeltaY: accOffsetY,
                });

                accessorySprite.x = center.x;
                accessorySprite.y = center.y;
              } else if (accRelativeToFace) {
                accessorySprite.x = walker.x + HEAD_OFFSET_X + accOffsetX;
                accessorySprite.y = walker.y + HEAD_OFFSET_Y + accOffsetY;
              } else {
                accessorySprite.x = walker.x + accOffsetX;
                accessorySprite.y = walker.y + accOffsetY;
              }

              accessorySprite.rotation = accBaseRotation + bobRotation;
            }
          }

          async function replaceFace(storagePath: string) {
            try {
              const faceUrl = await storageService.getPhotoUrl(storagePath);
              const newTexture = await Assets.load(faceUrl);
              if (faceSprite) {
                faceSprite.texture = newTexture;
              }
            } catch (err) {
              console.error("[PixiHub] Failed to replace face texture:", err);
            }
          }

          return {
            ownerId: ownerId ?? "",
            tick,
            replaceAccessory: applyAccessoryOptions,
            replaceFace,
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

        const walkersMap = new Map<string, WalkerHandle>();

        async function spawnWalker(row: CroppedImageRow) {
          const existing = walkersMap.get(row.owner_id);
          if (existing) {
            await existing.replaceFace(row.storage_path);
            return;
          }

          try {
            const faceUrl = await storageService.getPhotoUrl(row.storage_path);
            const faceTexture = await Assets.load(faceUrl);
            if (!isMounted) return;

            const position = randSpawn();
            const settings = row.accessorySettings;
            const selectedAccessory = settings?.selected_accessory ?? null;
            const accTex = selectedAccessory
              ? accessoryTextures[selectedAccessory]
              : undefined;

            const handle = createWalker(
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
              selectedAccessory && accTex
                ? {
                    accessory: selectedAccessory,
                    texture: accTex,
                    leftEyePoint: row.left_eye_point ?? undefined,
                    rightEyePoint: row.right_eye_point ?? undefined,
                    foreheadTopPoint: row.forehead_top_point ?? undefined,
                    relativeX: settings?.relative_x ?? 0,
                    relativeY: settings?.relative_y ?? 0,
                    scale: settings?.scale ?? 1,
                  }
                : undefined,
            );

            walkersMap.set(row.owner_id, handle);
          } catch (error) {
            console.error(
              `[PixiHub] Failed to load character for ${row.id}:`,
              error,
            );
          }
        }

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

              await Promise.all(rows.map(spawnWalker));

              if (!pagination.hasMore) break;
              offset = pagination.offset;
            } catch (error) {
              console.error("[PixiHub] Failed to fetch batch:", error);
              break;
            }
          }
        };

        loadBatches();

        app.ticker.add((time) => {
          walkersMap.forEach((handle) => handle.tick(time.deltaTime));
        });

        // Expose imperative API to realtime subscription effect
        addWalkerRef.current = spawnWalker;

        replaceFaceRef.current = async (ownerId: string, storagePath: string) => {
          const handle = walkersMap.get(ownerId);
          if (!handle) return;
          await handle.replaceFace(storagePath);
        };

        updateAccRef.current = (ownerId: string, settings: AccessorySettings) => {
          const handle = walkersMap.get(ownerId);
          if (!handle) return;
          const accTex = settings.selected_accessory
            ? accessoryTextures[settings.selected_accessory]
            : undefined;
          handle.replaceAccessory(
            settings.selected_accessory && accTex
              ? {
                  accessory: settings.selected_accessory,
                  texture: accTex,
                  relativeX: settings.relative_x,
                  relativeY: settings.relative_y,
                  scale: settings.scale,
                }
              : undefined,
          );
        };
      } catch (err) {
        console.error("Failed to initialize Pixi app:", err);
      }
    };

    initPixiApp();

    return () => {
      isMounted = false;
      addWalkerRef.current = null;
      updateAccRef.current = null;
      replaceFaceRef.current = null;
      if (appRef.current) {
        appRef.current.destroy();
        appRef.current = null;
      }
    };
  }, [transitionTo]);

  useEffect(() => {
    if (!orgId) return;

    const unsubImages = hubRealtimeService.subscribeToNewCroppedImages(
      orgId,
      (row) => {
        addWalkerRef.current?.(row);
      },
    );

    const unsubAcc = hubRealtimeService.subscribeToAccessoryUpdates(
      orgId,
      (ownerId, settings) => {
        updateAccRef.current?.(ownerId, settings);
      },
    );

    const unsubFaceUpdates = hubRealtimeService.subscribeToProfilePictureUpdates(
      orgId,
      (ownerId, storagePath) => {
        replaceFaceRef.current?.(ownerId, storagePath);
      },
    );

    return () => {
      unsubImages();
      unsubAcc();
      unsubFaceUpdates();
    };
  }, [orgId]);

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
