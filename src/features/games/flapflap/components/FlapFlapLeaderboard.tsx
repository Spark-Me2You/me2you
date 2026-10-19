import React, { useMemo } from "react";
import type { FlapFlapLeaderboardEntry } from "@/features/games/services/gameScoreService";

interface FlapFlapLeaderboardProps {
  entries: FlapFlapLeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  currentScore?: number;
  title?: string;
  className?: string;
}

interface DisplayEntryRow {
  type: "entry";
  rank: number;
  label: string;
  score: number;
  isCurrentRun: boolean;
}

interface DisplayYouRow {
  type: "you";
  score: number;
  rank: number;
}

const MAX_ROWS = 5;

function buildDisplayRows(
  entries: FlapFlapLeaderboardEntry[],
  currentScore?: number,
): {
  rows: DisplayEntryRow[];
  youOutsideTopFive: DisplayYouRow | null;
} {
  const topRows = entries.slice(0, MAX_ROWS);

  if (typeof currentScore !== "number") {
    return {
      rows: topRows.map((entry) => ({
        type: "entry",
        rank: entry.rank,
        label: entry.playerName,
        score: entry.score,
        isCurrentRun: false,
      })),
      youOutsideTopFive: null,
    };
  }

  const insertionIndex = topRows.findIndex(
    (entry) => currentScore >= entry.score,
  );
  const canFitInTopFive = insertionIndex >= 0 || topRows.length < MAX_ROWS;

  if (canFitInTopFive) {
    const insertAt = insertionIndex >= 0 ? insertionIndex : topRows.length;
    const syntheticRows: DisplayEntryRow[] = topRows.map((entry) => ({
      type: "entry",
      rank: entry.rank,
      label: entry.playerName,
      score: entry.score,
      isCurrentRun: false,
    }));

    syntheticRows.splice(insertAt, 0, {
      type: "entry",
      rank: insertAt + 1,
      label: "you!",
      score: currentScore,
      isCurrentRun: true,
    });

    const limitedRows = syntheticRows.slice(0, MAX_ROWS).map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

    return {
      rows: limitedRows,
      youOutsideTopFive: null,
    };
  }

  return {
    rows: topRows.map((entry) => ({
      type: "entry",
      rank: entry.rank,
      label: entry.playerName,
      score: entry.score,
      isCurrentRun: false,
    })),
    youOutsideTopFive: {
      type: "you",
      rank: topRows.length + 1,
      score: currentScore,
    },
  };
}

export const FlapFlapLeaderboard: React.FC<FlapFlapLeaderboardProps> = ({
  entries,
  isLoading,
  error,
  currentScore,
  title = "top flappers",
  className,
}) => {
  const { rows, youOutsideTopFive } = useMemo(
    () => buildDisplayRows(entries, currentScore),
    [entries, currentScore],
  );
  const hasRows = rows.length > 0;

  const cardClassName = `box-border overflow-hidden rounded-[18px] border-[3px] border-solid border-[rgba(255,255,255,0.24)] bg-[rgba(7,15,30,0.72)] px-[18px] py-5 shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur-[10px] ${className ?? "w-full max-w-[360px]"}`;

  return (
    <section className={cardClassName}>
      <h2 className="m-0 mb-[14px] font-jersey text-[44px] tracking-[2px] text-[#ffe79d] lowercase [text-shadow:0_0_12px_rgba(255,215,0,0.45)]">{title}</h2>

      {!hasRows && isLoading ? (
        <p className="m-0 font-jersey text-[30px] tracking-[1px] text-[rgba(255,255,255,0.76)] lowercase">loading leaderboard...</p>
      ) : !hasRows && error ? (
        <p className="m-0 font-jersey text-[30px] tracking-[1px] text-[rgba(255,255,255,0.76)] lowercase">leaderboard unavailable</p>
      ) : !hasRows ? (
        <p className="m-0 font-jersey text-[30px] tracking-[1px] text-[rgba(255,255,255,0.76)] lowercase">be the first to claim a score</p>
      ) : (
        <>
          <ol className="m-0 flex list-none flex-col gap-[9px] p-0">
            {rows.map((row, index) => (
              <li
                key={`${row.label}-${row.score}-${index}`}
                className={row.isCurrentRun ? "grid grid-cols-[44px_1fr_auto] items-center gap-[10px] font-jersey text-[34px] tracking-[1px] text-[#ffe79d] [text-shadow:0_0_8px_rgba(255,215,0,0.35)]" : "grid grid-cols-[44px_1fr_auto] items-center gap-[10px] font-jersey text-[34px] tracking-[1px] text-white"}
              >
                <span className="text-[rgba(255,255,255,0.82)]">{row.rank}.</span>
                <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{row.label}</span>
                <span className="text-[rgba(255,255,255,0.94)]">{row.score}</span>
              </li>
            ))}
          </ol>

          {youOutsideTopFive && (
            <div className="mt-[2px]">
              <p className="m-0 font-jersey text-[30px] tracking-[2px] text-[rgba(255,255,255,0.7)]">...</p>
              <div className="grid grid-cols-[44px_1fr_auto] items-center gap-[10px] font-jersey text-[34px] tracking-[1px] text-[#ffe79d] [text-shadow:0_0_8px_rgba(255,215,0,0.35)]">
                <span className="col-[1/3]">you!</span>
                <span className="text-[rgba(255,255,255,0.94)]">{youOutsideTopFive.score}</span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
