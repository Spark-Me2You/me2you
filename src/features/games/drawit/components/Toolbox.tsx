import React from "react";
import { BRUSH_PX, PALETTE } from "../config/drawitConfig";
import type { BrushSize, Tool } from "../types/drawit";
import styles from "./Toolbox.module.css";

interface Props {
  tool: Tool;
  color: string;
  brushSize: BrushSize;
  onTool: (t: Tool) => void;
  onColor: (c: string) => void;
  onBrush: (b: BrushSize) => void;
  onClear: () => void;
}

export const Toolbox: React.FC<Props> = ({
  tool,
  color,
  brushSize,
  onTool,
  onColor,
  onBrush,
  onClear,
}) => (
  <div className={styles.toolbox}>
    <div className={styles.row}>
      {PALETTE.map((hex) => (
        <button
          key={hex}
          aria-label={`color ${hex}`}
          className={`${styles.swatch} ${color === hex && tool !== "eraser" ? styles.active : ""}`}
          style={{ background: hex }}
          onClick={() => {
            onColor(hex);
            if (tool === "eraser") onTool("brush");
          }}
        />
      ))}
    </div>
    <div className={styles.row}>
      {(Object.keys(BRUSH_PX) as BrushSize[]).map((b) => (
        <button
          key={b}
          className={`${styles.brush} ${brushSize === b ? styles.active : ""}`}
          onClick={() => onBrush(b)}
          aria-label={`brush ${b}`}
        >
          <span
            className={styles.brushDot}
            style={{ width: BRUSH_PX[b], height: BRUSH_PX[b] }}
          />
        </button>
      ))}
      <button
        className={`${styles.tool} ${tool === "eraser" ? styles.active : ""}`}
        onClick={() => onTool("eraser")}
      >
        Eraser
      </button>
      <button
        className={`${styles.tool} ${tool === "bucket" ? styles.active : ""}`}
        onClick={() => onTool(tool === "bucket" ? "brush" : "bucket")}
      >
        Fill
      </button>
      <button className={styles.tool} onClick={onClear}>
        Clear
      </button>
    </div>
  </div>
);
