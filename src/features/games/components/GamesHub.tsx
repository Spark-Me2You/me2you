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

const BAR = "pointer-events-none absolute z-[1] w-[80px] bg-[#47c52b]";
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

const IMG = "pointer-events-none absolute z-[2] size-[80px] rounded-full bg-[rgba(255,215,0,0.8)] object-cover";
const IMGS = [
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
  "relative m-0 box-border flex size-full min-h-[60vh] cursor-pointer flex-col items-center justify-center gap-5 overflow-hidden border border-solid text-left [font:inherit] text-[color:inherit] transition-all duration-300 ease-[ease] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-[rgba(255,255,255,0.8)] max-[900px]:min-h-0";
const GAME_BUTTON_GLASS =
  "rounded-[46px] border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.13)] px-10 py-8 backdrop-blur-[10px] [box-shadow:0px_4px_4px_0px_rgba(0,0,0,0.25),inset_0px_0px_4px_0px_rgba(0,0,0,0.25),inset_1px_1px_49.9px_14px_rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.2)] hover:[transform:translateY(-8px)] hover:[box-shadow:0px_12px_40px_rgba(0,0,0,0.3),inset_0px_0px_4px_0px_rgba(0,0,0,0.25),inset_1px_1px_49.9px_14px_rgba(255,255,255,0.25)] active:[transform:translateY(-4px)] max-[900px]:px-7 max-[900px]:py-6";
const GAME_BUTTON_DRAWIT =
  "rounded-[46px] border-[6px] border-solid border-[#fff] border-r-[#404040] border-b-[#404040] bg-[#c0c0c0] p-8 [box-shadow:6px_6px_0_#000] hover:bg-[#c8c8c8] hover:[transform:translateY(-4px)] hover:[box-shadow:6px_10px_0_#000] active:[transform:translateY(-4px)] before:absolute before:inset-6 before:z-0 before:rounded-[32px] before:border-4 before:border-solid before:border-[#404040] before:border-t-[#fff] before:border-l-[#fff] before:bg-[#fff] before:content-[''] after:pointer-events-none after:absolute after:right-[10%] after:bottom-[18%] after:z-[1] after:h-[45%] after:w-[45%] after:[transform:rotate(-20deg)] after:bg-[image:var(--paintbrush)] after:bg-contain after:bg-center after:bg-no-repeat after:[filter:drop-shadow(3px_3px_0_rgba(0,0,0,0.25))] after:content-['']";
export const GamesHub: React.FC<GamesHubProps> = ({ onSelectGame }) => {
  const { transitionTo } = useAppState();

  return (
    <div className="relative box-border flex h-screen w-full flex-col items-center justify-start overflow-hidden bg-[linear-gradient(180deg,#58e7f7_0%,#fefffb_100%)] px-10 pt-[3vh] pb-20 max-[900px]:px-5">
      {/* Background overlay for gradient effect */}
      <div className="pointer-events-none absolute top-0 left-0 z-0 h-full w-full bg-[linear-gradient(180deg,rgba(20,5,228,0.93)_0%,#fefffb_100%)]" />

      {/* Title with Pixelify Sans */}
      <h1 className="relative z-10 m-0 font-pixelify text-[clamp(80px,12vw,150px)] leading-none font-normal tracking-[9px] text-white [text-shadow:0px_8px_4px_rgba(0,0,0,0.31),0px_4px_0px_rgba(211,228,5,0.68),2px_0px_0px_#e405ac] [transform:translateY(-2vh)_rotate(3.41deg)] max-[900px]:[transform:translateY(-3vh)_rotate(3.41deg)]">games</h1>

      {/* Games container - vertical stack */}
      <div className="relative z-10 mt-[2vh] mb-0 grid w-[min(92vw,1400px)] max-w-[calc(100vw-80px)] flex-[1_1_auto] grid-cols-[1fr_1fr] content-stretch gap-8 max-[900px]:w-[min(92vw,720px)] max-[900px]:max-w-[calc(100vw-40px)] max-[900px]:grid-cols-[1fr] max-[900px]:auto-rows-[1fr] max-[900px]:gap-5">
        {GAMES_REGISTRY.map((game) => {
          const isDrawIt = game.id === "drawit";
          return (
            <button
              key={game.id}
              data-game-id={game.id}
              className={`${GAME_BUTTON} ${isDrawIt ? GAME_BUTTON_DRAWIT : GAME_BUTTON_GLASS}`}
              style={isDrawIt ? ({ "--paintbrush": `url(${paintbrush})` } as React.CSSProperties) : undefined}
              onClick={() => onSelectGame(game.id)}
            >
              {!isDrawIt && (
                <>
                  {/* Decorative green bars */}
                  {BARS.map((pos) => (
                    <div key={pos} className={`${BAR} ${pos}`} />
                  ))}
                  {/* Decorative circular elements */}
                  {IMGS.map((pos) => (
                    <div key={pos} className={`${IMG} ${pos}`} aria-hidden="true" />
                  ))}
                </>
              )}

              {/* Game content */}
              <h2
                className={`relative z-10 m-0 font-jersey text-[clamp(60px,8vw,100px)] leading-none font-normal tracking-[16px] ${
                  isDrawIt ? "text-[#111] [text-shadow:4px_4px_0_rgba(0,0,0,0.15)]" : "text-white [text-shadow:0px_4px_16px_rgba(0,0,0,0.4)]"
                }`}
              >
                {game.name}
              </h2>
              <p
                className={`relative z-10 m-0 font-jersey text-[clamp(24px,3vw,36px)] leading-none font-normal tracking-[6px] ${
                  isDrawIt ? "text-[#333]" : "text-white [text-shadow:0px_2px_8px_rgba(0,0,0,0.3)]"
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
