import { useMemo } from "react";
import { DRAWABLE_WORDS } from "../config/drawableWords";
import { seededRandom, todayKey } from "../utils/seededRandom";

export function useDailyWord(): { word: string; dateKey: string } {
  return useMemo(() => {
    const dateKey = todayKey();
    const idx = Math.floor(seededRandom(dateKey) * DRAWABLE_WORDS.length);
    return { word: DRAWABLE_WORDS[idx], dateKey };
  }, []);
}
