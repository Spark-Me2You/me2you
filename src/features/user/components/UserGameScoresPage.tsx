import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth";
import { gameScoreService } from "@/features/games/services/gameScoreService";

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
    <div className="mx-auto box-border h-dvh w-full max-w-[430px] overflow-x-hidden overflow-y-auto bg-[linear-gradient(180deg,#e6f2ff_0%,#c4dff5_100%)] px-4 pt-6 pb-12 font-jersey-arial [-webkit-overflow-scrolling:touch]">
      <div className="sticky -top-6 z-10 -mx-4 -mt-6 mb-5 flex items-center justify-between bg-[#e6f2ff] p-4">
        <h1 className="m-0 text-[36px] tracking-[4px] text-[#003366]">game scores</h1>
        <button
          className="cursor-pointer rounded-[8px] border-2 border-solid border-[#a7d1f5] bg-white px-[18px] py-2 font-jersey-arial text-[18px] tracking-[2px] text-[#003366]"
          onClick={() => navigate("/user/profile")}
        >
          Back
        </button>
      </div>

      {error && (
        <p className="mt-0 mb-4 text-center text-[18px] tracking-[2px] text-[#aa0000]">
          could not refresh scores right now. showing available data.
        </p>
      )}

      {isLoading ? (
        <p className="mt-10 text-center text-[18px] tracking-[2px] text-[#003366]">Loading...</p>
      ) : (
        <div className="grid grid-cols-[1fr] gap-3">
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-[10px] border border-solid border-[#a7d1f5] bg-white px-3 py-[14px] shadow-[0_2px_6px_rgba(0,0,0,0.1)]">
              <span className="text-[22px] tracking-[1px] text-[#003366] lowercase">{row.name}</span>
              <span className="text-[16px] tracking-[1px] text-[#5a7a99] lowercase">high score</span>
              <span className="text-[24px] tracking-[1px] text-[#003366]">{row.highScore ?? "-"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
