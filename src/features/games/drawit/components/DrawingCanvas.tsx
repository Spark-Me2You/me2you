import React, { useEffect, useRef, useState } from "react";
import { Toolbox } from "./Toolbox";
import { Timer } from "./Timer";
import { ConfirmModal } from "./ConfirmModal";
import { useDrawingController } from "../hooks/useDrawingController";
import { CANVAS_BG } from "../config/drawitConfig";
import { useCvCursorEnabled } from "@/core/cv/cursor/CvCursorEnabledContext";
import { ExitButton } from "@/shared/components";
import { PinnedRegistrationQR } from "@/features/kiosk";
import type { BrushSize, Tool } from "../types/drawit";
import { BTN_MD, BTN_PRIMARY } from "../../components/gameUi";

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

  // Paint white background on mount so flood-fill has a real canvas to work on,
  // and capture that as the initial undo baseline.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    controller.pushSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = () => {
    const url = controller.toDataURL();
    onSubmit(url);
  };

  return (
    <div className="absolute inset-0 box-border flex items-center justify-center pt-[90px] pr-[220px] pb-[40px] pl-[220px]">
      <ExitButton onClick={() => setConfirmingQuit(true)} compact />
      <div className="fixed top-5 left-1/2 z-[9999] -translate-x-1/2 rounded-tag bg-scrim px-[30px] py-[10px] font-jersey text-[42px] tracking-brand text-white">draw: {word}</div>
      <Timer onExpire={handleSubmit} />

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="aspect-[16/10] h-auto max-h-full w-auto max-w-full rounded-tag border-4 border-solid border-white bg-white shadow-drop"
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
        onUndo={controller.undo}
        onRedo={controller.redo}
        canUndo={controller.canUndo}
        canRedo={controller.canRedo}
      />

      <button className={`fixed right-5 bottom-5 z-[10000] ${BTN_MD} ${BTN_PRIMARY}`} onClick={handleSubmit}>
        submit
      </button>

      <PinnedRegistrationQR side="right" top={145} qrSize={150} />

      {confirmingClear && (
        <ConfirmModal
          message="clear drawing?"
          onYes={() => {
            controller.clear();
            setConfirmingClear(false);
          }}
          onNo={() => setConfirmingClear(false)}
        />
      )}

      {confirmingQuit && (
        <ConfirmModal
          message="stop drawing?"
          onYes={onQuit}
          onNo={() => setConfirmingQuit(false)}
        />
      )}
    </div>
  );
};
