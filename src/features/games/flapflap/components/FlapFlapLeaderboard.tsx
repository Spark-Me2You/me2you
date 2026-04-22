import React, { useMemo } from "react";
import type { FlapFlapLeaderboardEntry } from "@/features/games/services/gameScoreService";
import styles from "./FlapFlapLeaderboard.module.css";

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

  const cardClassName = className ? `${styles.card} ${className}` : styles.card;

  return (
    <section className={cardClassName}>
      <h2 className={styles.title}>{title}</h2>

      {isLoading ? (
        <p className={styles.message}>loading leaderboard...</p>
      ) : error ? (
        <p className={styles.message}>leaderboard unavailable</p>
      ) : rows.length === 0 ? (
        <p className={styles.message}>be the first to claim a score</p>
      ) : (
        <>
          <ol className={styles.list}>
            {rows.map((row, index) => (
              <li
                key={`${row.label}-${row.score}-${index}`}
                className={row.isCurrentRun ? styles.currentRunRow : styles.row}
              >
                <span className={styles.rank}>{row.rank}.</span>
                <span className={styles.name}>{row.label}</span>
                <span className={styles.score}>{row.score}</span>
              </li>
            ))}
          </ol>

          {youOutsideTopFive && (
            <div className={styles.youOutsideWrap}>
              <p className={styles.ellipsis}>...</p>
              <div className={styles.youOutsideRow}>
                <span className={styles.youLabel}>you!</span>
                <span className={styles.score}>{youOutsideTopFive.score}</span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
