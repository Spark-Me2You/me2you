import React from "react";
import { BRUSH_PX, PALETTE } from "../config/drawitConfig";
import type { BrushSize, Tool } from "../types/drawit";

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
  <div className="fixed top-[calc(90px_+_var(--canvas-gap))] bottom-[calc(40px_+_var(--canvas-gap))] left-4 z-[10001] box-border flex w-[170px] flex-col gap-[10px] border-[3px] border-solid border-[#fff] border-r-[#404040] border-b-[#404040] bg-[#c0c0c0] px-[10px] py-3 font-jersey shadow-[3px_3px_0_#000] [--canvas-gap:calc((100vh_-_130px_-_var(--canvas-h))_/_2)] [--canvas-h:min(calc(100vh_-_130px),calc((100vw_-_440px)_*_10_/_16))]">
    <div className="grid grid-cols-[48px_48px] justify-center gap-x-2 gap-y-[6px]">
      {PALETTE.map((hex) => (
        <button
          key={hex}
          type="button"
          aria-label={`color ${hex}`}
          className={`size-12 cursor-pointer border-[3px] border-solid border-[#404040] border-t-[#fff] border-l-[#fff] p-0 [transition:transform_80ms_ease] hover:[transform:scale(1.08)] ${color === hex && tool !== "eraser" ? "outline-[3px] outline-offset-2 outline-[#ff0] outline-solid" : ""}`}
          style={{ background: hex }}
          onClick={() => {
            onColor(hex);
            if (tool === "eraser") onTool("brush");
          }}
        />
      ))}
    </div>

    <div className="my-[2px] h-[2px] border-t border-b border-solid border-t-[#404040] border-b-[#fff] bg-[#808080]" />

    <div className="grid grid-cols-[repeat(3,1fr)] items-center gap-[6px]">
      {(Object.keys(BRUSH_PX) as BrushSize[]).map((b) => (
        <button
          key={b}
          type="button"
          className={`flex h-[42px] w-full cursor-pointer items-center justify-center p-0 border-[3px] border-solid border-[#fff] border-r-[#404040] border-b-[#404040] ${brushSize === b ? "bg-white outline-[3px] outline-offset-1 outline-[#ff0] outline-solid" : "bg-[#dcdcdc]"}`}
          onClick={() => onBrush(b)}
          aria-label={`brush ${b}`}
        >
          <span
            className="block rounded-full bg-black"
            style={{ width: BRUSH_PX[b], height: BRUSH_PX[b] }}
          />
        </button>
      ))}
    </div>

    <div className="my-[2px] h-[2px] border-t border-b border-solid border-t-[#404040] border-b-[#fff] bg-[#808080]" />

    <div className="flex flex-col gap-2">
      <button
        type="button"
        className={`flex h-[50px] w-full cursor-pointer items-center justify-center p-0 font-jersey text-[22px] tracking-[3px] text-[#101010] border-[3px] border-solid border-[#fff] border-r-[#404040] border-b-[#404040] [transition:transform_80ms_ease,background_80ms_ease] hover:[transform:scale(1.03)] ${tool === "eraser" ? "bg-white outline-[3px] outline-offset-1 outline-[#ff0] outline-solid" : "bg-[#dcdcdc] hover:bg-[#e8e8e8]"}`}
        onClick={() => onTool("eraser")}
      >
        Eraser
      </button>
      <button
        type="button"
        className={`flex h-[50px] w-full cursor-pointer items-center justify-center p-0 font-jersey text-[22px] tracking-[3px] text-[#101010] border-[3px] border-solid border-[#fff] border-r-[#404040] border-b-[#404040] [transition:transform_80ms_ease,background_80ms_ease] hover:[transform:scale(1.03)] ${tool === "bucket" ? "bg-white outline-[3px] outline-offset-1 outline-[#ff0] outline-solid" : "bg-[#dcdcdc] hover:bg-[#e8e8e8]"}`}
        onClick={() => onTool(tool === "bucket" ? "brush" : "bucket")}
      >
        Fill
      </button>
      <button
        type="button"
        className={`flex h-[50px] w-full cursor-pointer items-center justify-center p-0 font-jersey text-[22px] tracking-[3px] text-[#101010] border-[3px] border-solid border-[#fff] border-r-[#404040] border-b-[#404040] [transition:transform_80ms_ease,background_80ms_ease] hover:[transform:scale(1.03)] ${clearActive ? "bg-white outline-[3px] outline-offset-1 outline-[#ff0] outline-solid" : "bg-[#dcdcdc] hover:bg-[#e8e8e8]"}`}
        onClick={onClear}
      >
        Clear
      </button>
    </div>

    <div className="mt-auto flex flex-col gap-2">
      <div className="my-[2px] h-[2px] border-t border-b border-solid border-t-[#404040] border-b-[#fff] bg-[#808080]" />
      <div className="grid grid-cols-[1fr_1fr] gap-[6px]">
        <button
          type="button"
          className="flex h-[44px] w-full cursor-pointer items-center justify-center bg-[#dcdcdc] p-0 text-[#101010] border-[3px] border-solid border-[#fff] border-r-[#404040] border-b-[#404040] [transition:transform_80ms_ease,background_80ms_ease] hover:enabled:bg-[#e8e8e8] hover:enabled:[transform:scale(1.03)] disabled:cursor-not-allowed disabled:opacity-45"
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
          className="flex h-[44px] w-full cursor-pointer items-center justify-center bg-[#dcdcdc] p-0 text-[#101010] border-[3px] border-solid border-[#fff] border-r-[#404040] border-b-[#404040] [transition:transform_80ms_ease,background_80ms_ease] hover:enabled:bg-[#e8e8e8] hover:enabled:[transform:scale(1.03)] disabled:cursor-not-allowed disabled:opacity-45"
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
