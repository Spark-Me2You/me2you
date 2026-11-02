/**
 * FlapFlap 4P Game Engine
 * Up to four birds share one world (same pipes). A crash eliminates only that
 * player; the last bird standing wins.
 */

import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import { Bird } from "../../flapflap/game/Bird";
import { PipeManager } from "../../flapflap/game/PipeManager";
import { FLAPFLAP_CONFIG } from "../../flapflap/config/flapflapConfig";
import { FLAPFLAP_4P_CONFIG } from "../config/flapflap4pConfig";
import type {
  FlapFlap4PState,
  FlapFlap4PResult,
  PlayerId,
} from "../types/flapflap4p";

const PLAYERS: PlayerId[] = ["P1", "P2", "P3", "P4"];

interface PlayerEntity {
  bird: Bird;
  label: Text;
  ready: boolean;
  eliminated: boolean;
}

export class FlapFlap4PEngine {
  private app: Application;
  private gameContainer: Container;
  private pipeManager: PipeManager;
  private players: Record<PlayerId, PlayerEntity>;
  private present: Record<PlayerId, boolean> = {
    P1: false,
    P2: false,
    P3: false,
    P4: false,
  };
  private scoreText: Text;
  private messageText: Text;

  private state: FlapFlap4PState = "WAITING";
  private result: FlapFlap4PResult | null = null;
  private finalists: PlayerId[] = [];
  private score: number = 0;
  private gameTime: number = 0;
  private countdownRemaining: number = 0;

  private readonly config = FLAPFLAP_CONFIG;
  private readonly config4p = FLAPFLAP_4P_CONFIG;
  private onStateChange?: (state: FlapFlap4PState) => void;
  private onReadyChange?: (ready: Record<PlayerId, boolean>) => void;
  private onEliminatedChange?: (eliminated: Record<PlayerId, boolean>) => void;

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
      P3: this.createPlayer("P3"),
      P4: this.createPlayer("P4"),
    };

    this.gameContainer.addChild(this.pipeManager.container);
    this.gameContainer.addChild(ground);
    for (const id of PLAYERS) {
      this.gameContainer.addChild(this.players[id].bird.container);
      this.gameContainer.addChild(this.players[id].label);
    }
    this.gameContainer.addChild(this.scoreText);
    this.gameContainer.addChild(this.messageText);

    this.refreshVisibility();
    this.updateLabels();
    this.showWaitingState();
  }

  private createPlayer(id: PlayerId): PlayerEntity {
    const playerConfig = this.config4p.PLAYERS[id];
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
    return { bird, label, ready: false, eliminated: false };
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
    onStateChange?: (state: FlapFlap4PState) => void,
    onReadyChange?: (ready: Record<PlayerId, boolean>) => void,
    onEliminatedChange?: (eliminated: Record<PlayerId, boolean>) => void,
  ): void {
    this.onStateChange = onStateChange;
    this.onReadyChange = onReadyChange;
    this.onEliminatedChange = onEliminatedChange;
  }

  /**
   * Which players the camera currently detects. The countdown waits until all
   * of them have joined.
   */
  public setPresent(present: Record<PlayerId, boolean>): void {
    if (PLAYERS.every((id) => present[id] === this.present[id])) return;
    this.present = { ...present };
    this.tryStartCountdown();
  }

  public update(deltaTime: number): void {
    if (this.state === "COUNTDOWN") {
      this.updateCountdown(deltaTime);
      return;
    }
    if (this.state !== "PLAYING") return;

    this.gameTime += deltaTime * 1000;

    const alive = this.getAlive();
    for (const id of alive) {
      this.players[id].bird.update(deltaTime);
    }
    this.updateLabels();

    // All birds share BIRD_X, so they pass every pipe on the same frame.
    const scored = this.pipeManager.update(deltaTime, this.gameTime);
    if (scored > 0) {
      this.score += scored;
      this.scoreText.text = String(this.score);
    }

    const crashed = alive.filter((id) => this.hasCrashed(id));
    if (crashed.length === 0) return;

    for (const id of crashed) this.players[id].eliminated = true;
    this.refreshVisibility();
    this.onEliminatedChange?.(this.snapshot("eliminated"));

    const remaining = this.getAlive();
    if (remaining.length === 1) {
      this.gameOver(remaining[0], remaining);
    } else if (remaining.length === 0) {
      this.gameOver("DRAW", crashed);
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

  private getJoined(): PlayerId[] {
    return PLAYERS.filter((id) => this.players[id].ready);
  }

  private getAlive(): PlayerId[] {
    return this.getJoined().filter((id) => !this.players[id].eliminated);
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
      const player = this.players[id];
      if (player.ready && !player.eliminated) player.bird.flap();
    }
  }

  private markReady(id: PlayerId): void {
    if (this.players[id].ready) return;
    this.players[id].ready = true;
    this.refreshVisibility();
    this.emitReadyChange();
    this.tryStartCountdown();
  }

  /** Start once enough players joined and everyone the camera sees has joined. */
  private tryStartCountdown(): void {
    if (this.state !== "WAITING") return;
    const everyoneVisibleJoined = PLAYERS.every(
      (id) => !this.present[id] || this.players[id].ready,
    );
    if (
      this.getJoined().length >= this.config4p.MIN_PLAYERS &&
      everyoneVisibleJoined
    ) {
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
    for (const id of this.getJoined()) {
      this.players[id].bird.flap();
    }
    this.onStateChange?.(this.state);
  }

  private gameOver(result: FlapFlap4PResult, finalists: PlayerId[]): void {
    this.state = "GAME_OVER";
    this.result = result;
    this.finalists = finalists;
    // The React overlay shows the winner; keep the canvas message hidden.
    this.messageText.visible = false;
    this.onStateChange?.(this.state);
  }

  private showWaitingState(): void {
    this.messageText.text = `flap to join!\n${this.getJoined().length} joined (need ${this.config4p.MIN_PLAYERS}+)`;
    this.messageText.visible = true;
  }

  /** Only joined, surviving birds (and their labels) are shown. */
  private refreshVisibility(): void {
    for (const id of PLAYERS) {
      const { bird, label, ready, eliminated } = this.players[id];
      const visible = ready && !eliminated;
      bird.container.visible = visible;
      label.visible = visible;
    }
  }

  private updateLabels(): void {
    for (const id of PLAYERS) {
      const { bird, label } = this.players[id];
      label.x = this.config.BIRD_X;
      label.y = bird.y - this.config.BIRD_HEIGHT / 2 - 6;
    }
  }

  private snapshot(key: "ready" | "eliminated"): Record<PlayerId, boolean> {
    return {
      P1: this.players.P1[key],
      P2: this.players.P2[key],
      P3: this.players.P3[key],
      P4: this.players.P4[key],
    };
  }

  private emitReadyChange(): void {
    this.onReadyChange?.(this.snapshot("ready"));
  }

  public restart(): void {
    this.state = "WAITING";
    this.result = null;
    this.finalists = [];
    this.score = 0;
    this.gameTime = 0;
    this.countdownRemaining = 0;
    this.scoreText.text = "0";

    for (const id of PLAYERS) {
      this.players[id].ready = false;
      this.players[id].eliminated = false;
      this.players[id].bird.reset();
    }
    this.refreshVisibility();
    this.updateLabels();
    this.pipeManager.reset();
    this.showWaitingState();

    this.emitReadyChange();
    this.onEliminatedChange?.(this.snapshot("eliminated"));
    this.onStateChange?.(this.state);
  }

  public getState(): FlapFlap4PState {
    return this.state;
  }

  public getResult(): FlapFlap4PResult | null {
    return this.result;
  }

  /** The winner, or every player involved in a draw. */
  public getFinalists(): PlayerId[] {
    return this.finalists;
  }

  public getEliminated(): Record<PlayerId, boolean> {
    return this.snapshot("eliminated");
  }

  public getScore(): number {
    return this.score;
  }

  public destroy(): void {
    this.gameContainer.destroy({ children: true, texture: false });
  }
}
