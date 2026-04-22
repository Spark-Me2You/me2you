import React, { useEffect, useRef, useState } from "react";
import { Toolbox } from "./Toolbox";
import { Timer } from "./Timer";
import { ConfirmModal } from "./ConfirmModal";
import { useDrawingController } from "../hooks/useDrawingController";
import { CANVAS_BG } from "../config/drawitConfig";
import { useCvCursorEnabled } from "@/core/cv/cursor/CvCursorEnabledContext";
import type { BrushSize, Tool } from "../types/drawit";
import styles from "./DrawingCanvas.module.css";

interface Props {
  word: string;
  onSubmit: (dataUrl: string) => void;
  onQuit: () => void;
}

const CANVAS_W = 1280;
const CANVAS_H = 800;

export const DrawingCanvas: React.FC<Props> = ({ word, onSubmit, onQuit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState<string>("#000000");
  const [brushSize, setBrushSize] = useState<BrushSize>("medium");
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [confirmingQuit, setConfirmingQuit] = useState(false);
  const { setCursorVariant } = useCvCursorEnabled();

  // Swap the global CV cursor visual for a paintbrush while drawing.
  useEffect(() => {
    setCursorVariant("brush");
    return () => setCursorVariant("default");
  }, [setCursorVariant]);

  const controller = useDrawingController({
    canvasRef,
    tool,
    color,
    brushSize,
    enabled: true,
  });

  // Paint white background on mount so flood-fill has a real canvas to work on.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const handleSubmit = () => {
    const url = controller.toDataURL();
    onSubmit(url);
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.exit}
        onClick={() => setConfirmingQuit(true)}
      >
        Exit
      </button>
      <div className={styles.wordBanner}>Draw: {word}</div>
      <Timer onExpire={handleSubmit} />

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className={styles.canvas}
      />

      <Toolbox
        tool={tool}
        color={color}
        brushSize={brushSize}
        onTool={setTool}
        onColor={setColor}
        onBrush={setBrushSize}
        onClear={() => setConfirmingClear(true)}
        clearActive={confirmingClear}
      />

      <button className={styles.submit} onClick={handleSubmit}>
        Submit
      </button>

      {confirmingClear && (
        <ConfirmModal
          message="Clear drawing?"
          onYes={() => {
            controller.clear();
            setConfirmingClear(false);
          }}
          onNo={() => setConfirmingClear(false)}
        />
      )}

      {confirmingQuit && (
        <ConfirmModal
          message="Stop drawing?"
          onYes={onQuit}
          onNo={() => setConfirmingQuit(false)}
        />
      )}
    </div>
  );
};
