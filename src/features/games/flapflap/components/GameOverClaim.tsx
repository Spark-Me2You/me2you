import { useState, useCallback, useMemo } from "react";
import { ClaimQR, useClaimQR } from "@/features/claim";
import type { ClaimPayload } from "@/features/claim";
import type { FlapFlapLeaderboardEntry } from "@/features/games/services/gameScoreService";
import { FlapFlapLeaderboard } from "./FlapFlapLeaderboard";
import styles from "./GameOverClaim.module.css";

interface GameOverClaimProps {
  score: number;
  onPlayAgain: () => void;
  leaderboardEntries: FlapFlapLeaderboardEntry[];
  isLeaderboardLoading: boolean;
  leaderboardError: string | null;
  onScoreClaimed?: () => void;
}

interface ClaimSectionProps {
  payload: ClaimPayload;
  onClaimed: () => void;
}

function ClaimSection({ payload, onClaimed }: ClaimSectionProps) {
  const { claim, isGenerating, error, secondsRemaining, regenerate } =
    useClaimQR(payload, { onClaimed: () => onClaimed() });

  return (
    <ClaimQR
      claim={claim}
      isGenerating={isGenerating}
      error={error}
      secondsRemaining={secondsRemaining}
      onRegenerate={regenerate}
    />
  );
}

export function GameOverClaim({
  score,
  onPlayAgain,
  leaderboardEntries,
  isLeaderboardLoading,
  leaderboardError,
  onScoreClaimed,
}: GameOverClaimProps) {
  const [claimed, setClaimed] = useState(false);
  const [isClaimRequested, setIsClaimRequested] = useState(false);

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
    [score],
  );

  const handleClaimed = useCallback(() => {
    setClaimed(true);
    onScoreClaimed?.();
  }, [onScoreClaimed]);

  const handleClaimRequested = useCallback(() => {
    setIsClaimRequested(true);
  }, []);

  return (
    <div className={styles.overlay}>
      {claimed ? (
        <div className={styles.confirmedState}>
          <span className={styles.trophy}>🏆</span>
          <p className={styles.confirmedText}>Score saved!</p>
          <FlapFlapLeaderboard
            className={styles.overlayLeaderboard}
            entries={leaderboardEntries}
            isLoading={isLeaderboardLoading}
            error={leaderboardError}
            currentScore={score}
            title="this run vs top scores"
          />
          <button className={styles.playAgainButton} onClick={onPlayAgain}>
            play again
          </button>
        </div>
      ) : (
        <>
          <p className={styles.scoreText}>{score} pipes</p>
          <FlapFlapLeaderboard
            className={styles.overlayLeaderboard}
            entries={leaderboardEntries}
            isLoading={isLeaderboardLoading}
            error={leaderboardError}
            currentScore={score}
            title="this run vs top scores"
          />
          <p className={styles.instruction}>
            {isClaimRequested
              ? "scan to save your score"
              : "tap claim my score to generate a qr"}
          </p>
          {isClaimRequested ? (
            <ClaimSection payload={payload} onClaimed={handleClaimed} />
          ) : (
            <button
              className={styles.claimButton}
              onClick={handleClaimRequested}
            >
              claim my score
            </button>
          )}
          <button className={styles.playAgainButton} onClick={onPlayAgain}>
            play again
          </button>
        </>
      )}
    </div>
  );
}
