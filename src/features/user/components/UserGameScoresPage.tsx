import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth";
import { gameScoreService } from "@/features/games/services/gameScoreService";
import styles from "./UserGameScoresPage.module.css";

interface GameScoreRow {
  id: string;
  name: string;
  highScore: number | null;
}

const INITIAL_ROWS: GameScoreRow[] = [
  {
    id: "flapflap",
    name: "flap flap",
    highScore: null,
  },
];

export const UserGameScoresPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [rows, setRows] = useState<GameScoreRow[]>(INITIAL_ROWS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadScores = useCallback(async () => {
    const userId = userProfile?.id;
    const orgId = userProfile?.org_id;

    if (!userId || !orgId) {
      setRows(INITIAL_ROWS);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const flapFlapHighScore =
        await gameScoreService.getUserHighestFlapFlapScore(userId, orgId);

      setRows([
        {
          id: "flapflap",
          name: "flap flap",
          highScore: flapFlapHighScore,
        },
      ]);
    } catch (e) {
      setRows(INITIAL_ROWS);
      setError(e instanceof Error ? e.message : "failed to load game scores");
    } finally {
      setIsLoading(false);
    }
  }, [userProfile?.id, userProfile?.org_id]);

  useEffect(() => {
    loadScores();
  }, [loadScores]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>game scores</h1>
        <button
          className={styles.back}
          onClick={() => navigate("/user/profile")}
        >
          Back
        </button>
      </div>

      {error && (
        <p className={styles.error}>
          could not refresh scores right now. showing available data.
        </p>
      )}

      {isLoading ? (
        <p className={styles.status}>Loading...</p>
      ) : (
        <div className={styles.list}>
          {rows.map((row) => (
            <div key={row.id} className={styles.card}>
              <span className={styles.gameName}>{row.name}</span>
              <span className={styles.scoreLabel}>high score</span>
              <span className={styles.scoreValue}>{row.highScore ?? "-"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
