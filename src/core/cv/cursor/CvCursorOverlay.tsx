/**
 * CV Cursor Overlay
 * Renders a visual cursor controlled by hand tracking and dispatches
 * synthetic mouse events so existing UI elements respond to it.
 */

import { useEffect, useRef, useState } from "react";
import { useCvCursor } from "./useCvCursor";
import { useCvCursorEnabled } from "./CvCursorEnabledContext";
import hoverCursorSrc from "../../../assets/cursor hover.svg";
import clickCursorSrc from "../../../assets/cursor-click.svg";
import paintbrushCursorSrc from "../../../assets/paintbrush.svg";

// Hotspot offsets as percentage of the cursor image size.
// Hover: arrow tip is at (13/302, 31/499) ≈ (4.3%, 6.2%) from top-left.
// Click: pinch point estimated at ~(49%, 27%) of the 746×746 square.
const HOVER_OFFSET_X = "4.3%";
const HOVER_OFFSET_Y = "6.2%";
const CLICK_OFFSET_X = "49%";
const CLICK_OFFSET_Y = "27%";
const BRUSH_OFFSET_X = "6%";
const BRUSH_OFFSET_Y = "92%";

const INTERACTIVE_TAGS = new Set(["button", "a", "input", "select", "textarea"]);
const INTERACTIVE_ROLES = new Set(["button", "link", "checkbox", "radio", "tab", "menuitem"]);

function isInteractiveElement(el: Element | null, depth = 0): boolean {
  if (!el || depth > 6) return false;
  if (INTERACTIVE_TAGS.has(el.tagName.toLowerCase())) return true;
  const role = el.getAttribute("role");
  if (role && INTERACTIVE_ROLES.has(role)) return true;
  if ((el as HTMLElement).onclick) return true;
  if (getComputedStyle(el).cursor === "pointer") return true;
  return isInteractiveElement(el.parentElement, depth + 1);
}

interface CvCursorOverlayProps {
  enabled?: boolean;
}

export function CvCursorOverlay({ enabled = true }: CvCursorOverlayProps) {
  const { x, y, visible, clicking, isPinched, videoRef } = useCvCursor(enabled);
  const { notifyCursorVisible, updateCursorState, cursorVariant } = useCvCursorEnabled();
  const prevTargetRef = useRef<Element | null>(null);
  const prevClickingRef = useRef(false);
  const [clickAnimKey, setClickAnimKey] = useState(0);

  // Trigger click burst animation on each new click
  useEffect(() => {
    if (clicking) setClickAnimKey((k) => k + 1);
  }, [clicking]);

  // Keep cursorVisibleRef in sync so arm-flap detection can read it without rerenders
  useEffect(() => {
    notifyCursorVisible(visible);
  }, [visible, notifyCursorVisible]);

  // Broadcast the latest cursor state to shared ref so game-level consumers
  // (e.g. DrawIt's drawing controller) can read it without spinning up a
  // second HandLandmarker instance.
  useEffect(() => {
    updateCursorState({ x, y, visible, isPinched });
  }, [x, y, visible, isPinched, updateCursorState]);

  // Dispatch synthetic mouse + pointer events so both DOM handlers and
  // canvas-based event systems (e.g. Pixi) respond to the CV cursor.
  useEffect(() => {
    if (!visible) {
      if (prevTargetRef.current) {
        prevTargetRef.current.dispatchEvent(
          new MouseEvent("mouseleave", { bubbles: true, cancelable: true }),
        );
        prevTargetRef.current.dispatchEvent(
          new PointerEvent("pointerleave", {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
          }),
        );
        prevTargetRef.current = null;
      }
      return;
    }

    const target = document.elementFromPoint(x, y);
    if (!target) return;

    isInteractiveElement(target);

    const common = {
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
    } as const;
    const pointerCommon = {
      ...common,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
    } as const;

    if (target !== prevTargetRef.current) {
      if (prevTargetRef.current) {
        prevTargetRef.current.dispatchEvent(new MouseEvent("mouseleave", common));
        prevTargetRef.current.dispatchEvent(new PointerEvent("pointerleave", pointerCommon));
        prevTargetRef.current.dispatchEvent(new PointerEvent("pointerout", pointerCommon));
      }
      target.dispatchEvent(new MouseEvent("mouseenter", common));
      target.dispatchEvent(new PointerEvent("pointerenter", pointerCommon));
      target.dispatchEvent(new PointerEvent("pointerover", pointerCommon));
      prevTargetRef.current = target;
    }

    target.dispatchEvent(new MouseEvent("mousemove", common));
    target.dispatchEvent(new PointerEvent("pointermove", pointerCommon));
  }, [x, y, visible]);

  // Handle click events
  useEffect(() => {
    if (clicking && !prevClickingRef.current && visible) {
      const target = document.elementFromPoint(x, y);
      if (target) {
        const common = {
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          button: 0,
        } as const;
        const pointerCommon = {
          ...common,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
        } as const;

        target.dispatchEvent(new PointerEvent("pointerdown", pointerCommon));
        target.dispatchEvent(new MouseEvent("mousedown", common));

        setTimeout(() => {
          target.dispatchEvent(new PointerEvent("pointerup", pointerCommon));
          target.dispatchEvent(new MouseEvent("mouseup", common));
          target.dispatchEvent(new MouseEvent("click", common));
        }, 50);
      }
    }
    prevClickingRef.current = clicking;
  }, [clicking, visible, x, y]);

  const isClick = clicking || isPinched;
  const cursorSrc = isClick ? clickCursorSrc : hoverCursorSrc;
  const offsetX = isClick ? CLICK_OFFSET_X : HOVER_OFFSET_X;
  const offsetY = isClick ? CLICK_OFFSET_Y : HOVER_OFFSET_Y;
  const cursorSize = isClick ? 120 : 45;

  const hoverFilter = "drop-shadow(0 2px 4px rgba(0,0,0,0.4))";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes cv-cursor-click {
          0%   { transform: translate(-${offsetX}, -${offsetY}) scale(1); }
          20%  { transform: translate(-${offsetX}, -${offsetY}) scale(0.72); }
          55%  { transform: translate(-${offsetX}, -${offsetY}) scale(1.22); }
          80%  { transform: translate(-${offsetX}, -${offsetY}) scale(0.95); }
          100% { transform: translate(-${offsetX}, -${offsetY}) scale(1); }
        }
      `}</style>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: "none" }}
      />

      {visible && cursorVariant !== "hidden" && (
        cursorVariant === "brush" ? (
          <img
            src={paintbrushCursorSrc}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 72,
              height: "auto",
              transform: `translate(-${BRUSH_OFFSET_X}, -${BRUSH_OFFSET_Y})`,
              filter: "drop-shadow(0 0 6px rgba(0,0,0,0.5))",
              transition: "width 80ms ease-out",
              userSelect: "none",
            }}
          />
        ) : (
          <img
            key={`${isClick ? "click" : "hover"}-${clickAnimKey}`}
            src={cursorSrc}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: cursorSize,
              height: "auto",
              transform: `translate(-${offsetX}, -${offsetY})`,
              filter: hoverFilter,
              animation: clicking ? `cv-cursor-click 280ms cubic-bezier(0.36,0.07,0.19,0.97) forwards` : "none",
              transition: "filter 120ms ease-out, width 100ms ease-out",
              userSelect: "none",
            }}
          />
        )
      )}
    </div>
  );
}
