import { useState, useCallback, useMemo } from "react";
import { ClaimSection } from "@/features/claim";
import type { ClaimPayload } from "@/features/claim";
import type { FlapFlapLeaderboardEntry } from "@/features/games/services/gameScoreService";
import { FlapFlapLeaderboard } from "./FlapFlapLeaderboard";
import { BTN_MD, BTN_PRIMARY, BTN_SECONDARY, GAME_OVER_SCRIM } from "../../components/gameUi";

const PRIMARY = `mt-2 ${BTN_MD} ${BTN_PRIMARY}`;
const SECONDARY = `mt-2 ${BTN_MD} ${BTN_SECONDARY}`;

interface GameOverClaimProps {
  score: number;
  onPlayAgain: () => void;
  leaderboardEntries: FlapFlapLeaderboardEntry[];
  isLeaderboardLoading: boolean;
  leaderboardError: string | null;
  onScoreClaimed?: () => void;
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
    <div className={`absolute inset-0 z-[100] flex flex-col items-center justify-center gap-6 ${GAME_OVER_SCRIM}`}>
      {claimed ? (
        <div className="flex flex-col items-center gap-6">
          <span className="text-[96px] leading-none">🏆</span>
          <p className="m-0 font-jersey text-[64px] tracking-brand text-lime text-shadow-pop">score claimed</p>
          <FlapFlapLeaderboard
            className="w-[min(92%,540px)] max-w-[540px]"
            entries={leaderboardEntries}
            isLoading={isLeaderboardLoading}
            error={leaderboardError}
            currentScore={score}
            title="this run vs top scores"
          />
          <button className={PRIMARY} onClick={onPlayAgain}>
            play again
          </button>
        </div>
      ) : (
        <>
          <p className="m-0 font-jersey text-[72px] tracking-brand text-white text-shadow-pop">{score} pipes</p>
          <FlapFlapLeaderboard
            className="w-[min(92%,540px)] max-w-[540px]"
            entries={leaderboardEntries}
            isLoading={isLeaderboardLoading}
            error={leaderboardError}
            currentScore={score}
            title="this run vs top scores"
          />
          <p className="m-0 font-averia text-body-xl text-white/80">
            {isClaimRequested
              ? "scan to save your score"
              : "tap claim my score to generate a qr"}
          </p>
          {isClaimRequested ? (
            <ClaimSection payload={payload} onClaimed={handleClaimed} />
          ) : (
            <button
              className={PRIMARY}
              onClick={handleClaimRequested}
            >
              claim my score
            </button>
          )}
          <button className={SECONDARY} onClick={onPlayAgain}>
            play again
          </button>
        </>
      )}
    </div>
  );
}
