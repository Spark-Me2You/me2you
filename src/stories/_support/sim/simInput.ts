/**
 * Simulated CV input
 * Stands in for a person in front of the camera. The fake MediaPipe tasks read
 * this store when asked to detect a frame, so the real hooks (useCvCursor,
 * useGestureRecognition, usePoseDetection + useArmFlap) run unchanged.
 *
 * Controls (only in stories with `meta.cv`), also exposed as `window.__sim`:
 *   mouse move     -> pointing hand / cursor position
 *   mouse down     -> pinch (click, paint)
 *   H              -> toggle hand in frame
 *   1 / 2 / 3      -> hold peace sign / wave / thumbs up
 *   F / J          -> arm flap for the left / right player
 *   P              -> toggle the second player (2P games)
 */

export type SimGesture = 'Victory' | 'Open_Palm' | 'Thumb_Up' | 'None';

interface SimState {
  /** Screen position of the index fingertip, in CSS pixels. */
  hand: { present: boolean; x: number; y: number; pinched: boolean };
  gesture: SimGesture | null;
  /** Normalized camera x of each player's shoulder midpoint (raw, unmirrored). */
  players: { x: number; flapStartedAt: number }[];
  face: boolean;
}

export const sim: SimState = {
  hand: { present: false, x: 0, y: 0, pinched: false },
  gesture: null,
  players: [{ x: 0.5, flapStartedAt: 0 }],
  face: true,
};

export function resetSim() {
  sim.hand = { present: false, x: 0, y: 0, pinched: false };
  sim.gesture = null;
  sim.players = [{ x: 0.5, flapStartedAt: 0 }];
  sim.face = true;
}

export function flap(player = 0) {
  const p = sim.players[player];
  if (p) p.flapStartedAt = performance.now();
}

export function setTwoPlayers(enabled: boolean) {
  // The feed is mirrored: P1 (left of screen) stands at raw x > 0.5.
  sim.players = enabled
    ? [
        { x: 0.75, flapStartedAt: 0 },
        { x: 0.25, flapStartedAt: 0 },
      ]
    : [{ x: 0.5, flapStartedAt: 0 }];
}

// ---------------------------------------------------------------------------
// Landmark synthesis

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

const lm = (x: number, y: number): Landmark => ({ x, y, z: 0, visibility: 1 });

// Must match useCvCursor's usable hand range.
const HAND_X_MIN = 0.15;
const HAND_X_MAX = 0.85;
const HAND_Y_MIN = 0.15;
const HAND_Y_MAX = 0.75;

/** 21 hand landmarks in a pointing pose, index tip mapped back from screen space. */
export function handLandmarks(): Landmark[] | null {
  if (!sim.hand.present) return null;
  const normX = 1 - sim.hand.x / window.innerWidth;
  const normY = sim.hand.y / window.innerHeight;
  const tipX = HAND_X_MIN + normX * (HAND_X_MAX - HAND_X_MIN);
  const tipY = HAND_Y_MIN + normY * (HAND_Y_MAX - HAND_Y_MIN);

  const points = Array.from({ length: 21 }, () => lm(tipX, tipY + 0.2));
  const base = tipY + 0.12;
  points[5] = lm(tipX, base); // index MCP
  points[6] = lm(tipX, tipY + 0.06); // index PIP
  points[8] = lm(tipX, tipY); // index tip
  for (const [pip, tip, dx] of [
    [10, 12, 0.02],
    [14, 16, 0.04],
    [18, 20, 0.06],
  ]) {
    points[pip] = lm(tipX + dx, base);
    points[tip] = lm(tipX + dx, base + 0.03); // curled: tip below PIP
  }
  points[4] = sim.hand.pinched ? lm(tipX - 0.01, base + 0.01) : lm(tipX - 0.12, base + 0.02);
  return points;
}

const FLAP_DOWN_MS = 250;
const FLAP_UP_MS = 400;

function wristY(flapStartedAt: number, now: number): number {
  const t = now - flapStartedAt;
  if (t < 0 || t > FLAP_DOWN_MS + FLAP_UP_MS) return 0.4;
  if (t < FLAP_DOWN_MS) return 0.4 + 0.35 * (t / FLAP_DOWN_MS);
  return 0.75 - 0.35 * ((t - FLAP_DOWN_MS) / FLAP_UP_MS);
}

/** 33 pose landmarks per player, wrists animated by recent flaps. */
export function poseLandmarks(now = performance.now()): Landmark[][] {
  return sim.players.map(({ x, flapStartedAt }) => {
    const points = Array.from({ length: 33 }, () => lm(x, 0.5));
    const wy = wristY(flapStartedAt, now);
    points[0] = lm(x, 0.25); // nose
    points[11] = lm(x + 0.08, 0.4); // left shoulder
    points[12] = lm(x - 0.08, 0.4); // right shoulder
    points[13] = lm(x + 0.16, (0.4 + wy) / 2);
    points[14] = lm(x - 0.16, (0.4 + wy) / 2);
    points[15] = lm(x + 0.22, wy); // left wrist
    points[16] = lm(x - 0.22, wy); // right wrist
    points[23] = lm(x + 0.06, 0.7);
    points[24] = lm(x - 0.06, 0.7);
    return points;
  });
}

// ---------------------------------------------------------------------------
// Keyboard / mouse bindings

const GESTURE_KEYS: Record<string, SimGesture> = {
  Digit1: 'Victory',
  Digit2: 'Open_Palm',
  Digit3: 'Thumb_Up',
};

const BLOCKED_POINTER_EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick'];

/**
 * Ladle renders stories in the same document as its own UI (no iframe), so
 * input aimed at the sidebar, toolbar or addon dialogs must pass through untouched.
 */
const LADLE_CHROME = '.ladle-aside, .ladle-addons, .ladle-resize-handle, [data-reach-dialog-overlay]';

const inLadleChrome = (e: Event) => e.target instanceof Element && e.target.closest(LADLE_CHROME) !== null;

const isTextInput = (e: Event) =>
  e.target instanceof HTMLElement && (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName));

/**
 * Drives the sim from the real mouse and keyboard. Trusted clicks inside the
 * story are swallowed so it is operated only through the simulated hand, as on
 * the kiosk — otherwise each click would land twice (native + CV cursor).
 */
export function attachSimControls(options: { blockNativeClicks: boolean }): () => void {
  const onMove = (e: PointerEvent) => {
    // Pointing at Ladle's UI takes the hand out of frame.
    sim.hand.present = !inLadleChrome(e);
    if (!sim.hand.present) return;
    sim.hand.x = e.clientX;
    sim.hand.y = e.clientY;
  };
  const onLeave = () => {
    sim.hand.present = false;
  };
  const onDown = (e: PointerEvent) => {
    if (e.isTrusted && !inLadleChrome(e)) sim.hand.pinched = true;
  };
  const onUp = (e: PointerEvent) => {
    if (e.isTrusted) sim.hand.pinched = false;
  };
  const block = (e: Event) => {
    if (e.isTrusted && !inLadleChrome(e)) {
      e.stopPropagation();
      e.preventDefault();
    }
  };
  const onKeyDown = (e: KeyboardEvent) => {
    // Typing in Ladle's story search (or any text field) isn't sim input.
    if (e.repeat || isTextInput(e) || inLadleChrome(e)) return;
    if (GESTURE_KEYS[e.code]) sim.gesture = GESTURE_KEYS[e.code];
    else if (e.code === 'KeyH') sim.hand.present = !sim.hand.present;
    else if (e.code === 'KeyF') flap(0);
    else if (e.code === 'KeyJ') flap(1);
    else if (e.code === 'KeyP') setTwoPlayers(sim.players.length === 1);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (GESTURE_KEYS[e.code] === sim.gesture) sim.gesture = null;
  };

  window.addEventListener('pointermove', onMove, true);
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('pointerdown', onDown, true);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  if (options.blockNativeClicks) {
    BLOCKED_POINTER_EVENTS.forEach((type) => window.addEventListener(type, block, true));
  }

  const api = { sim, flap, setTwoPlayers, resetSim };
  (window as unknown as { __sim?: typeof api }).__sim = api;

  return () => {
    window.removeEventListener('pointermove', onMove, true);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('pointerdown', onDown, true);
    window.removeEventListener('pointerup', onUp, true);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    BLOCKED_POINTER_EVENTS.forEach((type) => window.removeEventListener(type, block, true));
    delete (window as unknown as { __sim?: typeof api }).__sim;
  };
}
