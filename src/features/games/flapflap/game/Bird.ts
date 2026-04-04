/**
 * Bird Class
 * Represents the player-controlled bird with physics
 */

import { Graphics, Container } from "pixi.js";
import { FLAPFLAP_CONFIG } from "../config/flapflapConfig";

export class Bird {
  public container: Container;
  public y: number;
  public velocity: number = 0;

  private graphics: Graphics;
  private readonly config = FLAPFLAP_CONFIG;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.y = this.config.GAME_HEIGHT / 2;

    this.draw();
    this.container.addChild(this.graphics);
    this.updatePosition();
  }

  private draw(): void {
    this.graphics.clear();

    // Bird body
    this.graphics.beginFill(this.config.BIRD_COLOR);
    this.graphics.drawEllipse(
      0,
      0,
      this.config.BIRD_WIDTH / 2,
      this.config.BIRD_HEIGHT / 2,
    );
    this.graphics.endFill();

    // Eye
    this.graphics.beginFill(0x000000);
    this.graphics.drawCircle(15, -5, 5);
    this.graphics.endFill();

    // Beak
    this.graphics.beginFill(0xff6600);
    this.graphics.moveTo(25, 0);
    this.graphics.lineTo(35, 5);
    this.graphics.lineTo(25, 10);
    this.graphics.closePath();
    this.graphics.endFill();
  }

  public update(deltaTime: number): void {
    // Apply gravity
    this.velocity += this.config.GRAVITY * deltaTime;

    // Clamp fall speed
    this.velocity = Math.min(this.velocity, this.config.MAX_FALL_SPEED);

    // Update position
    this.y += this.velocity * deltaTime;

    // Rotation based on velocity
    const rotation = Math.min(Math.max(this.velocity / 500, -0.5), 1.5);
    this.graphics.rotation = rotation;

    this.updatePosition();
  }

  public flap(): void {
    this.velocity = this.config.FLAP_VELOCITY;
  }

  public reset(): void {
    this.y = this.config.GAME_HEIGHT / 2;
    this.velocity = 0;
    this.graphics.rotation = 0;
    this.updatePosition();
  }

  private updatePosition(): void {
    this.container.x = this.config.BIRD_X;
    this.container.y = this.y;
  }

  public getBounds(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    return {
      x: this.config.BIRD_X - this.config.BIRD_WIDTH / 2,
      y: this.y - this.config.BIRD_HEIGHT / 2,
      width: this.config.BIRD_WIDTH,
      height: this.config.BIRD_HEIGHT,
    };
  }
}
