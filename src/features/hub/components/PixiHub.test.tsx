import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomId } from "@/features/hub/rooms/rooms";
import { PixiHub } from "./PixiHub";

type Listener = (event: unknown) => void;

const pixi = vi.hoisted(() => ({
  containers: [] as unknown[],
  tickers: [] as ((time: { deltaTime: number }) => void)[],
}));

const batch = vi.hoisted(() => ({
  rows: [
    {
      id: "image-1",
      owner_id: "owner-1",
      storage_path: "faces/owner-1.png",
      centroid_point: { x: 0, y: 0 },
    },
  ] as Array<Record<string, unknown>>,
}));

const cursorStateRef = vi.hoisted(() => ({
  current: { x: 0, y: 0, visible: false, isPinched: false },
}));

vi.mock("@/core/cv/cursor/CvCursorEnabledContext", () => ({
  useCvCursorEnabled: () => ({ cursorStateRef }),
}));

vi.mock("pixi.js", () => {
  const makePoint = () => ({
    x: 0,
    y: 0,
    set(x: number, y: number) {
      this.x = x;
      this.y = y;
    },
    copyFrom(other: { x: number; y: number }) {
      this.x = other.x;
      this.y = other.y;
    },
  });

  class Container {
    x = 0;
    y = 0;
    rotation = 0;
    zIndex = 0;
    visible = true;
    eventMode = "passive";
    sortableChildren = false;
    children: Container[] = [];
    pivot = makePoint();
    position = makePoint();
    listeners = new Map<string, Listener>();
    constructor() {
      pixi.containers.push(this);
    }
    addChild(...children: Container[]) {
      this.children.push(...children);
    }
    removeChild() {}
    destroy() {}
    on(type: string, listener: Listener) {
      this.listeners.set(type, listener);
    }
  }

  class Sprite extends Container {
    anchor = makePoint();
    scale = makePoint();
    width = 100;
    height = 100;
    cursor = "";
    tint = 0;
    texture: unknown;
    constructor(texture: unknown) {
      super();
      this.texture = texture;
    }
  }

  class Application {
    canvas = document.createElement("canvas");
    screen = { width: 1920, height: 1080 };
    stage = new Container();
    ticker = {
      add: (callback: (time: { deltaTime: number }) => void) => pixi.tickers.push(callback),
    };
    renderer = {
      events: {
        mapPositionToPoint(point: { x: number; y: number }, x: number, y: number) {
          point.x = x;
          point.y = y;
        },
      },
    };
    async init() {}
    destroy() {}
  }

  return {
    Application,
    Container,
    Sprite,
    Point: class {
      x = 0;
      y = 0;
    },
    Texture: { WHITE: { width: 325, height: 250 } },
    Assets: { load: async () => ({ width: 325, height: 250 }) },
  };
});

vi.mock("@/core/state-machine", () => ({
  useAppState: () => ({ transitionTo: stableTransitionTo }),
}));
const stableTransitionTo = vi.hoisted(() => () => {});
vi.mock("@/shared/components", () => ({ ExitButton: () => null }));
vi.mock("@/core/supabase/storage", () => ({
  storageService: { getPhotoUrl: async () => "face.png" },
}));
vi.mock("@/features/hub/services/hubRealtimeService", () => ({
  hubRealtimeService: {
    subscribeToNewCroppedImages: () => () => {},
    subscribeToAccessoryUpdates: () => () => {},
    subscribeToProfilePictureUpdates: () => () => {},
  },
}));
vi.mock("@/features/hub/rooms/rooms", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/hub/rooms/rooms")>()),
  assignRoom: () => "main",
}));
vi.mock("@/features/hub/services/croppedImageService", () => ({
  croppedImageService: {
    getPaginatedCroppedImages: async () => ({
      rows: batch.rows,
      pagination: { hasMore: false, offset: 1 },
    }),
  },
}));

interface FakeContainer {
  rotation: number;
  zIndex: number;
  eventMode: string;
  cursor?: string;
  x: number;
  y: number;
  children: FakeContainer[];
  listeners: Map<string, Listener>;
}

const fireWindow = (type: string, x: number, y: number) => {
  const event = new MouseEvent(type, { clientX: x, clientY: y });
  Object.defineProperty(event, "pointerId", { value: 1 });
  window.dispatchEvent(event);
};

const runFrames = (count: number) => {
  act(() => {
    for (let i = 0; i < count; i++) pixi.tickers.forEach((tick) => tick({ deltaTime: 1 }));
  });
};

describe("PixiHub walker press", () => {
  let now = 0;
  let group: FakeContainer;
  const onCharacterClick = vi.fn();
  const onRoomChange = vi.fn();
  let rerenderInRoom: (roomId: RoomId) => void;

  const press = (x = 500, y = 500, button = 0) => {
    group.listeners.get("pointerdown")?.({ button, pointerId: 1, global: { x, y } });
  };

  /** What CvCursorOverlay does on a pinch: an untrusted press, and a pointerup 50 ms later. */
  const pinch = (x = 500, y = 500) => {
    cursorStateRef.current = { x, y, visible: true, isPinched: true };
    group.listeners.get("pointerdown")?.({
      button: 0,
      pointerId: 1,
      global: { x, y },
      nativeEvent: { isTrusted: false },
    });
    now += 50;
    fireWindow("pointerup", x, y);
  };

  const moveHand = (x: number, y: number) => {
    cursorStateRef.current = { x, y, visible: true, isPinched: true };
  };

  const unpinch = () => {
    cursorStateRef.current = { ...cursorStateRef.current, isPinched: false };
  };

  beforeEach(async () => {
    now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    pixi.containers.length = 0;
    pixi.tickers.length = 0;
    onCharacterClick.mockClear();
    onRoomChange.mockClear();

    const hub = (roomId: RoomId) => (
      <PixiHub
        onCharacterClick={onCharacterClick}
        orgId="org-1"
        roomId={roomId}
        onRoomChange={onRoomChange}
      />
    );
    const view = render(hub("main"));
    rerenderInRoom = (roomId) => view.rerender(hub(roomId));
    await waitFor(() => {
      const found = (pixi.containers as FakeContainer[]).find((c) =>
        c.listeners.has("pointerdown"),
      );
      expect(found).toBeDefined();
      group = found as FakeContainer;
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens the profile on a quick click and release", () => {
    press();
    now += 80;
    fireWindow("pointerup", 500, 500);

    expect(onCharacterClick).toHaveBeenCalledTimes(1);
    expect(onCharacterClick).toHaveBeenCalledWith({
      owner_id: "owner-1",
      cropped_image_id: "image-1",
      storage_path: "faces/owner-1.png",
    });
  });

  it("does not open the profile on press alone", () => {
    press();
    expect(onCharacterClick).not.toHaveBeenCalled();
  });

  it("carries the walker and does not open the profile on a drag", () => {
    const body = group.children[0];
    runFrames(1);
    press(500, 500);
    now += 20;
    fireWindow("pointermove", 800, 300);
    runFrames(1);
    const startX = body.x;
    fireWindow("pointermove", 900, 300);
    runFrames(1);
    expect(body.x).toBeCloseTo(startX + 100);

    fireWindow("pointerup", 900, 300);
    expect(onCharacterClick).not.toHaveBeenCalled();
  });

  it("does not open the profile after a long press that never moves", () => {
    press();
    now += 500;
    runFrames(1);
    fireWindow("pointerup", 500, 500);
    expect(onCharacterClick).not.toHaveBeenCalled();
  });

  it("does not open the profile when the slow release comes before the next frame", () => {
    press();
    now += 500;
    fireWindow("pointerup", 500, 500);
    expect(onCharacterClick).not.toHaveBeenCalled();
  });

  it("ignores non-primary buttons", () => {
    press(500, 500, 2);
    fireWindow("pointerup", 500, 500);
    expect(onCharacterClick).not.toHaveBeenCalled();
  });

  it("does not count a cancelled press as a click", () => {
    press();
    fireWindow("pointercancel", 500, 500);
    fireWindow("pointerup", 500, 500);
    expect(onCharacterClick).not.toHaveBeenCalled();
  });

  it("sways and draws on top while held, then settles after the drop", () => {
    press();
    now += 300;
    runFrames(40);
    expect(Math.abs(group.rotation)).toBeGreaterThan(0.01);
    expect(group.zIndex).toBeGreaterThan(1080);

    fireWindow("pointerup", 500, 500);
    runFrames(120);
    expect(group.rotation).toBe(0);
    expect(group.zIndex).toBeLessThanOrEqual(1080);
  });

  it("lets the body and the face grab the walker", () => {
    expect(group.eventMode).toBe("static");
    const [body, face] = group.children;
    expect(body.eventMode).toBe("static");
    expect(face.eventMode).toBe("static");
    expect(body.cursor).toBe("grab");
  });

  describe("carrying through a screen edge", () => {
    const RIGHT_EDGE = 1915;
    const LEFT_EDGE = 5;

    const pickUp = () => {
      press(500, 500);
      now += 20;
      fireWindow("pointermove", 800, 500);
      runFrames(1);
    };

    const moveTo = (x: number, y = 500) => {
      fireWindow("pointermove", x, y);
      runFrames(1);
    };

    /** Stay at the current spot long enough to cross an edge. */
    const dwell = () => {
      now += 300;
      runFrames(1);
    };

    const floorOf = (room: number) =>
      (pixi.containers as (FakeContainer & { sortableChildren: boolean })[]).filter(
        (container) => container.sortableChildren,
      )[room];

    it("takes the walker and the view into the room behind that edge, still held", () => {
      const body = group.children[0];
      pickUp();
      moveTo(RIGHT_EDGE);
      dwell();

      expect(onRoomChange).toHaveBeenCalledTimes(1);
      expect(onRoomChange).toHaveBeenCalledWith("east");
      expect(floorOf(4).children).toContain(group);

      rerenderInRoom("east");
      moveTo(1000);
      expect(body.x).toBeLessThan(1500);
      expect(group.zIndex).toBeGreaterThan(1080);

      fireWindow("pointerup", 1000, 500);
      expect(onCharacterClick).not.toHaveBeenCalled();
    });

    it("leaves the room it came from, so going back there doesn't simulate it", () => {
      const body = group.children[0];
      pickUp();
      moveTo(RIGHT_EDGE);
      dwell();
      rerenderInRoom("east");
      fireWindow("pointerup", RIGHT_EDGE, 500);

      // Dropped mid-air: it would keep falling if main still simulated it.
      rerenderInRoom("main");
      const frozenY = body.y;
      runFrames(5);
      expect(body.y).toBe(frozenY);
    });

    it("does not change rooms when the pointer only passes the edge", () => {
      pickUp();
      moveTo(RIGHT_EDGE);
      now += 100;
      moveTo(1000);
      now += 300;
      runFrames(1);
      expect(onRoomChange).not.toHaveBeenCalled();
    });

    it("does not change rooms when released at the edge before the wait ends", () => {
      pickUp();
      moveTo(RIGHT_EDGE);
      fireWindow("pointerup", RIGHT_EDGE, 500);
      dwell();
      expect(onRoomChange).not.toHaveBeenCalled();
    });

    it("ignores edges without a door in the current room", () => {
      pickUp();
      moveTo(RIGHT_EDGE);
      dwell();
      moveTo(900, 5);
      dwell();
      expect(onRoomChange).toHaveBeenCalledTimes(1);
    });

    it("waits for the pointer to leave the edge before going on to the next room", () => {
      pickUp();
      moveTo(RIGHT_EDGE);
      dwell();
      moveTo(1000);
      moveTo(LEFT_EDGE);
      dwell();
      expect(onRoomChange).toHaveBeenLastCalledWith("main");

      dwell();
      dwell();
      expect(onRoomChange).toHaveBeenCalledTimes(2);

      moveTo(1000);
      moveTo(LEFT_EDGE);
      dwell();
      expect(onRoomChange).toHaveBeenLastCalledWith("west");
    });

    it("does not carry a walker grabbed at the edge until it has left the edge", () => {
      press(RIGHT_EDGE, 500);
      now += 300;
      runFrames(1);
      dwell();
      expect(onRoomChange).not.toHaveBeenCalled();

      moveTo(1000);
      moveTo(RIGHT_EDGE);
      dwell();
      expect(onRoomChange).toHaveBeenCalledWith("east");
    });

    it("never moves a press that is still a click", () => {
      press(RIGHT_EDGE, 500);
      fireWindow("pointerup", RIGHT_EDGE, 500);
      expect(onCharacterClick).toHaveBeenCalledTimes(1);
      expect(onRoomChange).not.toHaveBeenCalled();
    });

    it("still drops the walker when a door changes the room", () => {
      pickUp();
      rerenderInRoom("east");
      expect(floorOf(0).children).toContain(group);
      expect(floorOf(4).children).not.toContain(group);

      // East's door is on its left edge: with the press over, nothing is carried back through it.
      moveTo(1000);
      moveTo(LEFT_EDGE);
      dwell();
      expect(onRoomChange).not.toHaveBeenCalled();
    });

    it("works with the hand cursor", () => {
      pinch();
      moveHand(800, 500);
      runFrames(1);
      moveHand(RIGHT_EDGE, 500);
      runFrames(1);
      dwell();
      expect(onRoomChange).toHaveBeenCalledWith("east");
      expect(floorOf(4).children).toContain(group);

      unpinch();
      now += 150;
      runFrames(1);
      expect(onCharacterClick).not.toHaveBeenCalled();
    });
  });

  describe("with the CV hand cursor", () => {
    it("opens the profile on a quick pinch, once the pinch actually ends", () => {
      pinch();
      now += 150;
      runFrames(1);
      expect(onCharacterClick).not.toHaveBeenCalled();

      unpinch();
      runFrames(1);
      expect(onCharacterClick).not.toHaveBeenCalled();
      now += 150;
      runFrames(1);
      expect(onCharacterClick).toHaveBeenCalledTimes(1);
    });

    it("still counts as a click when thumb movement nudges the cursor", () => {
      pinch();
      moveHand(520, 510);
      runFrames(1);
      expect(group.zIndex).toBeLessThanOrEqual(1080);

      unpinch();
      now += 150;
      runFrames(1);
      expect(onCharacterClick).toHaveBeenCalledTimes(1);
    });

    it("does not count the wait for a real release towards becoming a drag", () => {
      pinch();
      now += 300;
      runFrames(1);
      unpinch();
      runFrames(1);
      now += 300;
      runFrames(1);
      expect(onCharacterClick).toHaveBeenCalledTimes(1);
      expect(group.zIndex).toBeLessThanOrEqual(1080);
    });

    it("carries the walker while pinched and moving, without opening the profile", () => {
      const body = group.children[0];
      runFrames(1);
      pinch();
      moveHand(800, 300);
      runFrames(1);
      const startX = body.x;
      moveHand(900, 300);
      runFrames(1);
      expect(body.x).toBeCloseTo(startX + 100);
      expect(group.zIndex).toBeGreaterThan(1080);

      unpinch();
      now += 150;
      runFrames(1);
      expect(group.zIndex).toBeLessThanOrEqual(1080);
      expect(onCharacterClick).not.toHaveBeenCalled();
    });

    it("picks up on a long pinch that never moves, and sways", () => {
      pinch();
      now += 500;
      runFrames(40);
      expect(Math.abs(group.rotation)).toBeGreaterThan(0.01);

      unpinch();
      now += 150;
      runFrames(1);
      expect(onCharacterClick).not.toHaveBeenCalled();
    });

    it("keeps holding through a brief tracking dropout", () => {
      pinch();
      now += 500;
      runFrames(1);

      unpinch();
      now += 100;
      runFrames(1);
      expect(group.zIndex).toBeGreaterThan(1080);

      moveHand(500, 500);
      runFrames(1);
      now += 200;
      runFrames(1);
      expect(group.zIndex).toBeGreaterThan(1080);
      expect(onCharacterClick).not.toHaveBeenCalled();
    });
  });
});

describe("PixiHub spawning", () => {
  const originalRows = [...batch.rows];

  afterEach(() => {
    cleanup();
    batch.rows = [...originalRows];
  });

  const renderHub = () =>
    render(
      <PixiHub
        onCharacterClick={vi.fn()}
        orgId="org-1"
        roomId="main"
        onRoomChange={vi.fn()}
      />,
    );

  const walkerCount = () =>
    (pixi.containers as FakeContainer[]).filter((c) => c.listeners.has("pointerdown")).length;

  const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

  it("spawns one walker for a single row", async () => {
    pixi.containers.length = 0;
    renderHub();
    await settle();
    expect(walkerCount()).toBe(1);
  });

  it("spawns one walker when a batch holds two rows for the same owner", async () => {
    batch.rows = [
      ...originalRows,
      { ...originalRows[0], id: "image-2", storage_path: "faces/owner-1-new.png" },
    ];
    pixi.containers.length = 0;
    renderHub();
    await settle();
    expect(walkerCount()).toBe(1);
  });
});
