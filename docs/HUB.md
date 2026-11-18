# Hub

The hub (kiosk `HUB` state, `src/features/hub/`) is a PixiJS scene where every registered user
walks around as a little character with their face and accessory. This doc covers the systems
layered on top of the walkers: **rooms**, **collision**, **dragging** and **interactions**.

```
HubView                     ← owns the active room (survives opening a profile card)
  PixiHub                   ← Pixi app, walkers, ticker
    RoomDoors               ← DOM door buttons over the canvas
  rooms/rooms.ts            ← room config + which room each person lives in
  physics/collision.ts      ← AABB contacts, separation, bounce (pure)
  drag/walkerDrag.ts        ← click vs. drag decision, sway, held position (pure)
  interactions/             ← paired animations: types, scheduler, registry
```

## Rooms

The hub is a small house: the main **spark** room with a door on each edge, and one room behind
each door (`meeting room` top, `staircase` bottom, `meeting room` left, `lobby` right). Each side room has one door,
on the opposite edge, leading back to spark.

- **Config** lives in `ROOMS` (`rooms/rooms.ts`): label, background image, placeholder tint,
  spawn weight and the doors. To add a room, add a `RoomId`, a `ROOMS` entry, and a door to it
  from an existing room. Door colors per destination are in `RoomDoors.tsx`.
- **Who is where.** `assignRoom(ownerId)` hashes the owner id (FNV-1a) into a room, weighted by
  `weight` (integers; main is 2, the others 1, so about a third of people are in spark). The same
  person is always in the same room on every kiosk, so visitors can go looking for a friend and
  find them again. Changing weights or adding rooms reshuffles people. Carrying someone to another
  room (see [Dragging](#dragging)) lasts until the hub reloads; it isn't saved.
- **Rendering.** `PixiHub` builds one `Container` per room (background + a depth-sorted `floor`).
  Only the active room is visible and simulated; walkers in other rooms freeze until you go in.
- **Navigation.** `RoomDoors` renders DOM buttons (clickable by the CV hand cursor). The active
  room is React state in `HubView`, passed down as `roomId` / `onRoomChange`, and pushed into Pixi
  through `showRoomRef`.

**TODO / ideas**

- Real art per room: replace `background` (side rooms use temporary `public/rooms/placeholder-*.png`; spark uses `bg_draft1.png`).
- A hint for searching, e.g. a head count on each door, or a "find me" button from the mobile
  profile page that tells you which room you are in.
- Transition animation between rooms (slide the old layer out in the door's direction).

## Collision

Walkers never overlap. Each one has an axis-aligned box (`WalkerHandle.collisionBox`) from its
feet to the top of its face, `COLLIDER_WIDTH_FACTOR` (0.6) of the body frame wide to skip the
transparent padding. Boxes use the ground position, so a jumping walker keeps its spot.

Every frame, after walkers move, `resolveCollisions` in `PixiHub`:

1. `findContacts` finds overlapping pairs (O(n²), fine for tens of walkers per room; swap in a
   spatial hash if rooms ever hold hundreds).
2. `separate` pushes each pair apart along the axis of least penetration, half each. Static
   boxes (walkers held by an interaction) don't move; the other walker takes the whole push.
3. `bounce` reflects a walking walker's heading off that axis, so they turn away from each other
   instead of grinding.

New walkers are placed with `placeWithoutOverlap`, which re-rolls the spawn point up to 12 times;
in a crowded room the per-frame separation takes over.

Tuning: `COLLIDER_WIDTH_FACTOR` and `FLOOR_MARGIN` in `PixiHub.tsx`. The pure functions are tested
in `physics/collision.test.ts`.

## Dragging

Press and hold any walker (body, face or accessory) to pick it up, move the pointer to carry it,
and release to drop it. A quick click and release opens the profile instead.

- **Click or drag.** `PressGesture` starts every press as a click and turns it into a drag once the
  pointer travels 8 px or the press lasts 200 ms (`MOUSE_PRESS_LIMITS`). It never turns back, and
  the profile opens only if the release comes first, so one press can't do both. The press is
  tracked on `window`, so a release over a door or off the canvas still ends it.
- **CV hand cursor.** A pinch on a walker works the same way, and is recognised because
  `CvCursorOverlay`'s events are untrusted. That overlay sends its release 50 ms into every pinch,
  so `PixiHub` ignores it and follows `cursorStateRef.isPinched` in the ticker instead. A hand
  can't hold the cursor as still as a mouse and pinches last longer than clicks, so hands get looser limits, 40 px and
  500 ms (`HAND_PRESS_LIMITS`). A pinch counts as released after `HAND_RELEASE_GRACE_MS` (150 ms),
  so a tracking dropout of a few frames doesn't drop the walker.
- **While held.** The walker rises `HOLD_LIFT`, draws over everyone, and sways via `swayAngle`.
  The sway rotates the walker's whole group around the point that was grabbed, which keeps the
  face and accessory attached. It can go anywhere on screen, and is skipped by collisions and by
  the interaction scheduler (`isBusy`); grabbing a walker mid-interaction cancels that interaction.
- **Carrying to another room.** Hold a walker within `EDGE_ZONE` (60 px) of an edge that has a door
  for `EDGE_DWELL_MS` (300 ms), and it and the view move to that room, still held and still at the
  pointer. `EdgeDwell` then requires the pointer to leave the edge before the next crossing, as it
  does for a walker grabbed at an edge. Edges without a door do nothing. Clicking a door button while
  holding a walker still drops it in the room being left.
- **Dropping.** The walker falls with the jump's gravity to the floor below it (or the floor's top
  edge if dropped above it), then normal collision pushes it clear of anyone it landed on.

The pure logic is tested in `drag/walkerDrag.test.ts`.

## Interactions (scaffolded, not implemented)

Every so often, two walkers standing near each other play a short animation together. The
framework runs today but **no interactions are registered**, so nothing happens yet.

**Pieces**

- `interactions/types.ts`
  - `InteractionActor`: what a walker exposes while it is being driven: position, `isBusy`,
    `setControlled` (pauses its own idle/walk/jump loop), `setOffset`, `setRotation`.
  - `InteractionDefinition`: `id`, `maxDistance`, `durationFrames`, `weight`, optional `canStart`
    / `start` / `end`, and `update(a, b, progress)` called every frame with progress in [0, 1].
- `interactions/interactionScheduler.ts`: `InteractionScheduler`. Every `checkIntervalFrames`
  (120) it rolls `startChance` (0.35); on success it picks a random pair of free walkers within a
  definition's `maxDistance`, picks a definition by weight, and runs it. Afterwards both walkers
  get a `cooldownFrames` (20 s) break. At most `maxConcurrent` (2) run at once. `cancelAll` runs
  when you change rooms.
- `interactions/registry.ts`: `HUB_INTERACTIONS`, the list the hub uses (empty), and
  `hopTemplate`, an unregistered example.

**Adding an interaction**

1. Write an `InteractionDefinition` (copy `hopTemplate`). Drive the pair only through the actor
   methods; offsets and rotation are reset when it ends.
2. Add it to `HUB_INTERACTIONS`.
3. Add a scheduler test if it has a `canStart` rule.

**Known gaps before real interactions land**

- Walkers can't turn to face each other: there are no mirrored idle frames. Add a
  `faceToward(x)` to `InteractionActor` once the art has left/right idle frames.
- No way to swap in interaction-specific frames (high five, wave). Add a
  `playFrames(textures, frameDuration)` actor method and load the frames next to `bodyFrames`.
- Walkers don't walk towards each other first. A `walkTo(x, y)` actor method plus a "approach"
  phase in the scheduler would let interactions start from further away.
- Interacting walkers are static colliders, so others bounce off them but they never get pushed.
