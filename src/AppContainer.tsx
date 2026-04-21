/**
 * App Container Component
 * Contains the authenticated app with state machine
 */

import { useEffect, useRef, useState } from "react";
import { StateProvider, useAppState } from "@/core/state-machine";
import {
  CvCursorOverlay,
  CvCursorEnabledProvider,
  useCvCursorEnabled,
} from "@/core/cv/cursor";
import { SharedCameraProvider } from "@/core/cv/SharedCameraProvider";
import { AppState } from "@/core/state-machine/appStateMachine";
import { ErrorBoundary } from "@/core/monitoring";
import { DiscoveryView } from "@/features/discovery";
import { HubView } from "@/features/hub";
import { RegistrationQRDisplay } from "@/features/kiosk";
import { useAuth } from "@/core/auth";
import logo from "@/assets/me2you.png";
import { GamesView } from "@/features/games";
import otterImage from "@/assets/otter_default_rough_draft.png";
import corkboardImage from "@/assets/corkboard.png";
import handHoverImage from "@/assets/hand_hover.png";
import handClickImage from "@/assets/hand_click.png";
import arrow1 from "@/assets/arrow1.svg";
import arrow2 from "@/assets/arrow2.svg";
import otterHandImage from "@/assets/hand.png";
import polaroidFrame1 from "@/assets/polaroid_frame1.svg";
import polaroidFrame2 from "@/assets/polaroid_frame2.svg";
import numberCircle from "@/assets/number_circle.svg";
import labelBanner1 from "@/assets/label_banner1.svg";
import labelBanner2 from "@/assets/label_banner2b.svg";
import labelBanner3 from "@/assets/label_banner3.svg";
import pinkBackArrow from "@/assets/pink_back_arrow.svg";
import styles from "./AppContainer.module.css";

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

/**
 * App Container Content
 * Renders different views based on current state machine state
 */
function AppContainerContent() {
  const { currentState, transitionTo } = useAppState();
  const { signOut, authMode, exitKioskMode } = useAuth();
  const [showInfo, setShowInfo] = useState(false);
  const [infoArming, setInfoArming] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const infoDwellTimerRef = useRef<number | null>(null);

  const INFO_DWELL_MS = 1400;

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

  const renderCurrentState = () => {
    switch (currentState) {
      case AppState.IDLE:
        return (
          <div className={styles.idleScreen}>
            {/* Background gradient */}
            <div className={styles.backgroundGradient} />

            {/* Logo */}
            <img src={logo} alt="me2you" className={styles.logo} />

            {/* Power icon - top right */}
            <button
              onClick={handleLogout}
              className={styles.powerButton}
              title={authMode === "kiosk" ? "Exit Kiosk Mode" : "Logout"}
            >
              <PowerIcon />
            </button>

            {/* ===== Main glass container (left side) ===== */}
            <div className={styles.mainContainerOuter}>
              <div className={styles.mainContainer}>
                {/* Otter mascot */}
                <img src={otterImage} alt="" className={styles.otterImage} />

                {/* Discover button */}
                <button
                  onClick={() => transitionTo(AppState.DISCOVERY)}
                  className={`${styles.menuButton} ${styles.discoverBtn}`}
                >
                  <span className={styles.btnTitle}>discover</span>
                  <span className={styles.btnSubtitle}>pose. match. connect</span>
                </button>

                {/* Games button */}
                <button
                  onClick={() => transitionTo(AppState.GAMES)}
                  className={`${styles.menuButton} ${styles.gamesBtn}`}
                >
                  <span className={styles.btnTitle}>games</span>
                  <span className={styles.btnSubtitle}>{`compete & earn badges`}</span>
                </button>

                {/* Network button */}
                <button
                  onClick={() => transitionTo(AppState.HUB)}
                  className={`${styles.menuButton} ${styles.networkBtn}`}
                >
                  <span className={styles.btnTitle}>network</span>
                  <span className={styles.btnSubtitle}>{`see yourself & others!`}</span>
                </button>

                {/* Welcome speech bubble */}
                <div className={styles.speechBubble}>
                  <p>welcome to me2you!</p>
                  <p>
                    i'm <span className={styles.ozzyHighlight}>ozzy</span>!
                    nice2meetu ;)
                  </p>
                </div>
              </div>
            </div>

            {/* ===== Cork board tutorial (right side) ===== */}
            <div className={styles.corkBoardOuter}>
              <div className={styles.corkBoard}>
                <img src={corkboardImage} alt="" className={styles.corkBoardBg} />

                {/* NEW HERE? pill */}
                <div className={styles.newHerePill}>
                  <span>NEW HERE?</span>
                </div>

                {/* Step 1 */}
                <div className={styles.step1LabelWrap}>
                  <img src={labelBanner1} alt="" className={styles.labelBannerSvg} />
                  <div className={styles.stepNumberOnLabel}>
                    <img src={numberCircle} alt="" className={styles.numberCircleSvg} />
                    <span className={styles.numberText}>1</span>
                  </div>
                  <p className={styles.step1Label}>make this pose!</p>
                </div>
                <div className={styles.polaroid1}>
                  <img src={polaroidFrame1} alt="" className={styles.polaroidFrameSvg} />
                  <div className={styles.polaroidTape1} />
                  <img src={handHoverImage} alt="Hover gesture" className={styles.polaroid1Img} />
                </div>
                <span className={styles.hoverCaption}>(hover)</span>

                {/* Step 2 */}
                <div className={styles.step2LabelWrap}>
                  <img src={labelBanner2} alt="" className={styles.labelBannerSvg} />
                  <p className={styles.step2Label}>see the cursor? now click by doing this!</p>
                  <div className={styles.stepNumberOnLabelRight}>
                    <img src={numberCircle} alt="" className={styles.numberCircleSvg} />
                    <span className={styles.numberText}>2</span>
                  </div>
                </div>
                <div className={styles.polaroid2}>
                  <img src={polaroidFrame2} alt="" className={styles.polaroidFrameSvg} />
                  <div className={styles.polaroidTape2} />
                  <img src={handClickImage} alt="Click gesture" className={styles.polaroid2Img} />
                </div>
                <img src={arrow1} alt="" className={styles.arrow1} />
                <span className={styles.clickThumbHint}>curve your thumb in!</span>
                <span className={styles.clickCaption}>(click)</span>

                {/* Step 3 */}
                <div className={styles.step3LabelWrap}>
                  <img src={labelBanner3} alt="" className={styles.labelBannerSvg} />
                  <div className={styles.stepNumberOnLabel}>
                    <img src={numberCircle} alt="" className={styles.numberCircleSvg} />
                    <span className={styles.numberText}>3</span>
                  </div>
                  <p className={styles.step3Label}>now click or hover over this!</p>
                </div>
                <img src={arrow2} alt="" className={styles.arrow2} />

                {/* Info button with dwell-to-open trace animation */}
                <div className={styles.infoButtonWrap}>
                  <button
                    ref={infoButtonRef}
                    className={styles.infoButton}
                    onClick={() => setShowInfo(true)}
                  >
                    info!!
                  </button>
                  <svg
                    className={`${styles.infoTrace} ${infoArming ? styles.infoTraceActive : ""}`}
                    viewBox="0 0 273 108"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="3.5"
                      y="3.5"
                      width="266"
                      height="101"
                      rx="42.5"
                      ry="42.5"
                      pathLength={100}
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* ===== QR code section (bottom right) ===== */}
            <div className={styles.qrSection}>
              {/* Pink thin-outline box */}
              <div className={styles.qrBox}>
                <RegistrationQRDisplay className={styles.qrInner} />
              </div>

              {/* Otter hand */}
              <img src={otterHandImage} alt="" className={styles.otterHand} />

              {/* Text + arrow */}
              <p className={styles.qrText}>
                scan here to create and edit your profile!
              </p>
              <img src={arrow2} alt="" className={styles.arrowQr} />
            </div>

            {/* ===== Info overlay ===== */}
            {showInfo && (
              <>
                {/* Dark background — unscaled, covers full screen */}
                <div className={styles.infoOverlayBg} />

                {/* Cork board — unscaled, full size */}
                <img src={corkboardImage} alt="" className={styles.infoCorkBoard} />

              <div className={styles.infoOverlay}>

                {/* "about" title */}
                <p className={styles.infoAboutTitle}>about</p>

                {/* Card 1: me2you is... */}
                <div className={styles.infoCard1}>
                  <img src={polaroidFrame1} alt="" className={styles.infoCardFrame} />
                  <div className={styles.infoCardTape} />
                  <div className={styles.infoCard1Content}>
                    <p><strong>me2you</strong> is...<br />a digital installation meant for light-hearted community interaction!</p>
                  </div>
                </div>

                {/* Card 2: you can... */}
                <div className={styles.infoCard2}>
                  <img src={polaroidFrame1} alt="" className={styles.infoCardFrame} />
                  <div className={styles.infoCardTape} />
                  <div className={styles.infoCard2Content}>
                    <p><strong>you can...</strong></p>
                    <ul>
                      <li>see who is in your community</li>
                      <li>play games powered by computer vision</li>
                      <li>create your own account and interact with others!</li>
                    </ul>
                  </div>
                </div>

                {/* Card 3: privacy */}
                <div className={styles.infoCard3}>
                  <img src={polaroidFrame1} alt="" className={styles.infoCardFrame} />
                  <div className={styles.infoCardTape} />
                  <div className={styles.infoCard3Content}>
                    <p><strong>concerned about privacy?</strong></p>
                    <ul>
                      <li>me2you does not save any of your information, even if you interact with our features!</li>
                      <li>we only save your info if you make an account!</li>
                    </ul>
                  </div>
                </div>

                {/* Otter */}
                <img src={otterImage} alt="" className={styles.infoOtter} />
                <p className={styles.infoHaveFun}>have fun!</p>

                {/* Close / next arrow button */}
                <button className={styles.infoCloseBtn} onClick={() => setShowInfo(false)}>
                  <img src={pinkBackArrow} alt="next" style={{ width: '100px', transform: 'rotate(180deg)' }} />
                </button>
              </div>
              </>
            )}
          </div>
        );

      case AppState.AUTH:
        return (
          <div>
            <h1>Authentication</h1>
            <p>Please swipe your card</p>
          </div>
        );

      case AppState.ONBOARDING:
        return (
          <div>
            <h1>Welcome!</h1>
            <p>Let's create your profile</p>
          </div>
        );

      case AppState.HUB:
        return <HubView />;

      case AppState.DISCOVERY:
        return <DiscoveryView />;

      case AppState.GAMES:
        return <GamesView />;

      default:
        return (
          <div>
            <h1>Unknown State</h1>
          </div>
        );
    }
  };

  return (
    <ErrorBoundary>
      <div className={styles.app}>{renderCurrentState()}</div>
    </ErrorBoundary>
  );
}

function AppContainerInner() {
  const { enabled } = useCvCursorEnabled();
  return (
    <>
      <AppContainerContent />
      <CvCursorOverlay enabled={enabled} />
    </>
  );
}

function AppContainer() {
  return (
    <CvCursorEnabledProvider>
      <SharedCameraProvider>
        <StateProvider>
          <AppContainerInner />
        </StateProvider>
      </SharedCameraProvider>
    </CvCursorEnabledProvider>
  );
}

export default AppContainer;
