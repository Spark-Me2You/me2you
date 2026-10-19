/**
 * Fixture images
 * Generated on a canvas at runtime so the repo doesn't carry binary fixtures and
 * every storage path resolves to a deterministic image.
 *
 * Path conventions (used by fixture rows):
 *   *_cropped.png  -> transparent bobblehead (head only)
 *   *drawing*      -> white-background doodle
 *   anything else  -> full "photo" with head + shoulders
 */

const cache = new Map<string, string>();

const PALETTE = ['#f4a3c0', '#8ed1fc', '#ffd166', '#06d6a0', '#c3aed6', '#ff9f68', '#9ad1d4', '#f7b2bd'];
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#d4a373'];
const HAIR = ['#2b1d0e', '#6b4226', '#d6b370', '#1c1c1c', '#a0522d', '#e8e8e8'];

/** Normalized bobblehead landmarks matching the generated head image. */
export const HEAD_LANDMARKS = {
  leftEye: { x: 0.383, y: 0.469 },
  rightEye: { x: 0.617, y: 0.469 },
  noseTip: { x: 0.5, y: 0.56 },
  mouthCenter: { x: 0.5, y: 0.66 },
  faceCenter: { x: 0.5, y: 0.61 },
  chinBottom: { x: 0.5, y: 0.92 },
  foreheadTop: { x: 0.5, y: 0.18 },
};

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(list: T[], seed: number, salt: number): T {
  return list[(seed >>> salt) % list.length];
}

function canvas(width: number, height: number) {
  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;
  const ctx = el.getContext('2d')!;
  return { el, ctx };
}

/** Draws a face whose box is (x, y, size, size); landmarks follow HEAD_LANDMARKS. */
function drawHead(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number) {
  const s = size / 256;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  ctx.fillStyle = pick(SKIN, seed, 3);
  ctx.beginPath();
  ctx.ellipse(128, 140, 82, 100, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = pick(HAIR, seed, 7);
  ctx.beginPath();
  ctx.ellipse(128, 78, 88, 52, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(40, 76, 176, 22);

  ctx.fillStyle = '#222';
  for (const ex of [98, 158]) {
    ctx.beginPath();
    ctx.arc(ex, 120, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = '#7a3b2e';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(128, 150, 32, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

function bobblehead(path: string): string {
  const seed = hash(path);
  const { el, ctx } = canvas(256, 256);
  drawHead(ctx, 0, 0, 256, seed);
  return el.toDataURL('image/png');
}

function photo(path: string): string {
  const seed = hash(path);
  const { el, ctx } = canvas(480, 640);
  ctx.fillStyle = pick(PALETTE, seed, 0);
  ctx.fillRect(0, 0, 480, 640);

  ctx.fillStyle = pick(PALETTE, seed, 11);
  ctx.beginPath();
  ctx.ellipse(240, 640, 190, 170, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  drawHead(ctx, 112, 170, 256, seed);

  const label = path.match(/(wave|peace_sign|thumbs_up)/)?.[1];
  if (label) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(16, 16, 200, 44);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(label.replace('_', ' '), 28, 48);
  }
  return el.toDataURL('image/jpeg', 0.85);
}

function doodle(path: string): string {
  const seed = hash(path);
  const { el, ctx } = canvas(600, 600);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 600, 600);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let rng = seed;
  const rand = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 2 ** 32;
  };

  for (let stroke = 0; stroke < 6; stroke++) {
    ctx.strokeStyle = pick(PALETTE.concat('#333'), seed, stroke * 3);
    ctx.lineWidth = 6 + rand() * 14;
    ctx.beginPath();
    let px = 100 + rand() * 400;
    let py = 100 + rand() * 400;
    ctx.moveTo(px, py);
    for (let i = 0; i < 8; i++) {
      px = Math.min(560, Math.max(40, px + (rand() - 0.5) * 160));
      py = Math.min(560, Math.max(40, py + (rand() - 0.5) * 160));
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  return el.toDataURL('image/png');
}

export function placeholderImageUrl(path: string): string {
  const cached = cache.get(path);
  if (cached) return cached;
  const url = path.includes('_cropped') ? bobblehead(path) : path.includes('drawing') ? doodle(path) : photo(path);
  cache.set(path, url);
  return url;
}

/** A photo-like Blob, for stories that need a captured image (e.g. registration preview). */
export async function placeholderPhotoBlob(seed = 'captured-photo'): Promise<Blob> {
  const response = await fetch(placeholderImageUrl(`${seed}.jpg`));
  return response.blob();
}

export async function placeholderHeadBlob(seed = 'captured-photo'): Promise<Blob> {
  const response = await fetch(placeholderImageUrl(`${seed}_cropped.png`));
  return response.blob();
}
