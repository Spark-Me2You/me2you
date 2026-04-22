import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useCvCursorEnabled } from "@/core/cv/cursor/CvCursorEnabledContext";
import { floodFill } from "../utils/floodFill";
import { BRUSH_PX, CANVAS_BG } from "../config/drawitConfig";
import type { BrushSize, Tool } from "../types/drawit";

interface Params {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  tool: Tool;
  color: string;
  brushSize: BrushSize;
  enabled: boolean;
}

export interface DrawingController {
  clear: () => void;
  toDataURL: () => string;
}

// Maps a screen-space point into the canvas's internal (unscaled) coordinates.
function toCanvasSpace(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
    inside:
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom,
  };
}

export function useDrawingController({
  canvasRef,
  tool,
  color,
  brushSize,
  enabled,
}: Params): DrawingController {
  // Read the shared cursor state populated by the global CvCursorOverlay —
  // don't start a second useCvCursor instance (that would collide on the
  // singleton HandLandmarker and freeze the global cursor).
  const { cursorStateRef } = useCvCursorEnabled();

  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const brushRef = useRef(brushSize);
  const enabledRef = useRef(enabled);

  toolRef.current = tool;
  colorRef.current = color;
  brushRef.current = brushSize;
  enabledRef.current = enabled;

  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const wasPinchedRef = useRef(false);
  // Timestamp (ms) before which drawing is ignored. Used after clear() so the
  // pinch that confirmed the modal doesn't immediately paint a stray stroke.
  const suspendUntilRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;

    const tick = () => {
      const c = cursorStateRef.current;
      const t = toolRef.current;
      const col = colorRef.current;
      const size = BRUSH_PX[brushRef.current];

      if (!enabledRef.current || !c.visible) {
        lastPointRef.current = null;
        wasPinchedRef.current = false;
        raf = requestAnimationFrame(tick);
        return;
      }

      if (Date.now() < suspendUntilRef.current) {
        lastPointRef.current = null;
        wasPinchedRef.current = c.isPinched;
        raf = requestAnimationFrame(tick);
        return;
      }

      const pinched = c.isPinched;
      const pt = toCanvasSpace(canvas, c.x, c.y);

      if (pinched && pt.inside) {
        if (t === "bucket") {
          if (!wasPinchedRef.current) {
            floodFill(ctx, pt.x, pt.y, col);
          }
        } else {
          const strokeColor = t === "eraser" ? CANVAS_BG : col;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = size;

          if (lastPointRef.current) {
            ctx.beginPath();
            ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, size / 2, 0, Math.PI * 2);
            ctx.fillStyle = strokeColor;
            ctx.fill();
          }
          lastPointRef.current = { x: pt.x, y: pt.y };
        }
      } else {
        lastPointRef.current = null;
      }

      wasPinchedRef.current = pinched;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [canvasRef, cursorStateRef]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    lastPointRef.current = null;
    suspendUntilRef.current = Date.now() + 1000;
  }, [canvasRef]);

  const toDataURL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    return canvas.toDataURL("image/png");
  }, [canvasRef]);

  return { clear, toDataURL };
}
