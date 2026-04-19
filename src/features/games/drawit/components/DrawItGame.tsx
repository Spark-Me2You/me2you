import React, { useState, useCallback } from "react";
import type { GameProps } from "../../types/game";
import type { ScreenState } from "../types/drawit";
import { DrawItMenu } from "./DrawItMenu";
import { DailyPromptScreen } from "./DailyPromptScreen";
import { Countdown } from "./Countdown";
import { DrawingCanvas } from "./DrawingCanvas";
import { ReviewScreen } from "./ReviewScreen";
import { Gallery } from "./Gallery";
import styles from "./DrawItGame.module.css";

export const DrawItGame: React.FC<GameProps> = ({ onExit }) => {
  const [screen, setScreen] = useState<ScreenState>("MENU");
  const [word, setWord] = useState<string>("");
  const [imageDataUrl, setImageDataUrl] = useState<string>("");

  const toMenu = useCallback(() => {
    setImageDataUrl("");
    setScreen("MENU");
  }, []);

  const handleProceed = (w: string) => {
    setWord(w);
    setScreen("COUNTDOWN");
  };

  const handleCanvasSubmit = (dataUrl: string) => {
    setImageDataUrl(dataUrl);
    setScreen("REVIEW");
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
        <DrawingCanvas word={word} onSubmit={handleCanvasSubmit} />
      )}

      {screen === "REVIEW" && (
        <ReviewScreen
          word={word}
          imageDataUrl={imageDataUrl}
          onClaim={() => {
            // TODO(drawit): once the QR claim backend is ready, the scan will
            // trigger the upload to the gallery bucket + insert. For now the
            // QR is a placeholder and the drawing only reaches the gallery
            // after the user completes the claim flow on their device.
          }}
          onDiscard={toMenu}
        />
      )}

      {screen === "GALLERY" && <Gallery onBack={toMenu} />}
    </div>
  );
};
