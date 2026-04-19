import React, { useEffect, useRef, useState } from "react";
import { Toolbox } from "./Toolbox";
import { Timer } from "./Timer";
import { useDrawingController } from "../hooks/useDrawingController";
import { CANVAS_BG } from "../config/drawitConfig";
import type { BrushSize, Tool } from "../types/drawit";
import styles from "./DrawingCanvas.module.css";

interface Props {
  word: string;
  onSubmit: (dataUrl: string) => void;
  onBack: () => void;
}

const CANVAS_W = 1280;
const CANVAS_H = 800;

export const DrawingCanvas: React.FC<Props> = ({ word, onSubmit, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState<string>("#000000");
  const [brushSize, setBrushSize] = useState<BrushSize>("medium");

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
      <button className={styles.back} onClick={onBack}>
        Back
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
        onClear={controller.clear}
      />

      <button className={styles.submit} onClick={handleSubmit}>
        Submit
      </button>
    </div>
  );
};
