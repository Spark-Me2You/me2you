/**
 * Fake camera
 * Replaces navigator.mediaDevices.getUserMedia with a canvas stream showing
 * a cartoon figure per simulated player, so <video> elements get real frames
 * (readyState >= 2, non-zero videoWidth) and still-photo capture works.
 */

import { poseLandmarks, sim } from './simInput';

export type CameraMode = 'ok' | 'denied' | 'missing';

const WIDTH = 640;
const HEIGHT = 480;

let mode: CameraMode = 'ok';
let source: { canvas: HTMLCanvasElement; timer: number } | null = null;

function draw(ctx: CanvasRenderingContext2D) {
  const t = performance.now() / 1000;
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#5b6b8c');
  gradient.addColorStop(1, '#2d3447');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Frames are drawn unmirrored, as a real camera would; the app mirrors on display.
  for (const pose of poseLandmarks()) {
    const px = (p: { x: number }) => p.x * WIDTH;
    const py = (p: { y: number }) => p.y * HEIGHT + Math.sin(t * 2) * 2;
    ctx.strokeStyle = '#f5d0a9';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px(pose[11]), py(pose[11]));
    ctx.lineTo(px(pose[13]), py(pose[13]));
    ctx.lineTo(px(pose[15]), py(pose[15]));
    ctx.moveTo(px(pose[12]), py(pose[12]));
    ctx.lineTo(px(pose[14]), py(pose[14]));
    ctx.lineTo(px(pose[16]), py(pose[16]));
    ctx.stroke();

    ctx.fillStyle = '#e07a5f';
    ctx.fillRect(px(pose[12]), py(pose[12]), px(pose[11]) - px(pose[12]), HEIGHT - py(pose[12]));

    ctx.fillStyle = '#f5d0a9';
    ctx.beginPath();
    ctx.arc(px(pose[0]), py(pose[0]), 42, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!sim.face) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function startSource() {
  if (source) return source.canvas;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;
  draw(ctx);
  const timer = window.setInterval(() => draw(ctx), 1000 / 20);
  source = { canvas, timer };
  return canvas;
}

async function fakeGetUserMedia(constraints?: MediaStreamConstraints): Promise<MediaStream> {
  if (!constraints?.video) throw new DOMException('Only video is simulated', 'NotSupportedError');
  if (mode === 'denied') throw new DOMException('Permission denied', 'NotAllowedError');
  if (mode === 'missing') throw new DOMException('Requested device not found', 'NotFoundError');
  return startSource().captureStream(20);
}

export function installFakeCamera(cameraMode: CameraMode = 'ok') {
  mode = cameraMode;
  if (!navigator.mediaDevices) {
    Object.defineProperty(navigator, 'mediaDevices', { value: {} as MediaDevices, configurable: true });
  }
  navigator.mediaDevices.getUserMedia = fakeGetUserMedia;
}

/** Stops drawing frames; streams handed out earlier simply freeze. */
export function stopFakeCamera() {
  if (source) {
    window.clearInterval(source.timer);
    source = null;
  }
}
