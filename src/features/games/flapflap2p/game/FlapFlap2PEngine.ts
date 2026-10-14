/**
 * FlapFlap 2P Game Engine
 * Two birds share one world (same pipes). First bird to crash loses.
 */

import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import { Bird } from "../../flapflap/game/Bird";
import { PipeManager } from "../../flapflap/game/PipeManager";
import { FLAPFLAP_CONFIG } from "../../flapflap/config/flapflapConfig";
import { FLAPFLAP_2P_CONFIG } from "../config/flapflap2pConfig";
import type {
  FlapFlap2PState,
  FlapFlap2PResult,
  PlayerId,
} from "../types/flapflap2p";

const PLAYERS: PlayerId[] = ["P1", "P2"];

interface PlayerEntity {
  bird: Bird;
  label: Text;
  ready: boolean;
}

export class FlapFlap2PEngine {
  private app: Application;
  private gameContainer: Container;
  private pipeManager: PipeManager;
  private players: Record<PlayerId, PlayerEntity>;
  private scoreText: Text;
  private messageText: Text;

  private state: FlapFlap2PState = "WAITING";
  private result: FlapFlap2PResult | null = null;
  private score: number = 0;
  private gameTime: number = 0;
  private countdownRemaining: number = 0;

  private readonly config = FLAPFLAP_CONFIG;
  private readonly config2p = FLAPFLAP_2P_CONFIG;
  private onStateChange?: (state: FlapFlap2PState) => void;
  private onReadyChange?: (ready: Record<PlayerId, boolean>) => void;

  constructor(app: Application) {
    this.app = app;
    this.gameContainer = new Container();
    this.app.stage.addChild(this.gameContainer);

    this.pipeManager = new PipeManager();
    const ground = this.createGround();
    this.scoreText = this.createScoreText();
    this.messageText = this.createMessageText();

    this.players = {
      P1: this.createPlayer("P1"),
      P2: this.createPlayer("P2"),
    };

    // Add to container (order matters for z-index)
    this.gameContainer.addChild(this.pipeManager.container);
    this.gameContainer.addChild(ground);
    for (const id of PLAYERS) {
      this.gameContainer.addChild(this.players[id].bird.container);
      this.gameContainer.addChild(this.players[id].label);
    }
    this.gameContainer.addChild(this.scoreText);
    this.gameContainer.addChild(this.messageText);

    this.updateLabels();
    this.showWaitingState();
  }

  private createPlayer(id: PlayerId): PlayerEntity {
    const playerConfig = this.config2p.PLAYERS[id];
    const bird = new Bird({
      color: playerConfig.COLOR,
      startY: playerConfig.START_Y,
    });
    const label = new Text({
      text: id,
      style: new TextStyle({
        fontFamily: "Jersey 10, Arial",
        fontSize: 28,
        fill: playerConfig.COLOR,
        stroke: { width: 4, color: 0x000000 },
      }),
    });
    label.anchor.set(0.5, 1);
    return { bird, label, ready: false };
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
    onStateChange?: (state: FlapFlap2PState) => void,
    onReadyChange?: (ready: Record<PlayerId, boolean>) => void,
  ): void {
    this.onStateChange = onStateChange;
    this.onReadyChange = onReadyChange;
  }

  public update(deltaTime: number): void {
    if (this.state === "COUNTDOWN") {
      this.updateCountdown(deltaTime);
      return;
    }
    if (this.state !== "PLAYING") return;

    this.gameTime += deltaTime * 1000;

    for (const id of PLAYERS) {
      this.players[id].bird.update(deltaTime);
    }
    this.updateLabels();

    // Both birds share BIRD_X, so they pass every pipe on the same frame.
    const scored = this.pipeManager.update(deltaTime, this.gameTime);
    if (scored > 0) {
      this.score += scored;
      this.scoreText.text = String(this.score);
    }

    const crashed = PLAYERS.filter((id) => this.hasCrashed(id));
    if (crashed.length === 2) {
      this.gameOver("DRAW");
    } else if (crashed.length === 1) {
      this.gameOver(crashed[0] === "P1" ? "P2" : "P1");
    }
  }

  private hasCrashed(id: PlayerId): boolean {
    const bounds = this.players[id].bird.getBounds();
    const groundY = this.config.GAME_HEIGHT - this.config.GROUND_HEIGHT;
    return (
      bounds.y + bounds.height > groundY ||
      bounds.y < 0 ||
      this.pipeManager.checkCollision(bounds)
    );
  }

  private updateCountdown(deltaTime: number): void {
    this.countdownRemaining -= deltaTime;
    if (this.countdownRemaining <= 0) {
      this.startGame();
      return;
    }
    this.messageText.text = String(Math.ceil(this.countdownRemaining));
  }

  public flap(id: PlayerId): void {
    if (this.state === "WAITING") {
      this.markReady(id);
    } else if (this.state === "PLAYING") {
      this.players[id].bird.flap();
    }
  }

  private markReady(id: PlayerId): void {
    if (this.players[id].ready) return;
    this.players[id].ready = true;
    this.emitReadyChange();

    if (PLAYERS.every((p) => this.players[p].ready)) {
      this.startCountdown();
    } else {
      this.showWaitingState();
    }
  }

  private startCountdown(): void {
    this.state = "COUNTDOWN";
    this.countdownRemaining = this.config.COUNTDOWN_SECONDS;
    this.messageText.text = String(this.config.COUNTDOWN_SECONDS);
    this.messageText.visible = true;
    this.onStateChange?.(this.state);
  }

  private startGame(): void {
    this.state = "PLAYING";
    this.messageText.visible = false;
    for (const id of PLAYERS) {
      this.players[id].bird.flap();
    }
    this.onStateChange?.(this.state);
  }

  private gameOver(result: FlapFlap2PResult): void {
    this.state = "GAME_OVER";
    this.result = result;
    // The React overlay shows the winner; keep the canvas message hidden.
    this.messageText.visible = false;
    this.onStateChange?.(this.state);
  }

  private showWaitingState(): void {
    const status = PLAYERS.map(
      (id) => `${id}: ${this.players[id].ready ? "ready!" : "flap to ready"}`,
    ).join("\n");
    this.messageText.text = status;
    this.messageText.visible = true;
  }

  private updateLabels(): void {
    for (const id of PLAYERS) {
      const { bird, label } = this.players[id];
      label.x = this.config.BIRD_X;
      label.y = bird.y - this.config.BIRD_HEIGHT / 2 - 6;
    }
  }

  private emitReadyChange(): void {
    this.onReadyChange?.({
      P1: this.players.P1.ready,
      P2: this.players.P2.ready,
    });
  }

  public restart(): void {
    this.state = "WAITING";
    this.result = null;
    this.score = 0;
    this.gameTime = 0;
    this.countdownRemaining = 0;
    this.scoreText.text = "0";

    for (const id of PLAYERS) {
      this.players[id].ready = false;
      this.players[id].bird.reset();
    }
    this.updateLabels();
    this.pipeManager.reset();
    this.showWaitingState();

    this.emitReadyChange();
    this.onStateChange?.(this.state);
  }

  public getState(): FlapFlap2PState {
    return this.state;
  }

  public getResult(): FlapFlap2PResult | null {
    return this.result;
  }

  public getScore(): number {
    return this.score;
  }

  public destroy(): void {
    this.gameContainer.destroy({ children: true, texture: false });
  }
}
