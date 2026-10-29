import { useState, useCallback, useMemo } from "react";
import { ClaimSection } from "@/features/claim";
import type { ClaimPayload } from "@/features/claim";
import type { FlapFlapLeaderboardEntry } from "@/features/games/services/gameScoreService";
import { FlapFlapLeaderboard } from "./FlapFlapLeaderboard";

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
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-[rgba(10,10,20,0.88)] backdrop-blur-[6px]">
      {claimed ? (
        <div className="flex flex-col items-center gap-6">
          <span className="text-[96px] leading-none">🏆</span>
          <p className="m-0 font-jersey text-[64px] tracking-[3px] text-[#ffd700] [text-shadow:0_0_24px_rgba(255,215,0,0.5)]">Score Claimed</p>
          <FlapFlapLeaderboard
            className="w-[min(92%,540px)] max-w-[540px]"
            entries={leaderboardEntries}
            isLoading={isLeaderboardLoading}
            error={leaderboardError}
            currentScore={score}
            title="this run vs top scores"
          />
          <button className="mt-2 cursor-pointer rounded-[16px] border-[3px] border-solid px-12 py-4 font-jersey text-[36px] tracking-[4px] backdrop-blur-[10px] transition-all duration-200 ease-[ease] hover:[transform:scale(1.05)] border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.1)] text-white hover:border-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.2)]" onClick={onPlayAgain}>
            play again
          </button>
        </div>
      ) : (
        <>
          <p className="m-0 font-jersey text-[72px] tracking-[2px] text-white [text-shadow:0_0_20px_rgba(255,215,0,0.6)]">{score} pipes</p>
          <FlapFlapLeaderboard
            className="w-[min(92%,540px)] max-w-[540px]"
            entries={leaderboardEntries}
            isLoading={isLeaderboardLoading}
            error={leaderboardError}
            currentScore={score}
            title="this run vs top scores"
          />
          <p className="m-0 font-jersey text-[36px] tracking-[2px] text-[rgba(255,255,255,0.7)]">
            {isClaimRequested
              ? "scan to save your score"
              : "tap claim my score to generate a qr"}
          </p>
          {isClaimRequested ? (
            <ClaimSection payload={payload} onClaimed={handleClaimed} />
          ) : (
            <button
              className="mt-2 cursor-pointer rounded-[16px] border-[3px] border-solid px-12 py-4 font-jersey text-[36px] tracking-[4px] backdrop-blur-[10px] transition-all duration-200 ease-[ease] hover:[transform:scale(1.05)] border-[rgba(255,215,0,0.55)] bg-[rgba(255,215,0,0.12)] text-[#fff7cf] hover:border-[rgba(255,215,0,0.8)] hover:bg-[rgba(255,215,0,0.2)] hover:text-white"
              onClick={handleClaimRequested}
            >
              claim my score
            </button>
          )}
          <button className="mt-2 cursor-pointer rounded-[16px] border-[3px] border-solid px-12 py-4 font-jersey text-[36px] tracking-[4px] backdrop-blur-[10px] transition-all duration-200 ease-[ease] hover:[transform:scale(1.05)] border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.1)] text-white hover:border-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.2)]" onClick={onPlayAgain}>
            play again
          </button>
        </>
      )}
    </div>
  );
}
