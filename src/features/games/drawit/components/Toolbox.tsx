import React from "react";
import { BRUSH_PX, PALETTE } from "../config/drawitConfig";
import type { BrushSize, Tool } from "../types/drawit";
import { GAME_PANEL } from "../../components/gameUi";

const DIVIDER = "my-[2px] h-[2px] rounded-full bg-white/40";
const SELECTED = "outline-[3px] outline-offset-2 outline-lime outline-solid";
// White chip on the glass panel; selected tools turn lime
const TOOL_BTN =
  "flex w-full cursor-pointer items-center justify-center rounded-tag p-0 text-ink shadow-drop transition-[scale,background-color] duration-80 ease-out";
const TOOL_IDLE = "bg-white/85 hover:bg-white";
const TOOL_ACTIVE = `bg-lime ${SELECTED}`;

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
  <div className={`fixed top-[calc(90px_+_var(--canvas-gap))] bottom-[calc(40px_+_var(--canvas-gap))] left-4 z-[10001] box-border flex w-[170px] flex-col gap-[10px] overflow-y-auto rounded-[24px] px-[10px] py-3 font-jersey ${GAME_PANEL} [--canvas-gap:calc((100vh_-_130px_-_var(--canvas-h))_/_2)] [--canvas-h:min(calc(100vh_-_130px),calc((100vw_-_440px)_*_10_/_16))]`}>
    <div className="grid grid-cols-[48px_48px] justify-center gap-x-2 gap-y-[6px]">
      {PALETTE.map((hex) => (
        <button
          key={hex}
          type="button"
          aria-label={`color ${hex}`}
          className={`size-12 cursor-pointer rounded-tag border-2 border-solid border-white/70 p-0 shadow-drop transition-[scale] duration-80 ease-out hover:scale-108 ${color === hex && tool !== "eraser" ? SELECTED : ""}`}
          style={{ background: hex }}
          onClick={() => {
            onColor(hex);
            if (tool === "eraser") onTool("brush");
          }}
        />
      ))}
    </div>

    <div className={DIVIDER} />

    <div className="grid grid-cols-[repeat(3,1fr)] items-center gap-[6px]">
      {(Object.keys(BRUSH_PX) as BrushSize[]).map((b) => (
        <button
          key={b}
          type="button"
          className={`h-[42px] ${TOOL_BTN} ${brushSize === b ? TOOL_ACTIVE : TOOL_IDLE}`}
          onClick={() => onBrush(b)}
          aria-label={`brush ${b}`}
        >
          <span
            className="block rounded-full bg-ink"
            style={{ width: BRUSH_PX[b], height: BRUSH_PX[b] }}
          />
        </button>
      ))}
    </div>

    <div className={DIVIDER} />

    <div className="flex flex-col gap-2">
      <button
        type="button"
        className={`h-[50px] text-[22px] tracking-brand hover:scale-103 ${TOOL_BTN} ${tool === "eraser" ? TOOL_ACTIVE : TOOL_IDLE}`}
        onClick={() => onTool("eraser")}
      >
        eraser
      </button>
      <button
        type="button"
        className={`h-[50px] text-[22px] tracking-brand hover:scale-103 ${TOOL_BTN} ${tool === "bucket" ? TOOL_ACTIVE : TOOL_IDLE}`}
        onClick={() => onTool(tool === "bucket" ? "brush" : "bucket")}
      >
        fill
      </button>
      <button
        type="button"
        className={`h-[50px] text-[22px] tracking-brand hover:scale-103 ${TOOL_BTN} ${clearActive ? TOOL_ACTIVE : TOOL_IDLE}`}
        onClick={onClear}
      >
        clear
      </button>
    </div>

    <div className="mt-auto flex flex-col gap-2">
      <div className={DIVIDER} />
      <div className="grid grid-cols-[1fr_1fr] gap-[6px]">
        <button
          type="button"
          className={`h-[44px] ${TOOL_BTN} bg-white/85 hover:enabled:bg-white hover:enabled:scale-103 disabled:cursor-not-allowed disabled:opacity-45`}
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
          className={`h-[44px] ${TOOL_BTN} bg-white/85 hover:enabled:bg-white hover:enabled:scale-103 disabled:cursor-not-allowed disabled:opacity-45`}
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
