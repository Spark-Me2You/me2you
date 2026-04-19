import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

export type CursorVariant = "default" | "brush" | "hidden";

export interface SharedCursorState {
  x: number;
  y: number;
  visible: boolean;
  isPinched: boolean;
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

const CvCursorEnabledContext = createContext<CvCursorEnabledContextValue>({
  enabled: true,
  setEnabled: () => {},
  cursorVisibleRef: { current: false },
  notifyCursorVisible: () => {},
  cursorStateRef: { current: defaultCursorState },
  updateCursorState: () => {},
  cursorVariant: "default",
  setCursorVariant: () => {},
});

export function CvCursorEnabledProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const [cursorVariant, setCursorVariant] = useState<CursorVariant>("default");
  const cursorVisibleRef = useRef(false);
  const cursorStateRef = useRef<SharedCursorState>({ ...defaultCursorState });

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
