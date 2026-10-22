import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/core/state-machine";
import { AppState } from "@/core/state-machine/appStateMachine";
import { useAuth } from "@/core/auth";
import logo from "@/assets/me2you.png";
import otterImage from "@/assets/otter_default_rough_draft.png";
import corkboardImage from "@/assets/corkboard.png";
import arrow2 from "@/assets/arrow2.svg";
import otterHandImage from "@/assets/hand.png";
import cvMouseGif from "@/assets/cvmousegif.gif";
import { RegistrationQRDisplay } from "./RegistrationQRDisplay";
import { InfoOverlay } from "./InfoOverlay";

const INFO_DWELL_MS = 1400;

const MENU_BUTTON =
  "absolute z-[2] flex cursor-pointer flex-col items-center justify-center gap-1 rounded-glass border-0 text-white shadow-glass-card";
const BTN_TITLE = "font-jersey text-display-xl leading-none tracking-brand lowercase";
const BTN_SUBTITLE = "font-averia text-body-xl leading-none font-bold tracking-brand lowercase";
const TAPE = "absolute left-1/2 bg-tape";

/** Simple power icon SVG, white, 48px */
function PowerIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}

/** Kiosk idle screen. Designed at 1920x1080 and scaled to fit the viewport. */
export function IdleScreen() {
  const { transitionTo } = useAppState();
  const { signOut, authMode, exitKioskMode } = useAuth();
  const [showInfo, setShowInfo] = useState(false);
  const [infoArming, setInfoArming] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const infoDwellTimerRef = useRef<number | null>(null);

  const clearInfoTimer = () => {
    if (infoDwellTimerRef.current) {
      clearTimeout(infoDwellTimerRef.current);
      infoDwellTimerRef.current = null;
    }
  };

  // Dwell-to-open: traces a ring around the info button while the cursor hovers;
  // when the trace completes the info overlay opens.
  useEffect(() => {
    const btn = infoButtonRef.current;
    if (!btn) return;

    const onEnter = () => {
      if (showInfo) return;
      clearInfoTimer();
      setInfoArming(true);
      infoDwellTimerRef.current = window.setTimeout(() => {
        setInfoArming(false);
        setShowInfo(true);
      }, INFO_DWELL_MS);
    };
    const onLeave = () => {
      clearInfoTimer();
      setInfoArming(false);
    };

    btn.addEventListener("mouseenter", onEnter);
    btn.addEventListener("mouseleave", onLeave);
    return () => {
      btn.removeEventListener("mouseenter", onEnter);
      btn.removeEventListener("mouseleave", onLeave);
      clearInfoTimer();
    };
  }, [showInfo]);

  const handleLogout = async () => {
    try {
      if (authMode === "kiosk") {
        await exitKioskMode();
      } else {
        await signOut();
      }
    } catch (error) {
      console.error("[AppContainer] Logout failed:", error);
    }
  };

  return (
    <div className="relative h-[1080px] w-[1920px] origin-top-left [transform:scale(min(calc(100vw_/_1920),calc(100vh_/_1080)))]">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-page-gradient" />

      {/* Logo */}
      <img
        src={logo}
        alt="me2you"
        className="pointer-events-none absolute top-8 left-1/4 z-[5] w-[800px] max-w-[60vw] select-none [transform:scale(0.93)_translateX(-50%)]"
      />

      {/* Power icon - top left */}
      <button
        onClick={handleLogout}
        className="absolute top-[3px] left-[3px] z-10 scale-[0.79] cursor-pointer border-0 bg-transparent p-2 opacity-70 transition-opacity duration-200 hover:opacity-100"
        title={authMode === "kiosk" ? "Exit Kiosk Mode" : "Logout"}
      >
        <PowerIcon />
      </button>

      {/* ===== Main glass container (left side) ===== */}
      <div className="absolute top-[10.5%] -left-[18.77%] z-[1] flex items-center justify-center">
        <div className="relative h-[711px] w-[1511px] rounded-[40px] bg-glass shadow-glass-card [transform:scale(0.7)_rotate(-2.05deg)]">
          {/* Otter mascot */}
          <img
            src={otterImage}
            alt=""
            className="pointer-events-none absolute top-[50px] left-[310px] z-[4] h-[313px] w-[448px] object-contain select-none"
          />

          {/* Discover button */}
          <button
            onClick={() => transitionTo(AppState.DISCOVERY)}
            className={`${MENU_BUTTON} inset-[7.2%_12.96%_68.18%_50.97%] bg-action-discover`}
          >
            <span className={BTN_TITLE}>discover</span>
            <span className={BTN_SUBTITLE}>pose. match. connect</span>
          </button>

          {/* Games button */}
          <button
            onClick={() => transitionTo(AppState.GAMES)}
            className={`${MENU_BUTTON} inset-[37.67%_2.45%_37.71%_61.48%] bg-action-games`}
          >
            <span className={BTN_TITLE}>games</span>
            <span className={BTN_SUBTITLE}>compete & earn badges</span>
          </button>

          {/* Network button */}
          <button
            onClick={() => transitionTo(AppState.HUB)}
            className={`${MENU_BUTTON} inset-[66.56%_12.38%_8.82%_51.55%] bg-action-network/93`}
          >
            <span className={BTN_TITLE}>network</span>
            <span className={BTN_SUBTITLE}>see yourself & others!</span>
          </button>

          {/* Welcome speech bubble */}
          <div className="absolute inset-[39.03%_42.08%_37.34%_10.01%] z-[3] flex flex-col items-center justify-center rounded-glass bg-lime text-center font-averia text-body-xl leading-[1.4] tracking-brand text-ink shadow-glass-card">
            <p className="m-0 leading-[1.4]">welcome to me2you!</p>
            <p className="m-0 leading-[1.4]">
              i'm <span className="font-averia font-bold text-magenta">ozzy</span>! nice2meetu ;)
            </p>
          </div>
        </div>
      </div>

      {/* ===== Cork board tutorial (right side) ===== */}
      <div className="absolute -top-[4%] right-[7%] z-[2] h-[613px] w-[910px] origin-center overflow-hidden rounded-[8px] [transform:scale(0.67)_rotate(173.26deg)]">
        <img src={corkboardImage} alt="" className="h-[103%] w-[103%]" />

        {/* Corner title (top-left of corkboard) */}
        <div className="pointer-events-none absolute right-0 bottom-[5%] z-[3] w-[500px] origin-center text-center font-jersey text-display-lg leading-[normal] font-normal tracking-[6.97px] text-white not-italic [transform:rotate(180.591deg)]">
          MOUSE TUTORIAL
        </div>

        {/* Gesture demo gif (with pink tape on top) */}
        <div className="pointer-events-none absolute right-[4%] bottom-[20%] z-[5] h-[35%] w-[40%] [transform:rotate(175deg)]">
          <img src={cvMouseGif} alt="Hover and click gesture demo" className="block h-full w-full object-contain" />
          <div className={`${TAPE} -top-[10px] z-[6] h-6 w-[110px] shadow-tape [transform:translateX(-50%)_rotate(6deg)]`} />
        </div>

        {/* Pink-tape label below gif */}
        <div className="absolute right-[42%] bottom-[20%] z-[4] box-content flex h-[375px] w-[200px] items-start justify-start overflow-visible rounded-[6px] bg-note pt-[22px] pr-6 pb-6 pl-6 shadow-note [transform:rotate(184deg)]">
          <div className={`${TAPE} -top-3 z-[5] h-[22px] w-[90px] [transform:translateX(-50%)_rotate(-4deg)]`} />
          <ul className="m-0 list-disc py-0 pr-0 pl-[1.2em] text-left font-averia text-[22px] tracking-[2px] text-ink">
            <li className="mb-2 leading-[1.2] last:mb-0">use your pointer finger to move the mouse!</li>
            <li className="mb-2 leading-[1.2] last:mb-0">curve your thumb in like this to click!</li>
            <li className="mb-2 leading-[1.2] last:mb-0">now practice by clicking this button!</li>
          </ul>
        </div>

        <img src={arrow2} alt="" className="pointer-events-none absolute top-1/4 right-1/2 z-[4] h-4 w-[44px] [transform:rotate(-20deg)]" />

        {/* Info button with dwell-to-open trace animation */}
        <div className="absolute top-[20%] right-[8%] z-[4] h-[108px] w-[273px] [transform:rotate(187deg)]">
          <button
            ref={infoButtonRef}
            className="absolute top-0 left-0 z-[1] m-0 box-border flex h-[108px] w-[273px] cursor-pointer items-center justify-center rounded-glass border-[7px] border-solid border-lime bg-magenta p-0 font-jersey text-display-md tracking-brand text-[#f5f5f5] lowercase shadow-glass-card"
            onClick={() => setShowInfo(true)}
          >
            info!!
          </button>
          <svg
            className="pointer-events-none absolute top-0 left-0 z-[2] h-[108px] w-[273px] overflow-visible"
            viewBox="0 0 273 108"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {/* Stroke sits exactly over the 7px yellow border (centerline at 3.5px inset).
                dashoffset is an attribute so the animation can drive it past the !important utilities. */}
            <rect
              x="3.5"
              y="3.5"
              width="266"
              height="101"
              rx="42.5"
              ry="42.5"
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={100}
              className={`fill-none stroke-violet [stroke-linecap:butt] [stroke-linejoin:miter] [stroke-width:8] [filter:drop-shadow(0_0_6px_rgba(124,92,255,0.65))] ${
                infoArming ? "animate-info-trace opacity-100" : "opacity-0"
              }`}
            />
          </svg>
        </div>
      </div>

      {/* ===== QR code section (bottom right) ===== */}
      <div className="pointer-events-none fixed right-4 bottom-0 z-10 h-[15rem] w-[30rem]">
        <div className="absolute top-0 left-4 z-[4] flex origin-top-left scale-[0.65] items-center justify-center">
          <RegistrationQRDisplay className="box-content h-[277px] w-[277px] rounded-glass bg-magenta/93 p-6 shadow-glass-card [transform:rotate(-7.2deg)]" />
        </div>

        {/* Otter hand */}
        <img src={otterHandImage} alt="" className="pointer-events-none absolute bottom-0 left-0 z-[6] w-[120px] scale-[1.2] object-contain select-none" />

        {/* Text + arrow */}
        <p className="absolute top-4 right-0 z-[4] m-0 w-[15rem] text-center font-averia text-[32px] leading-[1.1] tracking-brand text-ink [transform:rotate(5.04deg)]">
          scan here to create and edit your profile!
        </p>
        <img src={arrow2} alt="" className="pointer-events-none absolute top-[11rem] right-[8rem] z-[4] h-4 w-[34px] [transform:rotate(171.44deg)]" />
      </div>

      {showInfo && <InfoOverlay onClose={() => setShowInfo(false)} />}
    </div>
  );
}
