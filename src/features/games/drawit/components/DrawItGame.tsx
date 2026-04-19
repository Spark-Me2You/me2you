import React, { useState, useCallback } from "react";
import type { GameProps } from "../../types/game";
import type { ScreenState } from "../types/drawit";
import { DrawItMenu } from "./DrawItMenu";
import { DailyPromptScreen } from "./DailyPromptScreen";
import { Countdown } from "./Countdown";
import { DrawingCanvas } from "./DrawingCanvas";
import { ReviewScreen } from "./ReviewScreen";
import { Gallery } from "./Gallery";
import { uploadDrawing } from "../utils/gallerySupabase";
import styles from "./DrawItGame.module.css";

export const DrawItGame: React.FC<GameProps> = ({ onExit }) => {
  const [screen, setScreen] = useState<ScreenState>("MENU");
  const [word, setWord] = useState<string>("");
  const [imageDataUrl, setImageDataUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const toMenu = useCallback(() => {
    setImageDataUrl("");
    setSubmitError(null);
    setScreen("MENU");
  }, []);

  const handleProceed = (w: string) => {
    setWord(w);
    setScreen("COUNTDOWN");
  };

  const handleCanvasSubmit = (dataUrl: string) => {
    setImageDataUrl(dataUrl);
    setSubmitError(null);
    setScreen("REVIEW");
  };

  const handleSubmitToGallery = async () => {
    if (!imageDataUrl || !word) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await uploadDrawing(imageDataUrl, word);
      setSubmitting(false);
      setScreen("GALLERY");
    } catch (e) {
      setSubmitting(false);
      setSubmitError(e instanceof Error ? e.message : "Submission failed");
    }
  };

  return (
    <div className={styles.container}>
      <button className={styles.exitButton} onClick={onExit}>
        exit
      </button>

      {screen === "MENU" && <DrawItMenu onStart={() => setScreen("PROMPT")} onBack={onExit} />}

      {screen === "PROMPT" && (
        <DailyPromptScreen onProceed={handleProceed} onBack={toMenu} />
      )}

      {screen === "COUNTDOWN" && <Countdown onDone={() => setScreen("DRAWING")} />}

      {screen === "DRAWING" && (
        <DrawingCanvas word={word} onSubmit={handleCanvasSubmit} onBack={toMenu} />
      )}

      {screen === "REVIEW" && (
        <ReviewScreen
          word={word}
          imageDataUrl={imageDataUrl}
          submitting={submitting}
          error={submitError}
          onSubmit={handleSubmitToGallery}
          onDiscard={toMenu}
          onClaim={() => {
            /* QR placeholder shown inline in ReviewScreen */
          }}
        />
      )}

      {screen === "GALLERY" && <Gallery onBack={toMenu} />}
    </div>
  );
};
