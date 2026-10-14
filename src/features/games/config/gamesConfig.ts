/**
 * Games Configuration
 * Registry of available games
 */

import type { GameDefinition } from "../types/game";
import { FlapFlapLauncher } from "../components/FlapFlapLauncher";
import { DrawItGame } from "../drawit/components/DrawItGame";

export const GAMES_REGISTRY: GameDefinition[] = [
  {
    id: "flapflap",
    name: "FlapFlap",
    description: "Flap your arms to fly — solo or head-to-head!",
    component: FlapFlapLauncher,
  },
  {
    id: "drawit",
    name: "DrawIt",
    description: "Draw the word of the day!",
    component: DrawItGame,
  },
];
