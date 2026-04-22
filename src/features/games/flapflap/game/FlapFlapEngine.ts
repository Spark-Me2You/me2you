/**
 * FlapFlap Game Engine
 * Orchestrates game logic, state management, and rendering
 */

import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import { Bird } from "./Bird";
import { PipeManager } from "./PipeManager";
import { FLAPFLAP_CONFIG } from "../config/flapflapConfig";

export type FlapFlapState = "READY" | "PLAYING" | "GAME_OVER";

export class FlapFlapEngine {
  private app: Application;
  private gameContainer: Container;
  private bird: Bird;
  private pipeManager: PipeManager;
  private ground: Graphics;
  private scoreText: Text;
  private messageText: Text;

  private state: FlapFlapState = "READY";
  private score: number = 0;
  private highScore: number = 0;
  private gameTime: number = 0;
  private restartLocked: boolean = false;

  private readonly config = FLAPFLAP_CONFIG;
  private onStateChange?: (state: FlapFlapState) => void;
  private onScoreChange?: (score: number, highScore: number) => void;

  constructor(app: Application) {
    this.app = app;
    this.gameContainer = new Container();
    this.app.stage.addChild(this.gameContainer);

    // Create game objects
    this.bird = new Bird();
    this.pipeManager = new PipeManager();
    this.ground = this.createGround();
    this.scoreText = this.createScoreText();
    this.messageText = this.createMessageText();

    // Add to container (order matters for z-index)
    this.gameContainer.addChild(this.pipeManager.container);
    this.gameContainer.addChild(this.ground);
    this.gameContainer.addChild(this.bird.container);
    this.gameContainer.addChild(this.scoreText);
    this.gameContainer.addChild(this.messageText);

    this.showReadyState();
  }

  private createGround(): Graphics {
    const ground = new Graphics();
    ground.beginFill(this.config.GROUND_COLOR);
    ground.drawRect(
      0,
      this.config.GAME_HEIGHT - this.config.GROUND_HEIGHT,
      this.config.GAME_WIDTH,
      this.config.GROUND_HEIGHT,
    );
    ground.endFill();
    return ground;
  }

  private createScoreText(): Text {
    const style = new TextStyle({
      fontFamily: "Jersey 10, Arial",
      fontSize: 64,
      fill: 0xffffff,
      stroke: { width: 4, color: 0x000000 },
    });
    const text = new Text({ text: "0", style });
    text.anchor.set(0.5, 0);
    text.x = this.config.GAME_WIDTH / 2;
    text.y = 20;
    return text;
  }

  private createMessageText(): Text {
    const style = new TextStyle({
      fontFamily: "Jersey 10, Arial",
      fontSize: 48,
      fill: 0xffffff,
      stroke: { width: 3, color: 0x000000 },
      align: "center",
    });
    const text = new Text({ text: "", style });
    text.anchor.set(0.5, 0.5);
    text.x = this.config.GAME_WIDTH / 2;
    text.y = this.config.GAME_HEIGHT / 2;
    return text;
  }

  public setCallbacks(
    onStateChange?: (state: FlapFlapState) => void,
    onScoreChange?: (score: number, highScore: number) => void,
  ): void {
    this.onStateChange = onStateChange;
    this.onScoreChange = onScoreChange;
  }

  public update(deltaTime: number): void {
    if (this.state !== "PLAYING") return;

    this.gameTime += deltaTime * 1000;

    // Update bird
    this.bird.update(deltaTime);

    // Update pipes and get score
    const scored = this.pipeManager.update(deltaTime, this.gameTime);
    if (scored > 0) {
      this.score += scored;
      this.scoreText.text = String(this.score);
      this.onScoreChange?.(this.score, this.highScore);
    }

    // Check collisions
    const birdBounds = this.bird.getBounds();

    // Ground collision
    if (
      birdBounds.y + birdBounds.height >
      this.config.GAME_HEIGHT - this.config.GROUND_HEIGHT
    ) {
      this.gameOver();
      return;
    }

    // Ceiling collision
    if (birdBounds.y < 0) {
      this.gameOver();
      return;
    }

    // Pipe collision
    if (this.pipeManager.checkCollision(birdBounds)) {
      this.gameOver();
    }
  }

  public flap(): void {
    if (this.state === "READY") {
      this.startGame();
    } else if (this.state === "PLAYING") {
      this.bird.flap();
    } else if (this.state === "GAME_OVER") {
      if (!this.restartLocked) this.reset();
    }
  }

  public getScore(): number {
    return this.score;
  }

  public setRestartLocked(locked: boolean): void {
    this.restartLocked = locked;
  }

  public setMessageVisible(visible: boolean): void {
    this.messageText.visible = visible;
  }

  public restart(): void {
    this.restartLocked = false;
    this.reset();
  }

  private startGame(): void {
    this.state = "PLAYING";
    this.messageText.visible = false;
    this.bird.flap();
    this.onStateChange?.(this.state);
  }

  private gameOver(): void {
    this.state = "GAME_OVER";

    if (this.score > this.highScore) {
      this.highScore = this.score;
    }

    this.messageText.text = `Game Over!\nScore: ${this.score}\nHigh: ${this.highScore}\n\nFlap to restart`;
    this.messageText.visible = true;

    this.onStateChange?.(this.state);
    this.onScoreChange?.(this.score, this.highScore);
  }

  private showReadyState(): void {
    this.messageText.text = "Flap your arms\nto start!";
    this.messageText.visible = true;
  }

  private reset(): void {
    this.state = "READY";
    this.score = 0;
    this.gameTime = 0;
    this.scoreText.text = "0";

    this.bird.reset();
    this.pipeManager.reset();
    this.showReadyState();

    this.onStateChange?.(this.state);
  }

  public getState(): FlapFlapState {
    return this.state;
  }

  public destroy(): void {
    this.gameContainer.destroy({ children: true, texture: false });
  }
}
