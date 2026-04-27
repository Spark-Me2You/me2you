import { useEffect } from "react";
import corkboardImage from "@/assets/corkboard.png";
import cvMouseGif from "@/assets/cvmousegif.gif";
import styles from "./HelpPopup.module.css";

const DEFAULT_BULLETS = [
  "stand in the camera frame so we can see your hands",
  "make one of the poses shown at the top to play",
  "hold the pose until you see the match flash",
  "tap exit any time to leave",
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
  gifSrc = cvMouseGif,
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
        <div className={styles.content}>
          <div className={styles.leftCol}>
            <img src={gifSrc} alt="" className={styles.gif} />
          </div>
          <div className={styles.rightCol}>
            <h2 className={styles.title}>{title}</h2>
            <ul className={styles.list}>
              {bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};
