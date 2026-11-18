import React from "react";

const BTN =
  "w-full cursor-pointer rounded-[16px] px-4 py-3 font-jersey text-[24px] tracking-[2px] lowercase active:scale-[0.98]";

/**
 * Shown when a page crashes, so phones never land on a blank screen.
 * Uses full page loads (not router navigation) since app state may be broken.
 */
export const PageCrashFallback: React.FC = () => {
  const home = window.location.pathname.startsWith("/app") ? "/app" : "/user";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] items-center justify-center bg-page-gradient px-[30px]">
      <div
        role="alert"
        className="w-full max-w-[350px] rounded-[24px] bg-glass px-[30px] py-8 text-center shadow-glass"
      >
        <h1 className="m-0 mb-3 font-jersey text-[40px] leading-none tracking-[3px] text-orange lowercase">
          oops!
        </h1>
        <p className="m-0 mb-6 font-jersey text-[22px] leading-[1.35] text-ink-soft lowercase">
          something went wrong on this page.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className={`${BTN} border-0 bg-orange text-white`}
            onClick={() => window.location.reload()}
          >
            try again
          </button>
          <button
            type="button"
            className={`${BTN} border-2 border-solid border-orange bg-orange/10 text-orange`}
            onClick={() => window.location.assign(home)}
          >
            go home
          </button>
        </div>
      </div>
    </div>
  );
};
