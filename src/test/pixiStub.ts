/**
 * Minimal stand-ins for the pixi.js display objects the game engines touch.
 * Use via `vi.mock('pixi.js', () => import('@/test/pixiStub'))`. No renderer or
 * WebGL is involved, so engine/physics logic can be unit tested in jsdom.
 */

class StubDisplayObject {
  x = 0
  y = 0
  rotation = 0
  visible = true
  destroyed = false
  children: StubDisplayObject[] = []
  anchor = { set: () => {} }

  addChild<T extends StubDisplayObject>(child: T): T {
    this.children.push(child)
    return child
  }

  removeChild<T extends StubDisplayObject>(child: T): T {
    this.children = this.children.filter((c) => c !== child)
    return child
  }

  destroy(): void {
    this.destroyed = true
  }
}

export class Container extends StubDisplayObject {}

export class Graphics extends StubDisplayObject {
  clear = () => this
  beginFill = () => this
  endFill = () => this
  drawRect = () => this
  drawEllipse = () => this
  drawCircle = () => this
  moveTo = () => this
  lineTo = () => this
  closePath = () => this
}

export class Text extends StubDisplayObject {
  text: string
  constructor(options: { text?: string } = {}) {
    super()
    this.text = options.text ?? ''
  }
}

export class TextStyle {}
