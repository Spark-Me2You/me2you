import { useEffect, useRef, type RefObject } from "react";
import { useCvCursor } from "@/core/cv/cursor/useCvCursor";
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
  const cursor = useCvCursor(enabled);

  // Live refs so the animation loop doesn't need to be re-created per render.
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const brushRef = useRef(brushSize);
  const cursorRef = useRef(cursor);
  const enabledRef = useRef(enabled);

  toolRef.current = tool;
  colorRef.current = color;
  brushRef.current = brushSize;
  cursorRef.current = cursor;
  enabledRef.current = enabled;

  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const wasPinchedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;

    const tick = () => {
      const c = cursorRef.current;
      const t = toolRef.current;
      const col = colorRef.current;
      const size = BRUSH_PX[brushRef.current];

      if (!enabledRef.current || !c.visible) {
        lastPointRef.current = null;
        wasPinchedRef.current = false;
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
            // Pen-down dot so single-tap is visible.
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
  }, [canvasRef]);

  return {
    clear: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },
    toDataURL: () => {
      const canvas = canvasRef.current;
      if (!canvas) return "";
      return canvas.toDataURL("image/png");
    },
  };
}
