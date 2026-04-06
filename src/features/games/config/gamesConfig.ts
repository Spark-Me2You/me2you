/**
 * Games Configuration
 * Registry of available games
 */

import type { GameDefinition } from "../types/game";
import { FlapFlapGame } from "../flapflap/components/FlapFlapGame";

export const GAMES_REGISTRY: GameDefinition[] = [
  {
    id: "flapflap",
    name: "FlapFlap",
    description: "Flap your arms to fly!",
    component: FlapFlapGame,
  },
];
