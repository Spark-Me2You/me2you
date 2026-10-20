import React from "react";
import { PinnedRegistrationQR } from "@/features/kiosk";
import { BTN_LG, BTN_PRIMARY, BTN_SECONDARY, GAME_TITLE } from "../../components/gameUi";

interface Props {
  onStart: () => void;
  onGallery: () => void;
  onBack: () => void;
}

export const DrawItMenu: React.FC<Props> = ({ onStart, onGallery, onBack }) => (
  <div className="flex flex-col items-center gap-[60px]">
    <h1 className={GAME_TITLE}>drawit</h1>
    <div className="flex flex-col items-center gap-6">
      <button className={`${BTN_LG} ${BTN_PRIMARY}`} onClick={onStart}>
        start drawing
      </button>
      <button className={`${BTN_LG} ${BTN_SECONDARY}`} onClick={onGallery}>
        view gallery
      </button>
      <button className={`${BTN_LG} ${BTN_SECONDARY}`} onClick={onBack}>
        back
      </button>
    </div>
    <PinnedRegistrationQR side="right" top={145} qrSize={150} />
  </div>
);
