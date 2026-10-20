/**
 * Games Hub Component
 * Game selection menu showing available games
 */

import React from "react";
import { useAppState } from "@/core/state-machine";
import { AppState } from "@/core/state-machine/appStateMachine";
import { ExitButton } from "@/shared/components";
import { GAMES_REGISTRY } from "../config/gamesConfig";
import paintbrush from "@/assets/paintbrush.svg";

interface GamesHubProps {
  onSelectGame: (gameId: string) => void;
}

// FlapFlap card art: pipes and birds in the in-game colors (see flapflapConfig)
const BAR = "pointer-events-none absolute z-[1] w-[80px] rounded-tag bg-action-games";
const BARS = [
  "h-[180px] left-[10%] -top-[50px]",
  "h-[200px] left-[10%] -bottom-[50px]",
  "h-[80px] left-[25%] -bottom-[20px]",
  "h-[150px] left-[32%] -top-[40px]",
  "h-[100px] left-[45%] -bottom-[30px]",
  "h-[250px] left-[60%] -top-[60px]",
  "h-[200px] left-[52%] -top-[80px]",
  "h-[150px] left-[70%] -bottom-[40px]",
  "h-[220px] right-[5%] -bottom-[60px]",
  "h-[180px] right-[5%] -top-[50px]",
];

const BIRD = "pointer-events-none absolute z-[2] h-[56px] w-[80px] rounded-full bg-magenta shadow-drop";
const BIRDS = [
  "left-[3%] top-[35%]",
  "left-[18%] top-[60%]",
  "left-[30%] top-[38%]",
  "left-[42%] top-[15%]",
  "left-[52%] top-[35%]",
  "left-[65%] top-[65%]",
  "left-[75%] top-[52%]",
  "right-[5%] top-[32%]",
];

const GAME_BUTTON =
  "relative m-0 box-border flex size-full min-h-[60vh] cursor-pointer flex-col items-center justify-center gap-5 overflow-hidden rounded-glass border border-solid border-white/20 text-left [font:inherit] text-[color:inherit] shadow-glass-card transition-all duration-300 ease-[ease] hover:-translate-y-2 active:-translate-y-1 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-white/80 max-[900px]:min-h-0";
// Glass pill with a sky "level" behind the pipes
const GAME_BUTTON_FLAPFLAP =
  "bg-sky/45 px-10 py-8 backdrop-blur-[10px] hover:bg-sky/55 max-[900px]:px-7 max-[900px]:py-6";
// Glass pill holding a white canvas well, taped down, with the paintbrush on top
const GAME_BUTTON_DRAWIT =
  "bg-glass p-8 backdrop-blur-[10px] hover:bg-white/20 before:absolute before:inset-6 before:z-0 before:rounded-[32px] before:bg-white before:shadow-well before:content-[''] after:pointer-events-none after:absolute after:right-[10%] after:bottom-[18%] after:z-[1] after:h-[45%] after:w-[45%] after:rotate-[-20deg] after:bg-[image:var(--paintbrush)] after:bg-contain after:bg-center after:bg-no-repeat after:drop-shadow-[3px_3px_0_rgba(0,0,0,0.25)] after:content-['']";
const TAPE = "pointer-events-none absolute z-[2] h-[22px] w-[110px] shadow-tape";

export const GamesHub: React.FC<GamesHubProps> = ({ onSelectGame }) => {
  const { transitionTo } = useAppState();

  return (
    <div className="relative box-border flex h-screen w-full flex-col items-center justify-start overflow-hidden bg-games-gradient px-10 pt-[3vh] pb-20 max-[900px]:px-5">
      {/* Title with Pixelify Sans (the one games-only font) */}
      <h1 className="relative z-10 m-0 font-pixelify text-[clamp(80px,12vw,150px)] leading-none font-normal tracking-[9px] text-white text-shadow-games [transform:translateY(-2vh)_rotate(3.41deg)] max-[900px]:[transform:translateY(-3vh)_rotate(3.41deg)]">games</h1>

      {/* Games container - vertical stack */}
      <div className="relative z-10 mt-[2vh] mb-0 grid w-[min(92vw,1400px)] max-w-[calc(100vw-80px)] flex-[1_1_auto] grid-cols-[1fr_1fr] content-stretch gap-8 max-[900px]:w-[min(92vw,720px)] max-[900px]:max-w-[calc(100vw-40px)] max-[900px]:grid-cols-[1fr] max-[900px]:auto-rows-[1fr] max-[900px]:gap-5">
        {GAMES_REGISTRY.map((game) => {
          const isDrawIt = game.id === "drawit";
          return (
            <button
              key={game.id}
              data-game-id={game.id}
              className={`${GAME_BUTTON} ${isDrawIt ? GAME_BUTTON_DRAWIT : GAME_BUTTON_FLAPFLAP}`}
              style={isDrawIt ? ({ "--paintbrush": `url(${paintbrush})` } as React.CSSProperties) : undefined}
              onClick={() => onSelectGame(game.id)}
            >
              {isDrawIt ? (
                <>
                  {/* Tape holding the canvas down */}
                  <div className={`${TAPE} top-3 left-[12%] rotate-[-6deg] bg-tape/90`} aria-hidden="true" />
                  <div className={`${TAPE} top-3 right-[12%] rotate-[5deg] bg-tape-alt/90`} aria-hidden="true" />
                </>
              ) : (
                <>
                  {/* Decorative pipes */}
                  {BARS.map((pos) => (
                    <div key={pos} className={`${BAR} ${pos}`} />
                  ))}
                  {/* Decorative birds */}
                  {BIRDS.map((pos) => (
                    <div key={pos} className={`${BIRD} ${pos}`} aria-hidden="true" />
                  ))}
                </>
              )}

              {/* Game content */}
              <h2
                className={`relative z-10 m-0 font-jersey text-[clamp(60px,8vw,100px)] leading-none font-normal tracking-brand lowercase ${
                  isDrawIt ? "text-ink" : "text-white text-shadow-pop"
                }`}
              >
                {game.name}
              </h2>
              <p
                className={`relative z-10 m-0 font-averia text-[clamp(24px,3vw,35px)] leading-none font-normal ${
                  isDrawIt ? "text-ink-soft" : "text-white text-shadow-pop"
                }`}
              >
                {game.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Exit button */}
      <ExitButton onClick={() => transitionTo(AppState.IDLE)} />
    </div>
  );
};
