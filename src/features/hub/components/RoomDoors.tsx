/**
 * Room doors
 * DOM buttons on the edges of the hub that move between rooms. Rendered over the Pixi canvas
 * so the CV hand cursor can click them like any other kiosk button.
 */

import React from "react";
import { MAIN_ROOM, ROOMS, type DoorSide, type RoomId } from "../rooms/rooms";

const DOOR =
  "absolute z-[90] flex cursor-pointer items-center justify-center gap-3 border-0 font-jersey text-[34px] tracking-[0.17em] lowercase shadow-glass-card transition-transform hover:scale-105";

const SIDE: Record<DoorSide, string> = {
  top: "top-0 left-1/2 h-[96px] w-[260px] -translate-x-1/2 rounded-b-[46px]",
  bottom: "bottom-0 left-1/2 h-[96px] w-[260px] -translate-x-1/2 rounded-t-[46px]",
  left: "top-1/2 left-0 h-[260px] w-[140px] -translate-y-1/2 flex-col rounded-r-[46px] px-2 text-center leading-none",
  right: "top-1/2 right-0 h-[260px] w-[140px] -translate-y-1/2 flex-col rounded-l-[46px] px-2 text-center leading-none",
};

const ARROW: Record<DoorSide, string> = { top: "↑", bottom: "↓", left: "←", right: "→" };

const DESTINATION_COLOR: Record<RoomId, string> = {
  main: "bg-magenta/93 text-white",
  north: "bg-btn-purple text-white",
  south: "bg-btn-yellow-green text-black",
  west: "bg-btn-pink text-white",
  east: "bg-btn-orange text-white",
};

interface RoomDoorsProps {
  roomId: RoomId;
  onEnter: (roomId: RoomId) => void;
}

export const RoomDoors: React.FC<RoomDoorsProps> = ({ roomId, onEnter }) => {
  const doors = Object.entries(ROOMS[roomId].doors) as [DoorSide, RoomId][];

  return (
    <>
      {roomId !== MAIN_ROOM && (
        <div className="absolute top-4 left-[216px] z-[90] flex h-[81px] items-center rounded-[13px] bg-black/40 px-6 font-jersey text-[40px] tracking-[0.17em] text-white lowercase select-none">
          {ROOMS[roomId].label}
        </div>
      )}
      {doors.map(([side, target]) => (
        <button
          key={side}
          type="button"
          aria-label={`go to ${ROOMS[target].label}`}
          className={`${DOOR} ${SIDE[side]} ${DESTINATION_COLOR[target]}`}
          onClick={() => onEnter(target)}
        >
          <span aria-hidden>{ARROW[side]}</span>
          <span>{target === MAIN_ROOM ? `back to ${ROOMS[target].label}` : ROOMS[target].label}</span>
        </button>
      ))}
    </>
  );
};
