/**
 * FlapFlap Game Types
 * Types specific to the FlapFlap game
 */

export interface FlapEvent {
  arm: "left" | "right" | "both";
  velocity: number; // Normalized downward velocity
  timestamp: number;
}
