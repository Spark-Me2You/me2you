import { useEffect } from "react";
import corkboardImage from "@/assets/corkboard.png";
import DiscoverGif from "@/assets/discovergif.gif";
import otterImage from "@/assets/otter_default_rough_draft.png";

const DEFAULT_BULLETS = [
  "Strike one of these three poses (peace, wave, thumbs up) and see another person in your space shoot one back at you!",
  "Want to learn more about them? Hold that pose!! Their profile will expand and you'll be able to see more and make your own account!",
  "Having issues? Make sure to stand in the camera frame so we can see your hands! Remember to slow down and exaggerate your movements for the best results!",
];

type HelpPopupProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  bullets?: string[];
  gifSrc?: string;
};

export const HelpPopup: React.FC<HelpPopupProps> = ({
  isOpen,
  onClose,
  title = "confused?",
  bullets = DEFAULT_BULLETS,
  gifSrc = DiscoverGif,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[200] animate-fade-in bg-[rgba(0,0,0,0.55)]" onClick={onClose} />
      <div
        className="fixed top-1/2 right-[5%] z-[201] w-[min(900px,80vw)] -translate-y-1/2 animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-label="help"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-[30px] right-[50px] z-[2] flex h-14 w-14 cursor-pointer items-center justify-center rounded-[12px] border-[3px] border-solid border-white bg-[#e44805] font-jersey text-[32px] leading-none text-white shadow-[0_4px_8px_rgba(0,0,0,0.3)] [transition:transform_120ms_ease,background-color_120ms_ease] hover:bg-[#b8360a] hover:[transform:scale(1.06)] active:[transform:scale(0.96)]"
          onClick={onClose}
          aria-label="close help"
        >
          ×
        </button>
        <img src={corkboardImage} alt="" className="pointer-events-none block h-auto w-full select-none" />
        <img src={otterImage} alt="" className="pointer-events-none absolute bottom-[-38px] left-0 z-[1] h-auto w-[45%] object-contain select-none" />
        <h2 className="absolute top-[6%] left-[6%] z-[1] m-0 font-jersey text-[60px] tracking-[4px] text-white lowercase [text-shadow:2px_2px_0_rgba(0,0,0,0.4)]">{title}</h2>
        <div className="absolute inset-0 z-[1] grid grid-cols-[1fr_1fr] gap-8 p-[6%]">
          <div className="relative flex min-w-0 items-start justify-center pt-[25%]">
            <img src={gifSrc} alt="" className="max-h-[60%] max-w-full rounded-[8px] object-contain" />
          </div>
          <div className="flex min-w-0 flex-col items-center justify-start pt-[4%]">
            <div className="relative min-h-[70%] w-[75%] overflow-visible rounded-[6px] bg-[#ffeeb0] pt-8 pr-[22px] pb-[26px] pl-[22px] shadow-[0_4px_6px_rgba(0,0,0,0.22),inset_0_0_4px_rgba(0,0,0,0.15)]">
              <div className="absolute top-[-14px] left-1/2 z-[1] h-6 w-[110px] -translate-x-1/2 rotate-[-4deg] bg-magenta shadow-[0_2px_4px_rgba(0,0,0,0.22)]" />
              <ul className="m-0 list-disc pl-[1.2em] font-averia text-[18px] leading-[1.35] tracking-[1.2px] text-[#1a1a1a] [&>li]:mb-[10px] [&>li:last-child]:mb-0">
                {bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
