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
  clearActive?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const Toolbox: React.FC<Props> = ({
  tool,
  color,
  brushSize,
  onTool,
  onColor,
  onBrush,
  onClear,
  clearActive = false,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => (
  <div className={styles.toolbox}>
    <div className={styles.palette}>
      {PALETTE.map((hex) => (
        <button
          key={hex}
          type="button"
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

    <div className={styles.divider} />

    <div className={styles.brushRow}>
      {(Object.keys(BRUSH_PX) as BrushSize[]).map((b) => (
        <button
          key={b}
          type="button"
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
    </div>

    <div className={styles.divider} />

    <div className={styles.toolsGroup}>
      <button
        type="button"
        className={`${styles.tool} ${tool === "eraser" ? styles.active : ""}`}
        onClick={() => onTool("eraser")}
      >
        Eraser
      </button>
      <button
        type="button"
        className={`${styles.tool} ${tool === "bucket" ? styles.active : ""}`}
        onClick={() => onTool(tool === "bucket" ? "brush" : "bucket")}
      >
        Fill
      </button>
      <button
        type="button"
        className={`${styles.tool} ${clearActive ? styles.active : ""}`}
        onClick={onClear}
      >
        Clear
      </button>
    </div>

    <div className={styles.bottomGroup}>
      <div className={styles.divider} />
      <div className={styles.undoRedoRow}>
        <button
          type="button"
          className={styles.iconTool}
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="undo"
          title="Undo"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path
              d="M9 14 4 9l5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 9h9a6 6 0 0 1 0 12h-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className={styles.iconTool}
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="redo"
          title="Redo"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path
              d="m15 14 5-5-5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M20 9h-9a6 6 0 0 0 0 12h3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
);
