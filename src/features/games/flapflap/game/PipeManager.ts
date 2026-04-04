/**
 * Pipe Manager Class
 * Manages pipe spawning, movement, and collision detection
 */

import { Graphics, Container } from "pixi.js";
import { FLAPFLAP_CONFIG } from "../config/flapflapConfig";

interface Pipe {
  x: number;
  gapY: number;
  scored: boolean;
  topGraphics: Graphics;
  bottomGraphics: Graphics;
}

export class PipeManager {
  public container: Container;
  private pipes: Pipe[] = [];
  private lastSpawnTime: number = 0;
  private readonly config = FLAPFLAP_CONFIG;

  constructor() {
    this.container = new Container();
  }

  public update(deltaTime: number, currentTime: number): number {
    let scored = 0;

    // Spawn new pipes
    if (currentTime - this.lastSpawnTime > this.config.PIPE_SPAWN_INTERVAL) {
      this.spawnPipe();
      this.lastSpawnTime = currentTime;
    }

    // Update existing pipes
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const pipe = this.pipes[i];

      // Move pipe left
      pipe.x -= this.config.PIPE_SPEED * deltaTime;
      pipe.topGraphics.x = pipe.x;
      pipe.bottomGraphics.x = pipe.x;

      // Check if bird passed pipe
      if (
        !pipe.scored &&
        pipe.x + this.config.PIPE_WIDTH < this.config.BIRD_X
      ) {
        pipe.scored = true;
        scored++;
      }

      // Remove off-screen pipes
      if (pipe.x < -this.config.PIPE_WIDTH) {
        this.container.removeChild(pipe.topGraphics);
        this.container.removeChild(pipe.bottomGraphics);
        pipe.topGraphics.destroy();
        pipe.bottomGraphics.destroy();
        this.pipes.splice(i, 1);
      }
    }

    return scored;
  }

  private spawnPipe(): void {
    const playableHeight = this.config.GAME_HEIGHT - this.config.GROUND_HEIGHT;
    const minGapY = this.config.MIN_PIPE_HEIGHT + this.config.PIPE_GAP / 2;
    const maxGapY =
      playableHeight - this.config.MIN_PIPE_HEIGHT - this.config.PIPE_GAP / 2;

    const gapY = minGapY + Math.random() * (maxGapY - minGapY);
    const x = this.config.GAME_WIDTH + 50;

    // Top pipe
    const topHeight = gapY - this.config.PIPE_GAP / 2;
    const topGraphics = new Graphics();
    topGraphics.beginFill(this.config.PIPE_COLOR);
    topGraphics.drawRect(0, 0, this.config.PIPE_WIDTH, topHeight);
    topGraphics.endFill();
    topGraphics.x = x;
    topGraphics.y = 0;

    // Bottom pipe
    const bottomY = gapY + this.config.PIPE_GAP / 2;
    const bottomHeight = playableHeight - bottomY;
    const bottomGraphics = new Graphics();
    bottomGraphics.beginFill(this.config.PIPE_COLOR);
    bottomGraphics.drawRect(0, 0, this.config.PIPE_WIDTH, bottomHeight);
    bottomGraphics.endFill();
    bottomGraphics.x = x;
    bottomGraphics.y = bottomY;

    this.container.addChild(topGraphics);
    this.container.addChild(bottomGraphics);

    this.pipes.push({
      x,
      gapY,
      scored: false,
      topGraphics,
      bottomGraphics,
    });
  }

  public checkCollision(birdBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): boolean {
    for (const pipe of this.pipes) {
      const topPipeBottom = pipe.gapY - this.config.PIPE_GAP / 2;
      const bottomPipeTop = pipe.gapY + this.config.PIPE_GAP / 2;

      // Check X overlap
      if (
        birdBounds.x + birdBounds.width > pipe.x &&
        birdBounds.x < pipe.x + this.config.PIPE_WIDTH
      ) {
        // Check Y collision
        if (
          birdBounds.y < topPipeBottom ||
          birdBounds.y + birdBounds.height > bottomPipeTop
        ) {
          return true;
        }
      }
    }
    return false;
  }

  public reset(): void {
    for (const pipe of this.pipes) {
      this.container.removeChild(pipe.topGraphics);
      this.container.removeChild(pipe.bottomGraphics);
      pipe.topGraphics.destroy();
      pipe.bottomGraphics.destroy();
    }
    this.pipes = [];
    this.lastSpawnTime = 0;
  }
}
