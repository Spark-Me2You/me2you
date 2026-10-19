import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

export type CursorVariant = "default" | "brush" | "hidden";

export interface SharedCursorState {
  x: number;
  y: number;
  visible: boolean;
  isPinched: boolean;
}

/**
 * Raw per-inference hand sample, written in place by useCvCursor on every
 * HandLandmarker result. Unlike SharedCursorState it is unsmoothed, reported
 * for any hand pose, and never goes through React state — for latency-critical
 * consumers such as games.
 */
export interface HandTrackSample {
  /** A hand (any pose) was detected in this inference */
  detected: boolean;
  /** Hand is in the cursor's pointing pose */
  pointing: boolean;
  /** Index fingertip in screen px (mirrored + remapped like the cursor, no EMA) */
  tipX: number;
  tipY: number;
  /** Wrist → middle-finger MCP distance in normalized camera units (bigger = closer) */
  handScale: number;
  /** Wrist position in normalized camera coords */
  wristX: number;
  wristY: number;
  /** performance.now() at inference time */
  timestamp: number;
  /** Increments on every inference, so consumers can tell fresh samples apart */
  frameId: number;
}

interface CvCursorEnabledContextValue {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  /** Ref is true while a pointing pose is detected — read in hot loops, no rerenders */
  cursorVisibleRef: React.RefObject<boolean>;
  notifyCursorVisible: (v: boolean) => void;
  /** Latest cursor state, written by CvCursorOverlay each frame. Read in hot loops. */
  cursorStateRef: React.RefObject<SharedCursorState>;
  updateCursorState: (s: SharedCursorState) => void;
  /** Latest raw hand sample, mutated in place by useCvCursor. Read in hot loops. */
  handTrackRef: React.RefObject<HandTrackSample>;
  /** Visual cursor variant — consumers can request a brush icon or hide the dot entirely. */
  cursorVariant: CursorVariant;
  setCursorVariant: (v: CursorVariant) => void;
}

const defaultCursorState: SharedCursorState = {
  x: 0,
  y: 0,
  visible: false,
  isPinched: false,
};

const createHandTrackSample = (): HandTrackSample => ({
  detected: false,
  pointing: false,
  tipX: 0,
  tipY: 0,
  handScale: 0,
  wristX: 0,
  wristY: 0,
  timestamp: 0,
  frameId: 0,
});

const CvCursorEnabledContext = createContext<CvCursorEnabledContextValue>({
  enabled: true,
  setEnabled: () => {},
  cursorVisibleRef: { current: false },
  notifyCursorVisible: () => {},
  cursorStateRef: { current: defaultCursorState },
  updateCursorState: () => {},
  handTrackRef: { current: createHandTrackSample() },
  cursorVariant: "default",
  setCursorVariant: () => {},
});

export function CvCursorEnabledProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const [cursorVariant, setCursorVariant] = useState<CursorVariant>("default");
  const cursorVisibleRef = useRef(false);
  const cursorStateRef = useRef<SharedCursorState>({ ...defaultCursorState });
  const handTrackRef = useRef<HandTrackSample>(createHandTrackSample());

  const notifyCursorVisible = useCallback((v: boolean) => {
    cursorVisibleRef.current = v;
  }, []);

  const updateCursorState = useCallback((s: SharedCursorState) => {
    cursorStateRef.current = s;
  }, []);

  return (
    <CvCursorEnabledContext.Provider
      value={{
        enabled,
        setEnabled,
        cursorVisibleRef,
        notifyCursorVisible,
        cursorStateRef,
        updateCursorState,
        handTrackRef,
        cursorVariant,
        setCursorVariant,
      }}
    >
      {children}
    </CvCursorEnabledContext.Provider>
  );
}

export function useCvCursorEnabled() {
  return useContext(CvCursorEnabledContext);
}
