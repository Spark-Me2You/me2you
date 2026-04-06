/**
 * CV Cursor Overlay
 * Renders a visual cursor controlled by hand tracking and dispatches
 * synthetic mouse events so existing UI elements respond to it.
 */

import { useEffect, useRef } from "react";
import { useCvCursor } from "./useCvCursor";
import { useCvCursorEnabled } from "./CvCursorEnabledContext";

interface CvCursorOverlayProps {
  enabled?: boolean;
}

export function CvCursorOverlay({ enabled = true }: CvCursorOverlayProps) {
  const { x, y, visible, clicking, videoRef } = useCvCursor(enabled);
  const { notifyCursorVisible } = useCvCursorEnabled();
  const prevTargetRef = useRef<Element | null>(null);
  const prevClickingRef = useRef(false);

  // Keep cursorVisibleRef in sync so arm-flap detection can read it without rerenders
  useEffect(() => {
    notifyCursorVisible(visible);
  }, [visible, notifyCursorVisible]);

  // Dispatch synthetic mouse events
  useEffect(() => {
    if (!visible) {
      // Dispatch mouseleave on previous target when cursor disappears
      if (prevTargetRef.current) {
        prevTargetRef.current.dispatchEvent(
          new MouseEvent("mouseleave", { bubbles: true, cancelable: true }),
        );
        prevTargetRef.current = null;
      }
      return;
    }

    const target = document.elementFromPoint(x, y);
    if (!target) return;

    // Handle mouseenter/mouseleave when target changes
    if (target !== prevTargetRef.current) {
      if (prevTargetRef.current) {
        prevTargetRef.current.dispatchEvent(
          new MouseEvent("mouseleave", {
            clientX: x,
            clientY: y,
            bubbles: true,
            cancelable: true,
          }),
        );
      }
      target.dispatchEvent(
        new MouseEvent("mouseenter", {
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
        }),
      );
      prevTargetRef.current = target;
    }

    // Dispatch mousemove
    target.dispatchEvent(
      new MouseEvent("mousemove", {
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, [x, y, visible]);

  // Handle click events
  useEffect(() => {
    if (clicking && !prevClickingRef.current && visible) {
      const target = document.elementFromPoint(x, y);
      if (target) {
        target.dispatchEvent(
          new MouseEvent("mousedown", {
            clientX: x,
            clientY: y,
            bubbles: true,
            cancelable: true,
          }),
        );

        // Short delay then mouseup + click
        setTimeout(() => {
          target.dispatchEvent(
            new MouseEvent("mouseup", {
              clientX: x,
              clientY: y,
              bubbles: true,
              cancelable: true,
            }),
          );
          target.dispatchEvent(
            new MouseEvent("click", {
              clientX: x,
              clientY: y,
              bubbles: true,
              cancelable: true,
            }),
          );
        }, 50);
      }
    }
    prevClickingRef.current = clicking;
  }, [clicking, visible, x, y]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {/* Hidden video element for camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: "none" }}
      />

      {/* Visual cursor */}
      {visible && (
        <div
          style={{
            position: "absolute",
            left: x,
            top: y,
            transform: "translate(-50%, -50%)",
            width: clicking ? 16 : 24,
            height: clicking ? 16 : 24,
            borderRadius: "50%",
            backgroundColor: clicking ? "#ffffff" : "#e040fb",
            border: clicking ? "3px solid #e040fb" : "3px solid #ffffff",
            boxShadow: "0 0 12px rgba(224, 64, 251, 0.5)",
            opacity: 0.85,
            transition: "width 0.1s ease-out, height 0.1s ease-out, background-color 0.1s ease-out, border 0.1s ease-out",
          }}
        />
      )}
    </div>
  );
}
