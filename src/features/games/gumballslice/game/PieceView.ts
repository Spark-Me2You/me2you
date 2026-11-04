/**
 * Piece View
 * Pooled display object for items and sliced halves: an image sprite whose
 * look is swapped in place.
 */

import { Container, Sprite } from "pixi.js";
import type { Look } from "./candyArt";

export class PieceView extends Container {
  private readonly sprite = new Sprite();

  constructor() {
    super();
    this.addChild(this.sprite);
  }

  show(look: Look): void {
    this.sprite.texture = look.texture;
    this.sprite.anchor.set(look.anchorX, 0.5);
    this.sprite.scale.set(look.scale);
    this.sprite.rotation = look.rotation;
  }

}
