/**
 * Games Configuration
 * Registry of available games
 */

import type { GameDefinition } from "../types/game";
import { FlapFlapLauncher } from "../components/FlapFlapLauncher";
import { DrawItGame } from "../drawit/components/DrawItGame";
import { HoleInTheWallGame } from "../holeinthewall/components/HoleInTheWallGame";

export const GAMES_REGISTRY: GameDefinition[] = [
  {
    id: "flapflap",
    name: "flapflap",
    description: "flap your arms to fly — solo or head-to-head!",
    component: FlapFlapLauncher,
  },
  {
    id: "drawit",
    name: "drawit",
    description: "draw the word of the day!",
    component: DrawItGame,
  },
  {
    id: "holeinthewall",
    name: "hole in the wall",
    description: "strike the pose to fit through the wall — two players!",
    component: HoleInTheWallGame,
  },
];
