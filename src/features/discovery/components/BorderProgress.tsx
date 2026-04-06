import React, { useEffect, useRef, useState } from "react";

/**
 * BorderProgress Component Props
 */
interface BorderProgressProps {
  /** Progress from 0-100 */
  progress: number;
  /** Border color (default: orange theme color) */
  color?: string;
  /** Border thickness in pixels (default: 6) */
  strokeWidth?: number;
  /** Border radius to match container (default: 0) */
  borderRadius?: number;
}

/**
 * BorderProgress Component
 *
 * Renders a clockwise-tracing progress line around a container's border using SVG.
 * Uses stroke-dasharray and stroke-dashoffset to animate the border drawing.
 *
 * The line starts at the top-left corner and traces clockwise around the container,
 * growing from 0% to 100% as the progress prop increases.
 *
 * @example
 * ```tsx
 * <BorderProgress progress={75} color="#e44805" strokeWidth={6} />
 * ```
 */
export const BorderProgress: React.FC<BorderProgressProps> = ({
  progress,
  color = "#22c55e", // Green for countdown visibility
  strokeWidth = 6,
  borderRadius = 0,
}) => {
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;

      setSize({
        width: Math.max(0, rect.width),
        height: Math.max(0, rect.height),
      });
    });

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const width = size.width;
  const height = size.height;
  const perimeter = 2 * (width + height);
  const drawLength = (perimeter * normalizedProgress) / 100;

  const topLength = Math.min(drawLength, width);
  const rightLength = Math.min(Math.max(drawLength - width, 0), height);
  const bottomLength = Math.min(
    Math.max(drawLength - width - height, 0),
    width,
  );
  const leftLength = Math.min(
    Math.max(drawLength - 2 * width - height, 0),
    height,
  );

  const segmentStyle: React.CSSProperties = {
    position: "absolute",
    backgroundColor: color,
    boxShadow: "0 0 2px rgba(0,0,0,0.35)",
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 20,
        overflow: "visible",
        borderRadius,
      }}
    >
      {/* Top segment: left to right */}
      <div
        style={{
          ...segmentStyle,
          top: 0,
          left: 0,
          width: `${topLength}px`,
          height: `${strokeWidth}px`,
          borderTopLeftRadius: borderRadius,
          borderTopRightRadius: borderRadius,
        }}
      />

      {/* Right segment: top to bottom */}
      <div
        style={{
          ...segmentStyle,
          top: 0,
          right: 0,
          width: `${strokeWidth}px`,
          height: `${rightLength}px`,
          borderTopRightRadius: borderRadius,
          borderBottomRightRadius: borderRadius,
        }}
      />

      {/* Bottom segment: right to left */}
      <div
        style={{
          ...segmentStyle,
          right: 0,
          bottom: 0,
          width: `${bottomLength}px`,
          height: `${strokeWidth}px`,
          borderBottomRightRadius: borderRadius,
          borderBottomLeftRadius: borderRadius,
        }}
      />

      {/* Left segment: bottom to top */}
      <div
        style={{
          ...segmentStyle,
          left: 0,
          bottom: 0,
          width: `${strokeWidth}px`,
          height: `${leftLength}px`,
          borderBottomLeftRadius: borderRadius,
          borderTopLeftRadius: borderRadius,
        }}
      />
    </div>
  );
};
