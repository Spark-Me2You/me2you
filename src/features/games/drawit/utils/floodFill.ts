// Scanline flood-fill on a 2D canvas. Mutates the canvas in place.
// Tolerance accounts for antialiased stroke edges.

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [r, g, b, 255];
}

function colorsMatch(
  data: Uint8ClampedArray,
  i: number,
  target: [number, number, number, number],
  tol: number,
): boolean {
  return (
    Math.abs(data[i] - target[0]) <= tol &&
    Math.abs(data[i + 1] - target[1]) <= tol &&
    Math.abs(data[i + 2] - target[2]) <= tol &&
    Math.abs(data[i + 3] - target[3]) <= tol
  );
}

export function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillHex: string,
  tolerance = 24,
): void {
  const { width, height } = ctx.canvas;
  const sx = Math.floor(startX);
  const sy = Math.floor(startY);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return;

  const img = ctx.getImageData(0, 0, width, height);
  const data = img.data;
  const startIdx = (sy * width + sx) * 4;
  const target: [number, number, number, number] = [
    data[startIdx],
    data[startIdx + 1],
    data[startIdx + 2],
    data[startIdx + 3],
  ];
  const fill = hexToRgba(fillHex);

  if (
    target[0] === fill[0] &&
    target[1] === fill[1] &&
    target[2] === fill[2] &&
    target[3] === fill[3]
  ) {
    return;
  }

  const stack: Array<[number, number]> = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    let ny = y;
    // climb up to top of matching column
    while (ny >= 0 && colorsMatch(data, (ny * width + x) * 4, target, tolerance)) {
      ny--;
    }
    ny++;

    let reachLeft = false;
    let reachRight = false;
    while (ny < height && colorsMatch(data, (ny * width + x) * 4, target, tolerance)) {
      const idx = (ny * width + x) * 4;
      data[idx] = fill[0];
      data[idx + 1] = fill[1];
      data[idx + 2] = fill[2];
      data[idx + 3] = fill[3];

      if (x > 0) {
        const leftIdx = (ny * width + (x - 1)) * 4;
        const leftMatch = colorsMatch(data, leftIdx, target, tolerance);
        if (leftMatch && !reachLeft) {
          stack.push([x - 1, ny]);
          reachLeft = true;
        } else if (!leftMatch) {
          reachLeft = false;
        }
      }
      if (x < width - 1) {
        const rightIdx = (ny * width + (x + 1)) * 4;
        const rightMatch = colorsMatch(data, rightIdx, target, tolerance);
        if (rightMatch && !reachRight) {
          stack.push([x + 1, ny]);
          reachRight = true;
        } else if (!rightMatch) {
          reachRight = false;
        }
      }
      ny++;
    }
  }

  ctx.putImageData(img, 0, 0);
}
