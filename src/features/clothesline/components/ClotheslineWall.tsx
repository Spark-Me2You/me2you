/**
 * The community clothesline: ropes strung across the screen with everyone's
 * garments pegged to them, newest first. Garments can be dragged along a rope or
 * onto another one, with a mouse, a finger or a hand pinch. Moves last until the
 * screen is left; they aren't saved.
 */

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useCvCursorEnabled } from "@/core/cv/cursor";
import { HAND_RELEASE_GRACE_MS } from "@/features/hub/drag/walkerDrag";
import { CLOTHESLINE_CONFIG } from "../config/clotheslineConfig";
import type { GarmentWithUrl } from "../types";
import { defaultSpot, ropeCount, spotAt, type LineSpot } from "../utils/lineLayout";
import { GarmentPeg } from "./GarmentPeg";

const ROPE = "absolute inset-x-0 top-[6px] h-[6px] rounded-full bg-ink-soft/70 shadow-tape";

interface Hold {
  id: string;
  pointerId: number;
  /** Started by the CV hand cursor, which only sends synthetic events. */
  isHand: boolean;
  lastPinchedAt: number;
}

interface ClotheslineWallProps {
  garments: GarmentWithUrl[];
}

export function ClotheslineWall({ garments }: ClotheslineWallProps) {
  const { cursorStateRef } = useCvCursorEnabled();
  const { perRope } = CLOTHESLINE_CONFIG;
  const ropes = ropeCount(garments.length, perRope);

  const [moved, setMoved] = useState<Record<string, LineSpot>>({});
  const [heldId, setHeldId] = useState<string | null>(null);
  const holdRef = useRef<Hold | null>(null);
  const ropeRefs = useRef<(HTMLDivElement | null)[]>([]);

  const moveTo = useCallback((id: string, clientX: number, clientY: number) => {
    const boxes = ropeRefs.current
      .filter((el): el is HTMLDivElement => el !== null)
      .map((el) => el.getBoundingClientRect());
    const spot = spotAt(clientX, clientY, boxes);
    if (spot) setMoved((current) => ({ ...current, [id]: spot }));
  }, []);

  const drop = useCallback(() => {
    holdRef.current = null;
    setHeldId(null);
  }, []);

  const handlePointerDown = (id: string) => (event: ReactPointerEvent) => {
    if (holdRef.current || event.button !== 0) return;
    event.preventDefault();
    // CvCursorOverlay dispatches synthetic events; a real mouse's or finger's are trusted.
    const isHand = !event.nativeEvent.isTrusted;
    holdRef.current = { id, pointerId: event.pointerId, isHand, lastPinchedAt: performance.now() };
    setHeldId(id);
    moveTo(id, event.clientX, event.clientY);
  };

  // Mouse and touch: follow the pointer until it lifts.
  useEffect(() => {
    if (!heldId) return;
    const isMine = (event: PointerEvent) => {
      const hold = holdRef.current;
      return hold !== null && !hold.isHand && hold.pointerId === event.pointerId;
    };
    const onMove = (event: PointerEvent) => {
      if (isMine(event)) moveTo(heldId, event.clientX, event.clientY);
    };
    const onUp = (event: PointerEvent) => {
      if (isMine(event)) drop();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("blur", drop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", drop);
    };
  }, [heldId, moveTo, drop]);

  // Hand: follow the live pinch each frame. The overlay's pointerup comes 50 ms into every
  // pinch, so it's ignored; a pinch that drops out briefly counts as still held.
  useEffect(() => {
    if (!heldId || !holdRef.current?.isHand) return;
    let frame = 0;
    const tick = () => {
      const hold = holdRef.current;
      if (!hold) return;
      const cursor = cursorStateRef.current;
      const now = performance.now();
      if (cursor.isPinched) {
        hold.lastPinchedAt = now;
        moveTo(hold.id, cursor.x, cursor.y);
      } else if (now - hold.lastPinchedAt >= HAND_RELEASE_GRACE_MS) {
        drop();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [heldId, cursorStateRef, moveTo, drop]);

  const spots = garments.map((garment, index) => {
    const spot = moved[garment.id] ?? defaultSpot(index, garments.length, perRope);
    return { garment, index, spot: { ...spot, rope: Math.min(spot.rope, ropes - 1) } };
  });
  const heldRope = spots.find((entry) => entry.garment.id === heldId)?.spot.rope;

  return (
    <div className="flex w-full flex-col gap-6">
      {Array.from({ length: ropes }, (_, ropeIndex) => (
        <div
          key={ropeIndex}
          className={`relative h-[270px] w-full ${ropeIndex % 2 ? "-rotate-[0.6deg]" : "rotate-[0.6deg]"} ${heldRope === ropeIndex ? "z-10" : ""}`}
        >
          <div className={ROPE} aria-hidden="true" />
          <div
            ref={(el) => {
              ropeRefs.current[ropeIndex] = el;
            }}
            className="absolute inset-x-10 inset-y-0"
          >
            {spots
              .filter(({ spot }) => spot.rope === ropeIndex)
              .map(({ garment, index, spot }) => {
                const isHeld = garment.id === heldId;
                return (
                  <div
                    key={garment.id}
                    // Runtime value: where the garment hangs along the rope.
                    style={{ left: `${spot.x * 100}%` }}
                    className={`absolute top-0 -translate-x-1/2 touch-none transition-[scale] ${isHeld ? "z-10 scale-110 cursor-grabbing" : "cursor-grab"}`}
                    onPointerDown={handlePointerDown(garment.id)}
                  >
                    <GarmentPeg
                      garment={garment}
                      index={index}
                      held={isHeld}
                      className="max-h-[230px] max-w-[180px]"
                    />
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
