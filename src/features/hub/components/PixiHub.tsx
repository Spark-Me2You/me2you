import React, { useEffect, useRef } from "react";
import {
  Application,
  Assets,
  Container,
  Point,
  Sprite,
  Texture,
  type FederatedPointerEvent,
} from "pixi.js";
import type { Accessory } from "@/core/auth/AuthContext";
import { useCvCursorEnabled } from "@/core/cv/cursor/CvCursorEnabledContext";
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
import {
  EdgeDwell,
  HAND_PRESS_LIMITS,
  HAND_RELEASE_GRACE_MS,
  HOLD_LIFT,
  MOUSE_PRESS_LIMITS,
  PressGesture,
  doorEdgeAt,
  getHeldPose,
  swayAngle,
} from "@/features/hub/drag/walkerDrag";
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
  /** Lift the walker off the floor; it stays attached to the pointer until `drop`. */
  pickUp: (pointerX: number, pointerY: number) => void;
  /** Move a held walker's pointer. */
  holdAt: (pointerX: number, pointerY: number) => void;
  /** Let a held walker fall back to the floor. */
  drop: () => void;
  isHeld: () => boolean;
  /** Put the walker on another room's floor. */
  moveToRoom: (roomId: RoomId) => void;
}

interface WalkerPress {
  handle: WalkerHandle;
  gesture: PressGesture;
  edge: EdgeDwell;
  pointerId: number;
  /** Started by the CV hand cursor, so it lasts as long as the pinch, not the pointer events. */
  isHand: boolean;
  lastPinchedAt: number;
  x: number;
  y: number;
  clickData: CharacterClickData;
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
  const { cursorStateRef } = useCvCursorEnabled();

  useEffect(() => {
    let isMounted = true;
    let removePressListeners: (() => void) | null = null;

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
        /** Above any ground y, so a held walker draws over everyone in the room. */
        const HELD_Z_INDEX = 1_000_000;
        const LIFT_EASE = 0.2;
        const SWAY_SETTLE = 0.85;

        /** The press in progress. Tracked on `window` so a release anywhere ends it. */
        let press: WalkerPress | null = null;

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

          // Set while the pointer is holding this walker.
          let held = false;

          /** Body, face and accessory all grab the walker; presses bubble up to `group`. */
          function makeGrabbable(sprite: Sprite) {
            if (!ownerId) return;
            sprite.eventMode = "static";
            sprite.cursor = held ? "grabbing" : "grab";
          }

          makeGrabbable(walker);

          let faceSprite: Sprite | null = null;
          if (faceTexture && centroidPoint) {
            faceSprite = new Sprite(faceTexture);
            faceSprite.anchor.set(0.5, 0.5);
            faceSprite.scale.set(FACE_SCALE);
            makeGrabbable(faceSprite);
            group.addChild(faceSprite);
          }

          let accessorySprite: Sprite | null = null;
          let accOffsetX = 0;
          let accOffsetY = 0;
          let accRelativeToFace = true;
          let accUseBalloonHandAnchor = false;
          let accBaseRotation = 0;

          let pointerX = 0;
          let pointerY = 0;
          let grabOffsetX = 0;
          let grabOffsetY = 0;
          let lift = 0;
          let heldFrames = 0;

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
              makeGrabbable(accessorySprite);
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

          function setGrabCursor(cursor: "grab" | "grabbing") {
            walker.cursor = cursor;
            if (faceSprite) faceSprite.cursor = cursor;
            if (accessorySprite) accessorySprite.cursor = cursor;
          }

          /** Follow the pointer, swaying the whole group around the point that was grabbed. */
          function tickHeld(dt: number) {
            lift += (HOLD_LIFT - lift) * Math.min(1, LIFT_EASE * dt);
            heldFrames += dt;

            const pose = getHeldPose(pointerX + grabOffsetX, pointerY + grabOffsetY, lift, {
              minX: FLOOR_MARGIN,
              maxX: app.screen.width - FLOOR_MARGIN,
              minY: collisionBox().halfHeight * 2,
              floorTop: app.screen.height / 3,
              maxY: app.screen.height - FLOOR_MARGIN,
            });
            wx = pose.x;
            wy = pose.groundY;
            walker.x = pose.x;
            walker.y = pose.y;
            walker.rotation = 0;
            advanceIdleFrames(dt);

            group.pivot.set(pose.x - grabOffsetX, pose.y - grabOffsetY);
            group.position.copyFrom(group.pivot);
            group.rotation = swayAngle(heldFrames);
          }

          /** Ease out of the sway after a drop instead of snapping upright. */
          function settleSway(dt: number) {
            if (group.rotation === 0) return;
            group.rotation *= Math.pow(SWAY_SETTLE, dt);
            if (Math.abs(group.rotation) < 0.002) {
              group.rotation = 0;
              group.pivot.set(0, 0);
              group.position.set(0, 0);
            }
          }

          function tick(dt: number) {
            if (held) {
              tickHeld(dt);
            } else if (controlled) {
              walker.x = wx + offsetX;
              walker.y = wy + offsetY;
              walker.rotation = poseRotation;
              advanceIdleFrames(dt);
            } else {
              tickSelf(dt);
            }
            if (!held) settleSway(dt);
            group.zIndex = held ? HELD_Z_INDEX : wy;

            const bobRotation = held
              ? 0
              : controlled
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
              return held || state === "jump";
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

          const handle: WalkerHandle = {
            ownerId: ownerId ?? "",
            roomId,
            tick,
            replaceAccessory: applyAccessoryOptions,
            replaceFace,
            collisionBox,
            moveGround,
            bounce,
            actor,
            pickUp(x, y) {
              held = true;
              pointerX = x;
              pointerY = y;
              grabOffsetX = walker.x - x;
              grabOffsetY = walker.y - y;
              lift = 0;
              heldFrames = 0;
              idleFrameIndex = 0;
              idleFrameTimer = 0;
              if (idleFrames) walker.texture = idleFrames[0];
              setGrabCursor("grabbing");
            },
            holdAt(x, y) {
              pointerX = x;
              pointerY = y;
            },
            drop() {
              if (!held) return;
              held = false;
              // Reuse the jump's gravity: the fall starts from wherever the walker is hanging.
              state = "jump";
              speed = 0;
              jumpVY = 0;
              jumpY = Math.min(0, walker.y - wy);
              stateTimer = 999;
              setGrabCursor("grab");
            },
            isHeld: () => held,
            moveToRoom(nextRoom) {
              rooms[nextRoom].floor.addChild(group);
              handle.roomId = nextRoom;
            },
          };

          if (ownerId) {
            group.eventMode = "static";
            group.on("pointerdown", (event) =>
              beginPress(handle, event, {
                owner_id: ownerId,
                cropped_image_id: croppedImageId || "",
                storage_path: storagePath || "",
              }),
            );
          }

          return handle;
        }

        function beginPress(
          handle: WalkerHandle,
          event: FederatedPointerEvent,
          clickData: CharacterClickData,
        ) {
          if (press || event.button !== 0) return;
          const { x, y } = event.global;
          const now = performance.now();
          // CvCursorOverlay dispatches synthetic events; a real mouse's are always trusted.
          const isHand = (event.nativeEvent as Partial<Event> | undefined)?.isTrusted === false;
          press = {
            handle,
            gesture: new PressGesture(x, y, now, isHand ? HAND_PRESS_LIMITS : MOUSE_PRESS_LIMITS),
            edge: new EdgeDwell(doorEdgeUnder(x, y) !== null),
            pointerId: event.pointerId,
            isHand,
            lastPinchedAt: now,
            x,
            y,
            clickData,
          };
        }

        function doorEdgeUnder(x: number, y: number) {
          return doorEdgeAt(x, y, app.screen.width, app.screen.height, ROOMS[activeRoom].doors);
        }

        /** Holding a walker at an edge with a door takes it, and the view, into that room. */
        function carryThroughEdge(current: WalkerPress) {
          const side = current.edge.update(
            doorEdgeUnder(current.x, current.y),
            performance.now(),
          );
          const nextRoom = side && ROOMS[activeRoom].doors[side];
          if (!nextRoom) return;

          const walkers = rooms[activeRoom].walkers;
          walkers.splice(walkers.indexOf(current.handle), 1);
          rooms[nextRoom].walkers.push(current.handle);
          current.handle.moveToRoom(nextRoom);
          enterRoom(nextRoom);
          onRoomChange(nextRoom);
        }

        /** Advance the press; called on pointer movement and every frame (for hold time). */
        function updatePress(current: WalkerPress) {
          const started = current.gesture.update(current.x, current.y, performance.now());
          if (started) {
            interactions.cancelFor(current.handle.actor.id);
            current.handle.pickUp(current.x, current.y);
          }
          current.handle.holdAt(current.x, current.y);
        }

        /** End the press without counting it as a click (room change, lost pointer). */
        function cancelPress() {
          press?.handle.drop();
          press = null;
        }

        /** The release: a press that never became a drag is the click. */
        function finishPress(current: WalkerPress) {
          press = null;
          if (current.gesture.isDragging) current.handle.drop();
          else onCharacterClick?.(current.clickData);
        }

        const pointerPosition = new Point();

        function trackPointer(current: WalkerPress, clientX: number, clientY: number) {
          app.renderer.events.mapPositionToPoint(pointerPosition, clientX, clientY);
          current.x = pointerPosition.x;
          current.y = pointerPosition.y;
        }

        /**
         * Hand presses follow the live pinch. A pinch that drops out briefly is treated as still
         * held, and the time it spent released doesn't count towards becoming a drag.
         */
        function updateHandPress(current: WalkerPress) {
          const cursor = cursorStateRef.current;
          const now = performance.now();
          if (cursor.isPinched) {
            current.lastPinchedAt = now;
            trackPointer(current, cursor.x, cursor.y);
            updatePress(current);
          } else if (now - current.lastPinchedAt >= HAND_RELEASE_GRACE_MS) {
            finishPress(current);
          }
        }

        function handlePressMove(event: PointerEvent) {
          if (!press || press.isHand || press.pointerId !== event.pointerId) return;
          trackPointer(press, event.clientX, event.clientY);
          updatePress(press);
        }

        function handlePressEnd(event: PointerEvent) {
          // The overlay's pointerup comes 50 ms into every pinch, so hand presses ignore it.
          if (!press || press.isHand || press.pointerId !== event.pointerId) return;
          const current = press;
          trackPointer(current, event.clientX, event.clientY);
          updatePress(current);
          finishPress(current);
        }

        function handlePressCancel(event: PointerEvent) {
          if (press?.pointerId === event.pointerId) cancelPress();
        }

        window.addEventListener("pointermove", handlePressMove);
        window.addEventListener("pointerup", handlePressEnd);
        window.addEventListener("pointercancel", handlePressCancel);
        window.addEventListener("blur", cancelPress);
        removePressListeners = () => {
          window.removeEventListener("pointermove", handlePressMove);
          window.removeEventListener("pointerup", handlePressEnd);
          window.removeEventListener("pointercancel", handlePressCancel);
          window.removeEventListener("blur", cancelPress);
        };

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

        // Spawns in flight, by owner. A second row for the same owner (duplicates in one
        // batch, or a realtime INSERT during the initial load) waits for the first spawn
        // and then takes the existing-walker path, instead of spawning a second sprite.
        const spawning = new Map<string, Promise<void>>();

        function spawnWalker(row: CroppedImageRow): Promise<void> {
          const pending = spawning.get(row.owner_id);
          if (pending) return pending.then(() => spawnWalker(row));

          const spawn = spawnWalkerUnguarded(row).finally(() => spawning.delete(row.owner_id));
          spawning.set(row.owner_id, spawn);
          return spawn;
        }

        async function spawnWalkerUnguarded(row: CroppedImageRow) {
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
          if (press?.isHand) updateHandPress(press);
          else if (press) updatePress(press);
          if (press?.handle.isHeld()) carryThroughEdge(press);
          const walkers = rooms[activeRoom].walkers;
          walkers.forEach((handle) => handle.tick(time.deltaTime));
          // A held walker is in the air, so it doesn't shove anyone on the floor.
          resolveCollisions(walkers.filter((handle) => !handle.isHeld()));
          interactions.tick(
            time.deltaTime,
            walkers.map((handle) => handle.actor),
          );
        });

        function enterRoom(nextRoom: RoomId) {
          interactions.cancelAll();
          rooms[activeRoom].root.visible = false;
          rooms[nextRoom].root.visible = true;
          activeRoom = nextRoom;
        }

        // A carried walker has already entered the room by the time the prop catches up, so this
        // returns early and the walker stays held.
        showRoomRef.current = (nextRoom: RoomId) => {
          if (nextRoom === activeRoom) return;
          cancelPress();
          enterRoom(nextRoom);
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
      removePressListeners?.();
      addWalkerRef.current = null;
      updateAccRef.current = null;
      replaceFaceRef.current = null;
      showRoomRef.current = null;
      if (appRef.current) {
        appRef.current.destroy();
        appRef.current = null;
      }
    };
  }, [transitionTo, cursorStateRef]);

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
    <div className="select-none" style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      <ExitButton onClick={handleClick} />
      <RoomDoors roomId={roomId} onEnter={onRoomChange} />
    </div>
  );
};
