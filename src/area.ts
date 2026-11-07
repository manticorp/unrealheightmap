/**
 * Rotated and custom-shaped export areas.
 *
 * The export grid can be rotated about its centre (degrees clockwise, so 90°
 * makes the top of the image point east). Heights are fetched for the
 * axis-aligned box around the rotated area and resampled into the rotated grid.
 *
 * Pixel offsets use screen axes: x right (east), y down (south).
 */

const rad = (deg: number) => deg * Math.PI / 180;

/** Offset on the map for an offset (du, dv) in the rotated output grid. */
export const rotateOut = (du: number, dv: number, degrees: number): [number, number] => {
  if (!degrees) return [du, dv];
  const c = Math.cos(rad(degrees)), s = Math.sin(rad(degrees));
  return [du * c - dv * s, du * s + dv * c];
};

/** Offset in the rotated output grid for an offset (dx, dy) on the map. */
export const rotateIn = (dx: number, dy: number, degrees: number): [number, number] => {
  if (!degrees) return [dx, dy];
  const c = Math.cos(rad(degrees)), s = Math.sin(rad(degrees));
  return [dx * c + dy * s, -dx * s + dy * c];
};

/** Normalise any angle to 0 <= a < 360. */
export const normaliseAngle = (degrees: number) => ((degrees % 360) + 360) % 360;

/**
 * Map-pixel box (relative to the area centre) covering a rotated grid of
 * gridWidth × gridHeight whose top-left corner is the top-left of the
 * areaWidth × areaHeight area (larger grids extend right and down).
 */
export const rotatedBounds = (areaWidth: number, areaHeight: number, gridWidth: number, gridHeight: number, degrees: number) => {
  const left = -areaWidth / 2, top = -areaHeight / 2;
  const corners: [number, number][] = [
    [left, top], [left + gridWidth, top], [left, top + gridHeight], [left + gridWidth, top + gridHeight],
  ];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [u, v] of corners) {
    const [x, y] = rotateOut(u, v, degrees);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return {minX, minY, maxX, maxY};
};

/** Corners of the rotated area (map-pixel offsets from its centre), clockwise from top-left. */
export const rotatedCorners = (width: number, height: number, degrees: number): [number, number][] =>
  ([[-width / 2, -height / 2], [width / 2, -height / 2], [width / 2, height / 2], [-width / 2, height / 2]] as [number, number][])
    .map(([u, v]) => rotateOut(u, v, degrees));

export type ResampleSpec = {
  /** Degrees clockwise. */
  rotation: number;
  /** Output grid size (may be larger than the area, for seam cutting). */
  gridWidth: number;
  gridHeight: number;
  /** The export area itself. */
  areaWidth: number;
  areaHeight: number;
  /** Area centre in source-grid pixels. */
  centreX: number;
  centreY: number;
};

/** Bilinear sample of a grid at fractional pixel-centre coordinates, clamped at the edges. */
export const sampleBilinear = (src: Float32Array, width: number, height: number, fx: number, fy: number): number => {
  const x = Math.min(width - 1, Math.max(0, fx));
  const y = Math.min(height - 1, Math.max(0, fy));
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1);
  const tx = x - x0, ty = y - y0;
  const a = src[y0 * width + x0], b = src[y0 * width + x1];
  const c = src[y1 * width + x0], d = src[y1 * width + x1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
};

/** Resample the axis-aligned source into the rotated grid. */
export const resampleRotated = (src: Float32Array, srcWidth: number, srcHeight: number, spec: ResampleSpec): Float32Array => {
  const {gridWidth: W, gridHeight: H} = spec;
  const out = new Float32Array(W * H);
  const c = Math.cos(rad(spec.rotation)), s = Math.sin(rad(spec.rotation));
  for (let j = 0; j < H; j++) {
    const dv = j + 0.5 - spec.areaHeight / 2;
    for (let i = 0; i < W; i++) {
      const du = i + 0.5 - spec.areaWidth / 2;
      const x = spec.centreX + du * c - dv * s;
      const y = spec.centreY + du * s + dv * c;
      out[j * W + i] = sampleBilinear(src, srcWidth, srcHeight, x - 0.5, y - 0.5);
    }
  }
  return out;
};

/** Rotate an RGBA image the same way (for albedo and textures), nearest-neighbour-free via bilinear. */
export const resampleRotatedRgba = (src: Uint8ClampedArray, srcWidth: number, srcHeight: number, spec: ResampleSpec): Uint8ClampedArray => {
  const {gridWidth: W, gridHeight: H} = spec;
  const out = new Uint8ClampedArray(W * H * 4);
  const c = Math.cos(rad(spec.rotation)), s = Math.sin(rad(spec.rotation));
  for (let j = 0; j < H; j++) {
    const dv = j + 0.5 - spec.areaHeight / 2;
    for (let i = 0; i < W; i++) {
      const du = i + 0.5 - spec.areaWidth / 2;
      const fx = Math.min(srcWidth - 1, Math.max(0, spec.centreX + du * c - dv * s - 0.5));
      const fy = Math.min(srcHeight - 1, Math.max(0, spec.centreY + du * s + dv * c - 0.5));
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const x1 = Math.min(srcWidth - 1, x0 + 1), y1 = Math.min(srcHeight - 1, y0 + 1);
      const tx = fx - x0, ty = fy - y0;
      for (let k = 0; k < 4; k++) {
        const a = src[(y0 * srcWidth + x0) * 4 + k], b = src[(y0 * srcWidth + x1) * 4 + k];
        const cc = src[(y1 * srcWidth + x0) * 4 + k], d = src[(y1 * srcWidth + x1) * 4 + k];
        out[(j * W + i) * 4 + k] = (a * (1 - tx) + b * tx) * (1 - ty) + (cc * (1 - tx) + d * tx) * ty;
      }
    }
  }
  return out;
};

/**
 * Outside a custom shape, set heights to the lowest point inside it, blending
 * by the mask's anti-aliased coverage (255 = inside).
 */
export const applyShapeMask = (heights: Float32Array, mask: Uint8Array): {floor: number, insideFraction: number} => {
  let floor = Infinity, inside = 0;
  for (let i = 0; i < heights.length; i++) {
    if (mask[i] >= 128) {
      inside++;
      if (heights[i] < floor) floor = heights[i];
    }
  }
  if (!Number.isFinite(floor)) return {floor: 0, insideFraction: 0};
  for (let i = 0; i < heights.length; i++) {
    const t = mask[i] / 255;
    if (t < 1) heights[i] = floor + (heights[i] - floor) * t;
  }
  return {floor, insideFraction: inside / heights.length};
};

/** Encode a lat/lng ring for the URL: "lat,lng;lat,lng;…" with 5 decimals. */
export const encodeShape = (ring: [number, number][]): string =>
  ring.map(([lat, lng]) => `${+lat.toFixed(5)},${+lng.toFixed(5)}`).join(';');

export const decodeShape = (text: string): [number, number][] => {
  if (!text) return [];
  const out: [number, number][] = [];
  for (const part of text.split(';')) {
    const [a, b] = part.split(',').map(parseFloat);
    if (Number.isFinite(a) && Number.isFinite(b)) out.push([a, b]);
  }
  return out.length >= 3 ? out : [];
};
