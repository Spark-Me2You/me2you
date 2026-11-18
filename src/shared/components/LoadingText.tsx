import React from "react";
import { LoadingDots } from "./LoadingDots";

interface LoadingTextProps {
  /** Defaults to "loading". */
  label?: string;
  /** Size and spacing for where it sits, e.g. "mt-10 text-[24px]". */
  className?: string;
}

/** The one "loading . . ." used across the mobile pages. */
export const LoadingText: React.FC<LoadingTextProps> = ({ label = "loading", className = "text-[28px]" }) => (
  <p role="status" className={`m-0 text-center font-jersey tracking-[2px] text-ink-soft lowercase ${className}`}>
    {label} <LoadingDots />
  </p>
);
