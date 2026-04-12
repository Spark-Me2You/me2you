import { createContext, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

interface CvCursorEnabledContextValue {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  /** Ref is true while a pointing pose is detected — read in hot loops, no rerenders */
  cursorVisibleRef: React.RefObject<boolean>;
  notifyCursorVisible: (v: boolean) => void;
}

const CvCursorEnabledContext = createContext<CvCursorEnabledContextValue>({
  enabled: true,
  setEnabled: () => {},
  cursorVisibleRef: { current: false },
  notifyCursorVisible: () => {},
});

export function CvCursorEnabledProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const cursorVisibleRef = useRef(false);
  const notifyCursorVisible = (v: boolean) => {
    cursorVisibleRef.current = v;
  };

  return (
    <CvCursorEnabledContext.Provider
      value={{ enabled, setEnabled, cursorVisibleRef, notifyCursorVisible }}
    >
      {children}
    </CvCursorEnabledContext.Provider>
  );
}

export function useCvCursorEnabled() {
  return useContext(CvCursorEnabledContext);
}
