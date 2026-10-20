/**
 * Hole in the Wall Scene
 * Pixi drawing only: the approaching placeholder wall and each player's skeleton.
 * The canvas is transparent and sits over the mirrored camera feed.
 */

import { Application, Container, Graphics } from "pixi.js";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { PoseLandmark as L } from "@/shared/utils/gestureConstants";
import { HOLE_IN_THE_WALL_CONFIG } from "../config/holeInTheWallConfig";
import type { PlayerId, PoseDefinition } from "../types/holeInTheWall";
import type { WallSnapshot } from "./HoleInTheWallEngine";
import type { PlayerPoses } from "../utils/assignPlayers";
import {
  figureShapes,
  rowIntervals,
  subtractIntervals,
  type Interval,
} from "../utils/silhouette";

const PLAYERS: PlayerId[] = ["P1", "P2"];

const PASS_COLOR = 0xd3e405; // lime
const FAIL_COLOR = 0xe44805; // orange
const MATCH_COLOR = 0xd3e405; // lime

/** Raster cell for hole silhouettes, in stage px */
const CELL = 4;
/** Outline thickness around each hole, in stage px */
const OUTLINE = 8;

/** Landmark index pairs forming the drawn skeleton. */
const BONES: [number, number][] = [
  [L.LEFT_SHOULDER, L.RIGHT_SHOULDER],
  [L.LEFT_SHOULDER, L.LEFT_ELBOW],
  [L.LEFT_ELBOW, L.LEFT_WRIST],
  [L.RIGHT_SHOULDER, L.RIGHT_ELBOW],
  [L.RIGHT_ELBOW, L.RIGHT_WRIST],
  [L.LEFT_SHOULDER, L.LEFT_HIP],
  [L.RIGHT_SHOULDER, L.RIGHT_HIP],
  [L.LEFT_HIP, L.RIGHT_HIP],
  [L.LEFT_HIP, L.LEFT_KNEE],
  [L.LEFT_KNEE, L.LEFT_ANKLE],
  [L.RIGHT_HIP, L.RIGHT_KNEE],
  [L.RIGHT_KNEE, L.RIGHT_ANKLE],
];

const JOINTS = [
  L.NOSE,
  L.LEFT_SHOULDER,
  L.RIGHT_SHOULDER,
  L.LEFT_ELBOW,
  L.RIGHT_ELBOW,
  L.LEFT_WRIST,
  L.RIGHT_WRIST,
  L.LEFT_HIP,
  L.RIGHT_HIP,
  L.LEFT_KNEE,
  L.RIGHT_KNEE,
  L.LEFT_ANKLE,
  L.RIGHT_ANKLE,
];

/** One raster row of the wall: where its y starts and the spans on it. */
interface Row {
  y: number;
  spans: Interval[];
}

export class HoleInTheWallScene {
  private wallLayer = new Container();
  private wallGfx = new Graphics();
  private outlineGfx = new Graphics();
  private skeletonGfx = new Graphics();

  private poseId = "";
  private outlineKey = "";
  /** Outline ring rows per player for the current pose */
  private rings: Record<PlayerId, Row[]> = { P1: [], P2: [] };

  private readonly config = HOLE_IN_THE_WALL_CONFIG;

  constructor(app: Application) {
    const { GAME_WIDTH: W, GAME_HEIGHT: H } = this.config;

    this.wallLayer.addChild(this.wallGfx, this.outlineGfx);
    // Wall geometry is authored around (0,0) and scaled about the stage center.
    this.wallLayer.position.set(W / 2, H / 2);
    this.wallLayer.visible = false;

    app.stage.addChild(this.wallLayer, this.skeletonGfx);
  }

  /** Wall-local x center of each player's hole. P1 is on the left of the mirrored screen. */
  private holeCenter(id: PlayerId) {
    return (id === "P1" ? -1 : 1) * (this.config.GAME_WIDTH / 4);
  }

  /** Rasterizes the pose's holes and redraws the wall as strips around them. */
  private buildWall(pose: PoseDefinition) {
    const { GAME_WIDTH: W, GAME_HEIGHT: H, HOLE_HEIGHT } = this.config;
    const shapes = figureShapes(pose.figure, H * HOLE_HEIGHT);
    const half = W / 4;

    const wallRows: Row[] = [];
    const rings: Record<PlayerId, Row[]> = { P1: [], P2: [] };

    for (let y = -H / 2; y < H / 2; y += CELL) {
      const yc = y + CELL / 2;
      const holes: Interval[] = [];

      for (const id of PLAYERS) {
        const cx = this.holeCenter(id);
        const scan = (grow: number) =>
          rowIntervals(shapes, cx, yc, grow, cx - half, cx + half, CELL);
        const hole = scan(0);
        holes.push(...hole);
        rings[id].push({
          y,
          spans: subtractIntervals(scan(OUTLINE), hole),
        });
      }

      wallRows.push({ y, spans: subtractIntervals([[-W / 2, W / 2]], holes) });
    }

    this.rings = rings;
    this.wallGfx.clear();
    for (const { y, spans } of wallRows) {
      for (const [x0, x1] of spans) {
        // +1 overlap hides hairline seams between rows when the wall is scaled
        this.wallGfx.rect(x0, y, x1 - x0, CELL + 1);
      }
    }
    this.wallGfx.fill(this.config.WALL_COLOR);

    this.poseId = pose.id;
    this.outlineKey = ""; // force outline redraw
  }

  private drawOutlines(outcome: WallSnapshot["outcome"]) {
    const key = `${outcome.P1}|${outcome.P2}`;
    if (key === this.outlineKey) return;
    this.outlineKey = key;

    const g = this.outlineGfx;
    g.clear();
    for (const id of PLAYERS) {
      const verdict = outcome[id];
      const color =
        verdict === null
          ? this.config.PLAYERS[id].COLOR
          : verdict
            ? PASS_COLOR
            : FAIL_COLOR;
      for (const { y, spans } of this.rings[id]) {
        for (const [x0, x1] of spans) g.rect(x0, y, x1 - x0, CELL + 1);
      }
      g.fill(color);
    }
  }

  /** Perspective-correct scale: 1/z with z running from far to the camera plane. */
  private wallScale(progress: number) {
    const s0 = this.config.WALL_START_SCALE;
    return s0 / (s0 + (1 - s0) * (1 - progress));
  }

  render(
    wall: WallSnapshot | null,
    poses: PlayerPoses,
    matched: Record<PlayerId, boolean>,
  ) {
    this.wallLayer.visible = wall !== null;
    if (wall) {
      if (wall.pose.id !== this.poseId) this.buildWall(wall.pose);
      this.wallLayer.scale.set(this.wallScale(wall.progress));
      this.drawOutlines(wall.outcome);
    }
    this.drawSkeletons(poses, matched);
  }

  private drawSkeletons(
    poses: PlayerPoses,
    matched: Record<PlayerId, boolean>,
  ) {
    const { GAME_WIDTH: W, GAME_HEIGHT: H, SKELETON_WIDTH } = this.config;
    const g = this.skeletonGfx;
    g.clear();

    for (const id of PLAYERS) {
      const lms = poses[id];
      if (!lms) continue;
      const color = matched[id] ? MATCH_COLOR : this.config.PLAYERS[id].COLOR;

      // The feed is displayed mirrored, so flip x.
      const pt = (lm: NormalizedLandmark) => ({
        x: (1 - lm.x) * W,
        y: lm.y * H,
      });
      const visible = (lm: NormalizedLandmark | undefined) =>
        !!lm && (lm.visibility ?? 1) >= this.config.MIN_LANDMARK_VISIBILITY;

      for (const [i, j] of BONES) {
        if (!visible(lms[i]) || !visible(lms[j])) continue;
        const a = pt(lms[i]);
        const b = pt(lms[j]);
        g.moveTo(a.x, a.y).lineTo(b.x, b.y);
      }
      g.stroke({ width: SKELETON_WIDTH, color, cap: "round" });

      for (const i of JOINTS) {
        if (!visible(lms[i])) continue;
        const p = pt(lms[i]);
        g.circle(p.x, p.y, SKELETON_WIDTH * 1.4);
      }
      g.fill(color);
    }
  }

  destroy() {
    this.wallLayer.destroy({ children: true });
    this.skeletonGfx.destroy();
  }
}
