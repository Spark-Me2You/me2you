import React, { useRef, useEffect, useState } from "react";

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
  color = "#e44805", // Orange theme color
  strokeWidth = 6,
  borderRadius = 0,
}) => {
  const pathRef = useRef<SVGRectElement>(null);
  const [pathLength, setPathLength] = useState(0);

  /**
   * Calculate the total perimeter length of the rectangle
   * This is used for the stroke-dasharray and stroke-dashoffset calculations
   */
  useEffect(() => {
    if (pathRef.current) {
      const rect = pathRef.current;
      const bbox = rect.getBBox();

      // For a rectangle: perimeter = 2 * (width + height)
      const perimeter = 2 * (bbox.width + bbox.height);
      setPathLength(perimeter);
    }
  }, []);

  /**
   * Calculate how much of the path should be visible based on progress
   * stroke-dashoffset starts at pathLength (nothing visible) and decreases to 0 (fully visible)
   */
  const dashOffset = pathLength - (pathLength * progress) / 100;

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 20,
        overflow: "visible",
      }}
      preserveAspectRatio="none"
    >
      <rect
        ref={pathRef}
        x={strokeWidth / 2}
        y={strokeWidth / 2}
        width={`calc(100% - ${strokeWidth}px)`}
        height={`calc(100% - ${strokeWidth}px)`}
        rx={borderRadius}
        ry={borderRadius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={pathLength}
        strokeDashoffset={dashOffset}
        style={{
          // Smooth transition for progress updates
          transition: "stroke-dashoffset 0.05s linear",
        }}
      />
    </svg>
  );
};
