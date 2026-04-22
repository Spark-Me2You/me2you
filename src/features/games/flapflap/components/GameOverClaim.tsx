import { useState, useCallback, useMemo } from "react";
import { ClaimQR, useClaimQR } from "@/features/claim";
import type { ClaimPayload } from "@/features/claim";
import styles from "./GameOverClaim.module.css";

interface GameOverClaimProps {
  score: number;
  onPlayAgain: () => void;
}

export function GameOverClaim({ score, onPlayAgain }: GameOverClaimProps) {
  const [claimed, setClaimed] = useState(false);

  const payload = useMemo<ClaimPayload>(
    () => ({
      version: "1.0",
      type: "game_score",
      display: {
        title: `FlapFlap: ${score} pipes`,
        description: "Scan to save this run to your profile.",
        icon: "trophy",
      },
      data: {
        game_id: "flapflap",
        score,
        played_at: new Date().toISOString(),
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // score is fixed at game-over time; memo intentionally never re-runs
  );

  const handleClaimed = useCallback(() => {
    setClaimed(true);
  }, []);

  const { claim, isGenerating, error, secondsRemaining, regenerate } =
    useClaimQR(payload, { onClaimed: handleClaimed });

  return (
    <div className={styles.overlay}>
      {claimed ? (
        <div className={styles.confirmedState}>
          <span className={styles.trophy}>🏆</span>
          <p className={styles.confirmedText}>Score saved!</p>
          <button className={styles.playAgainButton} onClick={onPlayAgain}>
            play again
          </button>
        </div>
      ) : (
        <>
          <p className={styles.scoreText}>{score} pipes</p>
          <p className={styles.instruction}>scan to save your score</p>
          <ClaimQR
            claim={claim}
            isGenerating={isGenerating}
            error={error}
            secondsRemaining={secondsRemaining}
            onRegenerate={regenerate}
          />
          <button className={styles.playAgainButton} onClick={onPlayAgain}>
            play again
          </button>
        </>
      )}
    </div>
  );
}
