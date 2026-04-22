import { supabase } from "@/core/supabase/client";

const FLAPFLAP_GAME_ID = "flapflap";
const PAGE_SIZE = 50;
const MAX_SCAN_ROWS = 500;

interface RawGameScoreRow {
  owner_id: string;
  score: number;
  created_at: string;
}

interface RawUserRow {
  id: string;
  name: string | null;
}

export interface FlapFlapLeaderboardEntry {
  rank: number;
  ownerId: string;
  playerName: string;
  score: number;
  createdAt: string;
}

async function fetchTopUniqueRuns(
  orgId: string,
  uniqueLimit: number,
): Promise<RawGameScoreRow[]> {
  const uniqueByOwner = new Map<string, RawGameScoreRow>();
  let offset = 0;

  while (uniqueByOwner.size < uniqueLimit && offset < MAX_SCAN_ROWS) {
    const { data, error } = await supabase
      .from("game_score")
      .select("owner_id, score, created_at")
      .eq("org_id", orgId)
      .eq("game_id", FLAPFLAP_GAME_ID)
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to fetch leaderboard scores: ${error.message}`);
    }

    const rows = (data ?? []) as RawGameScoreRow[];
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      if (!uniqueByOwner.has(row.owner_id)) {
        uniqueByOwner.set(row.owner_id, row);
      }
    }

    if (rows.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return Array.from(uniqueByOwner.values()).slice(0, uniqueLimit);
}

async function fetchUserNames(
  ownerIds: string[],
): Promise<Map<string, string>> {
  if (ownerIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("user")
    .select("id, name")
    .in("id", ownerIds);

  if (error) {
    throw new Error(
      `Failed to fetch leaderboard player names: ${error.message}`,
    );
  }

  const rows = (data ?? []) as RawUserRow[];
  const nameMap = new Map<string, string>();
  for (const row of rows) {
    const normalizedName = row.name?.trim();
    nameMap.set(
      row.id,
      normalizedName && normalizedName.length > 0
        ? normalizedName
        : "anonymous",
    );
  }

  return nameMap;
}

export const gameScoreService = {
  async getFlapFlapTopPlayers(
    orgId: string,
    topLimit: number = 5,
  ): Promise<FlapFlapLeaderboardEntry[]> {
    const topRuns = await fetchTopUniqueRuns(orgId, topLimit);
    const ownerIds = topRuns.map((row) => row.owner_id);
    const nameMap = await fetchUserNames(ownerIds);

    return topRuns.map((row, index) => ({
      rank: index + 1,
      ownerId: row.owner_id,
      playerName: nameMap.get(row.owner_id) ?? "anonymous",
      score: row.score,
      createdAt: row.created_at,
    }));
  },

  async getUserHighestFlapFlapScore(
    userId: string,
    orgId: string,
  ): Promise<number | null> {
    const { data, error } = await supabase
      .from("game_score")
      .select("score")
      .eq("owner_id", userId)
      .eq("org_id", orgId)
      .eq("game_id", FLAPFLAP_GAME_ID)
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Failed to fetch user high score: ${error.message}`);
    }

    const topRow = (data ?? []) as Array<{ score: number }>;
    return topRow[0]?.score ?? null;
  },
};
