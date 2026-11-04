/**
 * Extra texture maps derived from raw heights (in metres), for landscape
 * materials and layer painting: normal map, slope, curvature, height bands
 * and a water mask.
 *
 * Everything here is pure so it can run in the worker and be unit tested.
 */

export type NormalMapConvention = 'off' | 'directx' | 'opengl';

export type WaterOptions = {
  /** Height in metres treated as the water surface. */
  level: number;
  /** Raise everything below `level` up to it before normalising. */
  flatten: boolean;
};

export type DerivedMapOptions = {
  normal: NormalMapConvention;
  slope: boolean;
  curvature: boolean;
  waterMask: boolean;
  /** Edges between height bands in metres, e.g. [500, 1500] gives three bands. */
  heightBands: number[];
};

export type ProcessOptions = {
  water?: WaterOptions;
  maps?: DerivedMapOptions;
  /** Ground distance covered by one pixel, needed for slopes and normals. */
  metresPerPixel?: {x: number, y: number};
};

export type DerivedMap = {
  /** Filename suffix, e.g. "normal_dx" or "band_01_500-1500m". */
  name: string;
  channels: 1 | 3;
  data: Uint8Array;
};

export const noDerivedMaps: DerivedMapOptions = {
  normal: 'off',
  slope: false,
  curvature: false,
  waterMask: false,
  heightBands: [],
};

export const wantsDerivedMaps = (maps?: DerivedMapOptions): boolean =>
  !!maps && (maps.normal !== 'off' || maps.slope || maps.curvature || maps.waterMask || maps.heightBands.length > 0);

/** Parse "500, 1500 2500" into sorted unique numbers; anything unparseable is dropped. */
export const parseHeightBands = (text: string): number[] => {
  const values = (text || '')
    .split(/[\s,;]+/)
    .map(s => parseFloat(s))
    .filter(n => Number.isFinite(n));
  return Array.from(new Set(values)).sort((a, b) => a - b);
};

/** Raise every sample below `level` up to `level`, in place. */
export const flattenBelow = (heights: Float32Array, level: number): void => {
  for (let i = 0; i < heights.length; i++) {
    if (heights[i] < level) {
      heights[i] = level;
    }
  }
};

const toByte = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));

/**
 * Curvature is written as 128 = flat, brighter = convex (ridges), darker =
 * concave (valleys). The scale is fixed rather than auto-contrasted so tiles
 * exported separately still match each other.
 */
// Saturates when a point sits half a pixel-width above/below its neighbours
const CURVATURE_GAIN = 2 * 127;

/** Width in metres of the blend between neighbouring height bands. */
const MAX_BAND_BLEND = 50;

export const computeDerivedMaps = (
  heights: Float32Array,
  width: number,
  height: number,
  options: DerivedMapOptions,
  metresPerPixel: {x: number, y: number},
  waterLevel: number = 0,
): DerivedMap[] => {
  const maps: DerivedMap[] = [];
  const area = width * height;
  const dx = metresPerPixel.x > 0 ? metresPerPixel.x : 1;
  const dy = metresPerPixel.y > 0 ? metresPerPixel.y : 1;

  const needsGradient = options.normal !== 'off' || options.slope || options.curvature;
  const normal = options.normal !== 'off' ? new Uint8Array(area * 3) : null;
  const slope = options.slope ? new Uint8Array(area) : null;
  const curvature = options.curvature ? new Uint8Array(area) : null;
  // Green points "up" the image in OpenGL; DirectX (Unreal) flips it.
  const greenSign = options.normal === 'directx' ? -1 : 1;

  if (needsGradient) {
    for (let y = 0; y < height; y++) {
      const yUp = y > 0 ? y - 1 : y;
      const yDown = y < height - 1 ? y + 1 : y;
      const spanY = (yDown - yUp) * dy || dy;
      for (let x = 0; x < width; x++) {
        const xLeft = x > 0 ? x - 1 : x;
        const xRight = x < width - 1 ? x + 1 : x;
        const spanX = (xRight - xLeft) * dx || dx;
        const i = y * width + x;
        const h = heights[i];
        const hL = heights[y * width + xLeft];
        const hR = heights[y * width + xRight];
        const hU = heights[yUp * width + x];
        const hD = heights[yDown * width + x];
        // Rise per metre towards +x (east) and +y (down the image, south)
        const dzdx = (hR - hL) / spanX;
        const dzdy = (hD - hU) / spanY;

        if (normal) {
          const nx = -dzdx;
          const ny = dzdy * greenSign;
          const len = Math.sqrt(nx * nx + ny * ny + 1);
          normal[i * 3]     = toByte((nx / len * 0.5 + 0.5) * 255);
          normal[i * 3 + 1] = toByte((ny / len * 0.5 + 0.5) * 255);
          normal[i * 3 + 2] = toByte((1 / len * 0.5 + 0.5) * 255);
        }
        if (slope) {
          const degrees = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * 180 / Math.PI;
          slope[i] = toByte(degrees / 90 * 255);
        }
        if (curvature) {
          // How far this point sits above the average of its neighbours,
          // relative to pixel size: positive on ridges, negative in valleys.
          const lift = h - (hL + hR + hU + hD) / 4;
          curvature[i] = toByte(128 + (lift / ((dx + dy) / 2)) * CURVATURE_GAIN);
        }
      }
    }
  }

  if (normal) {
    maps.push({name: options.normal === 'directx' ? 'normal_dx' : 'normal_gl', channels: 3, data: normal});
  }
  if (slope) {
    maps.push({name: 'slope', channels: 1, data: slope});
  }
  if (curvature) {
    maps.push({name: 'curvature', channels: 1, data: curvature});
  }
  if (options.waterMask) {
    const mask = new Uint8Array(area);
    for (let i = 0; i < area; i++) {
      mask[i] = heights[i] <= waterLevel ? 255 : 0;
    }
    maps.push({name: 'watermask', channels: 1, data: mask});
  }
  if (options.heightBands.length) {
    maps.push(...computeHeightBands(heights, options.heightBands));
  }
  return maps;
};

/**
 * One weight mask per band. Bands blend linearly across each edge and the
 * weights add up to 255 (give or take rounding), so they can be imported directly as landscape
 * layer weightmaps.
 */
export const computeHeightBands = (heights: Float32Array, edges: number[]): DerivedMap[] => {
  const sorted = [...edges].sort((a, b) => a - b);
  let minGap = Infinity;
  for (let i = 1; i < sorted.length; i++) {
    minGap = Math.min(minGap, sorted[i] - sorted[i - 1]);
  }
  const blend = Math.max(1e-6, Math.min(MAX_BAND_BLEND, minGap / 2));
  // Fraction of the way above an edge (0 below, 1 above, linear across the blend)
  const above = (h: number, edge: number) => Math.max(0, Math.min(1, (h - (edge - blend / 2)) / blend));

  const digits = Math.max(2, sorted.length.toString().length);
  const fmt = (n: number) => `${n}m`;
  const pad = (n: number) => n.toString().padStart(digits, '0');
  const bands: DerivedMap[] = [];
  for (let b = 0; b <= sorted.length; b++) {
    const lower = b > 0 ? sorted[b - 1] : null;
    const upper = b < sorted.length ? sorted[b] : null;
    const label = lower === null ? `below_${fmt(upper)}`
      : upper === null ? `above_${fmt(lower)}`
      : `${fmt(lower)}-${fmt(upper)}`;
    const data = new Uint8Array(heights.length);
    for (let i = 0; i < heights.length; i++) {
      const h = heights[i];
      const fromBelow = lower === null ? 1 : above(h, lower);
      const toAbove = upper === null ? 0 : above(h, upper);
      data[i] = toByte((fromBelow - toAbove) * 255);
    }
    bands.push({name: `band_${pad(b)}_${label}`, channels: 1, data});
  }
  return bands;
};
