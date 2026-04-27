import { useEffect } from "react";
import corkboardImage from "@/assets/corkboard.png";
import DiscoverGif from "@/assets/discovergif.gif";
import otterImage from "@/assets/otter_default_rough_draft.png";
import styles from "./HelpPopup.module.css";

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
      <div className={styles.backdrop} onClick={onClose} />
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="help"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="close help"
        >
          ×
        </button>
        <img src={corkboardImage} alt="" className={styles.cork} />
        <img src={otterImage} alt="" className={styles.otter} />
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.content}>
          <div className={styles.leftCol}>
            <img src={gifSrc} alt="" className={styles.gif} />
          </div>
          <div className={styles.rightCol}>
            <div className={styles.bulletCard}>
              <div className={styles.bulletCardTape} />
              <ul className={styles.list}>
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
