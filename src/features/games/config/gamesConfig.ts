/**
 * Games Configuration
 * Registry of available games
 */

import type { GameDefinition } from "../types/game";
import { FlapFlapGame } from "../flapflap/components/FlapFlapGame";
import { DrawItGame } from "../drawit/components/DrawItGame";

export const GAMES_REGISTRY: GameDefinition[] = [
  {
    id: "flapflap",
    name: "FlapFlap",
    description: "Flap your arms to fly!",
    component: FlapFlapGame,
  },
  {
    id: "drawit",
    name: "DrawIt",
    description: "Draw the word of the day!",
    component: DrawItGame,
  },
];
