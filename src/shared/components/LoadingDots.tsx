import React from "react";

/** Three dots pulsing one after another, for "loading . . ." style text. */
export const LoadingDots: React.FC = () => (
  <span aria-hidden="true" className="inline-flex gap-[6px]">
    <span className="animate-dot-pulse">.</span>
    <span className="animate-dot-pulse [animation-delay:200ms]">.</span>
    <span className="animate-dot-pulse [animation-delay:400ms]">.</span>
  </span>
);
