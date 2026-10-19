/**
 * Piece View
 * Pooled display object for items and sliced halves. Shows either a vector
 * look (shared GraphicsContext) or a sprite look (texture), swapped in place.
 */

import { Container, Graphics, Sprite } from "pixi.js";
import type { Look } from "./candyArt";

export class PieceView extends Container {
  private readonly gfx = new Graphics();
  private readonly sprite = new Sprite();

  constructor() {
    super();
    this.sprite.anchor.set(0.5);
    this.addChild(this.gfx, this.sprite);
  }

  show(look: Look): void {
    const vector = look.type === "vector";
    this.gfx.visible = vector;
    this.sprite.visible = !vector;
    if (look.type === "vector") {
      this.gfx.context = look.context;
    } else {
      this.sprite.texture = look.texture;
      this.sprite.scale.set(look.scale);
      this.sprite.rotation = look.rotation;
    }
  }
}
