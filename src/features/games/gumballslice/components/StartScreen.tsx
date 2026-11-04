/**
 * Start Screen
 * Title, item legend, how-to-play demo and a Ready button, with the real
 * Spark candy machine (the prize) in a framed tab pinned to the left edge,
 * mirroring the registration QR tab on the right. The hand that taps
 * Ready becomes the locked player.
 */

import React from "react";
import { PinnedRegistrationQR } from "@/features/kiosk";
import { ExitButton } from "@/shared/components";
import candyMachineImg from "../../../../assets/candymachine.png";
import { GUMBALL_SLICE_CONFIG as C } from "../config/gumballSliceConfig";
import { ItemIcon } from "./ItemIcon";
import { SliceDemo } from "./SliceDemo";

const LABEL =
  "ml-[6px] font-jersey text-[clamp(28px,5vh,52px)] tracking-[4px] [text-shadow:3px_3px_0_rgba(0,0,0,0.45)]";

interface Props {
  onReady: () => void;
  onBack: () => void;
}

export const StartScreen: React.FC<Props> = ({ onReady, onBack }) => (
  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-[clamp(10px,2.5vh,28px)] px-6 py-[clamp(16px,4vh,48px)]">
    <ExitButton onClick={onBack} label="back" />

    <div className="pointer-events-none absolute top-[145px] left-0 flex flex-col items-center gap-2 rounded-r-[18px] bg-magenta/93 px-4 py-[14px] shadow-glass-card">
      <p className="m-0 font-jersey text-[clamp(22px,3.4vh,34px)] leading-none tracking-[3px] text-white">win real candy!</p>
      <div className="rounded-[6px] bg-white p-[10px] shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
        <img src={candyMachineImg} alt="The Spark candy machine" className="block h-[clamp(180px,34vh,360px)] w-auto max-w-none" />
      </div>
    </div>

    <h1 className="m-0 text-center font-jersey text-[clamp(64px,14vh,160px)] leading-none tracking-[8px] text-white [text-shadow:4px_4px_0_rgba(0,0,0,0.4),0_6px_0_var(--color-magenta)]">Gumball Slice</h1>

    <div className="flex flex-wrap justify-center gap-[clamp(24px,6vw,80px)]">
      <div className="flex items-center gap-[clamp(6px,1.2vh,14px)]">
        <ItemIcon kind="candy" className="size-[clamp(56px,10vh,104px)] drop-shadow-[3px_4px_0_rgba(0,0,0,0.35)]" />
        <span className={`${LABEL} text-white`}>slice candy!</span>
      </div>
      <div className="flex items-center gap-[clamp(6px,1.2vh,14px)]">
        <ItemIcon kind="broccoli" className="size-[clamp(56px,10vh,104px)] drop-shadow-[3px_4px_0_rgba(0,0,0,0.35)]" />
        <span className={`${LABEL} text-orange/93`}>avoid broccoli</span>
      </div>
    </div>

    <SliceDemo />

    <p className="m-0 text-center font-jersey text-[clamp(22px,3.6vh,38px)] tracking-[3px] text-white [text-shadow:2px_2px_0_rgba(0,0,0,0.45)]">
      slice as many candies as you can in {C.ROUND_SECONDS} seconds!
    </p>

    <button className="cursor-pointer rounded-[14px] border-4 border-solid border-white bg-white px-[clamp(48px,8vw,96px)] py-[clamp(10px,2vh,20px)] font-jersey text-[clamp(32px,5.5vh,56px)] tracking-[4px] text-[#4e2c14] shadow-[0_6px_0_rgba(0,0,0,0.35)] transition-transform duration-[120ms] ease-[ease] hover:[transform:scale(1.05)]" onClick={onReady}>
      Ready
    </button>

    <PinnedRegistrationQR side="right" top={145} qrSize={150} />
  </div>
);
