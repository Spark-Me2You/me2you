import React, { useEffect, useRef } from "react";
import { Application, Assets, Container, Sprite, Texture } from "pixi.js";
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
import { ROOMS, ROOM_IDS, assignRoom, type RoomId } from "@/features/hub/rooms/rooms";
import {
  bounceAngle,
  findContacts,
  overlapsAny,
  separate,
  type CollisionBox,
} from "@/features/hub/physics/collision";
import { InteractionScheduler } from "@/features/hub/interactions/interactionScheduler";
import { HUB_INTERACTIONS } from "@/features/hub/interactions/registry";
import type { InteractionActor } from "@/features/hub/interactions/types";
import { RoomDoors } from "./RoomDoors";

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
  roomId: RoomId;
  tick: (dt: number) => void;
  replaceAccessory: (options?: AccessoryOptions) => void;
  replaceFace: (storagePath: string) => Promise<void>;
  /** Box around body + head at the walker's ground position (ignores jump height). */
  collisionBox: () => CollisionBox;
  /** Shift the ground position, clamped to the walkable floor. */
  moveGround: (dx: number, dy: number) => void;
  /** Turn away from an obstacle; the normal points from the obstacle to this walker. */
  bounce: (normalX: number, normalY: number) => void;
  actor: InteractionActor;
}

interface RoomLayer {
  root: Container;
  /** Walkers only, depth-sorted by ground y. */
  floor: Container;
  walkers: WalkerHandle[];
}

export const PixiHub: React.FC<{
  onCharacterClick?: (data: CharacterClickData) => void;
  orgId: string;
  roomId: RoomId;
  onRoomChange: (roomId: RoomId) => void;
}> = ({ onCharacterClick, orgId, roomId, onRoomChange }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const addWalkerRef = useRef<((row: CroppedImageRow) => Promise<void>) | null>(null);
  const updateAccRef = useRef<((ownerId: string, settings: AccessorySettings) => void) | null>(null);
  const replaceFaceRef = useRef<((ownerId: string, storagePath: string) => Promise<void>) | null>(null);
  const showRoomRef = useRef<((roomId: RoomId) => void) | null>(null);
  const roomIdRef = useRef(roomId);
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

        const bgPaths = [...new Set(ROOM_IDS.map((id) => ROOMS[id].background))];
        const bgTextures = new Map<string, Texture>(
          await Promise.all(
            bgPaths.map(async (path) => [path, await Assets.load(path)] as const),
          ),
        );
        if (!isMounted) {
          app.destroy();
          return;
        }

        // One layer per room; only the active one is visible and ticked.
        const rooms = {} as Record<RoomId, RoomLayer>;
        for (const id of ROOM_IDS) {
          const root = new Container();
          const bg = new Sprite(bgTextures.get(ROOMS[id].background));
          bg.tint = ROOMS[id].tint;
          bg.width = app.screen.width;
          bg.height = app.screen.height;
          const floor = new Container();
          floor.sortableChildren = true;
          root.addChild(bg, floor);
          root.visible = id === roomIdRef.current;
          app.stage.addChild(root);
          rooms[id] = { root, floor, walkers: [] };
        }
        let activeRoom: RoomId = roomIdRef.current;

        const IDLE_FRAME_DURATION = 60 / 4;
        const WALK_FRAME_DURATION = 60 / 6;
        const BODY_SCALE = MII_BODY_SCALE;
        const FACE_SCALE = MII_FACE_SCALE;
        const HEAD_OFFSET_X = MII_HEAD_OFFSET_X;
        const HEAD_OFFSET_Y = MII_HEAD_OFFSET_Y;
        /** Share of the body frame's width that is the character rather than transparent padding. */
        const COLLIDER_WIDTH_FACTOR = 0.6;
        const FLOOR_MARGIN = 40;

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
          roomId: RoomId,
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
          // Body, face and accessory share a group so the room floor can depth-sort them together.
          const group = new Container();
          rooms[roomId].floor.addChild(group);

          const walker = new Sprite(texture);
          walker.anchor.set(0.5, 1);
          walker.scale.set(BODY_SCALE);
          group.addChild(walker);

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
            group.addChild(faceSprite);
          }

          let accessorySprite: Sprite | null = null;
          let accOffsetX = 0;
          let accOffsetY = 0;
          let accRelativeToFace = true;
          let accUseBalloonHandAnchor = false;
          let accBaseRotation = 0;

          function applyAccessoryOptions(options?: AccessoryOptions) {
            if (accessorySprite) {
              group.removeChild(accessorySprite);
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
              group.addChild(accessorySprite);

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

          // Set while an interaction drives this walker (see interactions/).
          let controlled = false;
          let offsetX = 0;
          let offsetY = 0;
          let poseRotation = 0;

          function clampToFloor() {
            const yMin = app.screen.height / 3;
            wx = Math.min(Math.max(wx, FLOOR_MARGIN), app.screen.width - FLOOR_MARGIN);
            wy = Math.min(Math.max(wy, yMin), app.screen.height - FLOOR_MARGIN);
          }

          function advanceIdleFrames(dt: number) {
            if (!idleFrames) return;
            idleFrameTimer += dt;
            if (idleFrameTimer >= IDLE_FRAME_DURATION) {
              idleFrameTimer -= IDLE_FRAME_DURATION;
              idleFrameIndex = (idleFrameIndex + 1) % idleFrames.length;
              walker.texture = idleFrames[idleFrameIndex];
            }
          }

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

          /** The walker's own idle / walk / jump loop. */
          function tickSelf(dt: number) {
            stateTimer -= dt;
            if (stateTimer <= 0) pickState();

            if (state === "walk") {
              angle += (Math.random() - 0.5) * 0.02 * dt;
              wx += Math.cos(angle) * speed * dt;
              wy += Math.sin(angle) * speed * dt;

              const M = FLOOR_MARGIN;
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
              advanceIdleFrames(dt);
            }

            walker.x = wx;
            if (state === "walk") {
              walker.rotation = Math.sin(bobPhase * 0.5) * 0.04;
            }
          }

          function tick(dt: number) {
            if (controlled) {
              walker.x = wx + offsetX;
              walker.y = wy + offsetY;
              walker.rotation = poseRotation;
              advanceIdleFrames(dt);
            } else {
              tickSelf(dt);
            }
            group.zIndex = wy;

            const bobRotation = controlled
              ? poseRotation
              : state === "walk"
                ? Math.sin(bobPhase * 0.5) * 0.04
                : 0;

            if (faceSprite) {
              faceSprite.x = walker.x + HEAD_OFFSET_X;
              faceSprite.y = walker.y + HEAD_OFFSET_Y;
              faceSprite.rotation = bobRotation;
            }

            if (accessorySprite) {
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

          function collisionBox(): CollisionBox {
            const bodyHalfWidth = (walker.texture.width * BODY_SCALE) / 2;
            const faceHalfWidth = faceSprite ? faceSprite.width / 2 : 0;
            const halfWidth = Math.max(bodyHalfWidth, faceHalfWidth) * COLLIDER_WIDTH_FACTOR;
            const bodyTop = wy - walker.texture.height * BODY_SCALE;
            const headTop = faceSprite
              ? wy + HEAD_OFFSET_Y - faceSprite.height / 2
              : bodyTop;
            const top = Math.min(bodyTop, headTop);
            return {
              x: wx,
              y: (top + wy) / 2,
              halfWidth,
              halfHeight: (wy - top) / 2,
              isStatic: controlled,
            };
          }

          function moveGround(dx: number, dy: number) {
            wx += dx;
            wy += dy;
            clampToFloor();
          }

          function bounce(normalX: number, normalY: number) {
            if (state === "walk") angle = bounceAngle(angle, normalX, normalY);
          }

          const actor: InteractionActor = {
            id: ownerId ?? "",
            get x() {
              return wx;
            },
            get y() {
              return wy;
            },
            get isBusy() {
              return state === "jump";
            },
            setControlled(next) {
              if (next === controlled) return;
              controlled = next;
              if (!controlled) {
                pickState();
              } else if (idleFrames) {
                idleFrameIndex = 0;
                idleFrameTimer = 0;
                walker.texture = idleFrames[0];
              }
            },
            setOffset(dx, dy) {
              offsetX = dx;
              offsetY = dy;
            },
            setRotation(radians) {
              poseRotation = radians;
            },
          };

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
            roomId,
            tick,
            replaceAccessory: applyAccessoryOptions,
            replaceFace,
            collisionBox,
            moveGround,
            bounce,
            actor,
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

        const SPAWN_ATTEMPTS = 12;

        /** Re-roll a new walker's position until it doesn't overlap anyone already in the room. */
        function placeWithoutOverlap(handle: WalkerHandle, others: WalkerHandle[]) {
          const boxes = others.map((other) => other.collisionBox());
          for (let i = 0; i < SPAWN_ATTEMPTS; i++) {
            const box = handle.collisionBox();
            if (!overlapsAny(box, boxes)) return;
            const next = randSpawn();
            handle.moveGround(next.x - box.x, next.y - (box.y + box.halfHeight));
          }
          // Room is crowded: leave it where it is and let collisions push it clear.
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

            const roomId = assignRoom(row.owner_id);
            const position = randSpawn();
            const settings = row.accessorySettings;
            const selectedAccessory = settings?.selected_accessory ?? null;
            const accTex = selectedAccessory
              ? accessoryTextures[selectedAccessory]
              : undefined;

            const handle = createWalker(
              roomId,
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

            placeWithoutOverlap(handle, rooms[roomId].walkers);
            rooms[roomId].walkers.push(handle);
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

        /** Push overlapping walkers apart and turn them away from each other. */
        function resolveCollisions(walkers: WalkerHandle[]) {
          const boxes = walkers.map((walker) => walker.collisionBox());
          const contacts = findContacts(boxes);
          if (contacts.length === 0) return;

          const before = boxes.map((box) => ({ x: box.x, y: box.y }));
          separate(boxes, contacts);
          boxes.forEach((box, i) => {
            const dx = box.x - before[i].x;
            const dy = box.y - before[i].y;
            if (dx !== 0 || dy !== 0) walkers[i].moveGround(dx, dy);
          });
          contacts.forEach(({ a, b, normalX, normalY }) => {
            walkers[a].bounce(-normalX, -normalY);
            walkers[b].bounce(normalX, normalY);
          });
        }

        const interactions = new InteractionScheduler(HUB_INTERACTIONS);

        // Only the visible room is simulated; walkers elsewhere wait where they were left.
        app.ticker.add((time) => {
          const walkers = rooms[activeRoom].walkers;
          walkers.forEach((handle) => handle.tick(time.deltaTime));
          resolveCollisions(walkers);
          interactions.tick(
            time.deltaTime,
            walkers.map((handle) => handle.actor),
          );
        });

        showRoomRef.current = (nextRoom: RoomId) => {
          if (nextRoom === activeRoom) return;
          interactions.cancelAll();
          rooms[activeRoom].root.visible = false;
          rooms[nextRoom].root.visible = true;
          activeRoom = nextRoom;
        };

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
      showRoomRef.current = null;
      if (appRef.current) {
        appRef.current.destroy();
        appRef.current = null;
      }
    };
  }, [transitionTo]);

  useEffect(() => {
    roomIdRef.current = roomId;
    showRoomRef.current?.(roomId);
  }, [roomId]);

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
      <RoomDoors roomId={roomId} onEnter={onRoomChange} />
    </div>
  );
};
