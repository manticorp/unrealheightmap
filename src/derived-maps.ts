/**
 * Extra texture maps derived from raw heights (in metres), for landscape
 * materials and layer painting: normal map, slope, curvature, aspect,
 * height bands, a water mask, ambient occlusion and flow accumulation.
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
  /** Compass direction each slope faces, plus a north-facing weight ("aspect" and "northness"). */
  aspect?: boolean;
  /** Ambient occlusion / sky-view factor from the heightfield. */
  ao?: boolean;
  /** How far in metres AO looks for occluders. Defaults to 50 pixels' worth. */
  aoRadius?: number;
  /** Flow accumulation: where water collects into gullies and rivers. */
  flow?: boolean;
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
  aspect: false,
  ao: false,
  flow: false,
};

export const wantsDerivedMaps = (maps?: DerivedMapOptions): boolean =>
  !!maps && (
    maps.normal !== 'off' || maps.slope || maps.curvature || maps.waterMask || maps.heightBands.length > 0
    || !!maps.aspect || !!maps.ao || !!maps.flow
  );

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

/** Below this slope the aspect map reports 0 ("flat") rather than a direction. */
const FLAT_SLOPE_DEGREES = 0.5;
/** Northness reaches full strength at this slope. */
const NORTHNESS_FULL_SLOPE = 45;

export const DEFAULT_AO_RADIUS_PX = 50;
const AO_DIRECTIONS = 16;
/** Each AO march step is this much further out than the last. */
const AO_STEP_GROWTH = 1.3;

/** Upstream area in m² that maps to 255 in the flow map (100 km²). */
export const FLOW_FULL_AREA = 100e6;
/** Upstream area (m²) below which the flow map stays black: 0.1 ha. */
export const FLOW_MIN_AREA = 1000;

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

  const needsGradient = options.normal !== 'off' || options.slope || options.curvature || !!options.aspect;
  const normal = options.normal !== 'off' ? new Uint8Array(area * 3) : null;
  const slope = options.slope ? new Uint8Array(area) : null;
  const curvature = options.curvature ? new Uint8Array(area) : null;
  const aspect = options.aspect ? new Uint8Array(area) : null;
  const northness = options.aspect ? new Uint8Array(area) : null;
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
        if (aspect) {
          // Downhill direction as compass components; north is -y in the image
          const east = -dzdx;
          const north = dzdy;
          const slopeDegrees = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * 180 / Math.PI;
          if (slopeDegrees < FLAT_SLOPE_DEGREES) {
            aspect[i] = 0;
            northness[i] = 128;
          } else {
            const bearing = Math.atan2(east, north);
            const degrees = (bearing * 180 / Math.PI + 360) % 360;
            aspect[i] = 1 + Math.min(254, Math.floor(degrees / 360 * 255));
            const weight = Math.min(1, slopeDegrees / NORTHNESS_FULL_SLOPE);
            northness[i] = toByte(127.5 + 127.5 * Math.cos(bearing) * weight);
          }
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
  if (aspect) {
    maps.push({name: 'aspect', channels: 1, data: aspect});
    maps.push({name: 'northness', channels: 1, data: northness});
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
  if (options.ao) {
    const radius = options.aoRadius && options.aoRadius > 0 ? options.aoRadius : DEFAULT_AO_RADIUS_PX * (dx + dy) / 2;
    maps.push({name: 'ao', channels: 1, data: computeAmbientOcclusion(heights, width, height, {x: dx, y: dy}, radius)});
  }
  if (options.flow) {
    maps.push({name: 'flow', channels: 1, data: computeFlowMap(heights, width, height, {x: dx, y: dy})});
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

/**
 * Sky-view factor: for each pixel, march outwards in 16 directions to find
 * the highest horizon, then AO = 1 - mean(sin(horizon elevation)). 255 is
 * open sky, darker is more enclosed. Steps grow geometrically, so a large
 * radius costs only a few extra samples. Anything beyond the image edge
 * counts as open, so tile borders read slightly brighter.
 */
export const computeAmbientOcclusion = (
  heights: Float32Array,
  width: number,
  height: number,
  metresPerPixel: {x: number, y: number},
  radiusMetres: number,
): Uint8Array => {
  const dx = metresPerPixel.x;
  const dy = metresPerPixel.y;
  const radiusPx = Math.max(1, Math.min(Math.max(width, height), radiusMetres / Math.min(dx, dy)));

  // Per direction: pixel offsets, index offsets and 1/distance for each step
  const stepX: number[][] = [];
  const stepY: number[][] = [];
  const stepIndex: Int32Array[] = [];
  const stepInvDist: Float64Array[] = [];
  let reach = 0;
  for (let d = 0; d < AO_DIRECTIONS; d++) {
    const angle = d / AO_DIRECTIONS * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let r = 1; ; r = Math.max(r + 1, r * AO_STEP_GROWTH)) {
      const clamped = Math.min(r, radiusPx);
      const ox = Math.round(cos * clamped);
      const oy = Math.round(sin * clamped);
      const last = xs.length - 1;
      if ((ox || oy) && (last < 0 || xs[last] !== ox || ys[last] !== oy)) {
        xs.push(ox);
        ys.push(oy);
        reach = Math.max(reach, Math.abs(ox), Math.abs(oy));
      }
      if (r >= radiusPx) {
        break;
      }
    }
    stepX.push(xs);
    stepY.push(ys);
    stepIndex.push(Int32Array.from(xs.map((ox, k) => ys[k] * width + ox)));
    stepInvDist.push(Float64Array.from(xs.map((ox, k) => 1 / Math.hypot(ox * dx, ys[k] * dy))));
  }

  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const rowInside = y >= reach && y < height - reach;
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const h0 = heights[i];
      const inside = rowInside && x >= reach && x < width - reach;
      let sinSum = 0;
      for (let d = 0; d < AO_DIRECTIONS; d++) {
        const offsets = stepIndex[d];
        const invDist = stepInvDist[d];
        // Tangent of the highest horizon so far; below-horizontal counts as open
        let maxTan = 0;
        if (inside) {
          for (let k = 0; k < offsets.length; k++) {
            const t = (heights[i + offsets[k]] - h0) * invDist[k];
            if (t > maxTan) {
              maxTan = t;
            }
          }
        } else {
          const xs = stepX[d];
          const ys = stepY[d];
          for (let k = 0; k < offsets.length; k++) {
            const sx = x + xs[k];
            const sy = y + ys[k];
            if (sx < 0 || sx >= width || sy < 0 || sy >= height) {
              break;
            }
            const t = (heights[i + offsets[k]] - h0) * invDist[k];
            if (t > maxTan) {
              maxTan = t;
            }
          }
        }
        sinSum += maxTan / Math.sqrt(1 + maxTan * maxTan);
      }
      out[i] = toByte((1 - sinSum / AO_DIRECTIONS) * 255);
    }
  }
  return out;
};

export type FlowResult = {
  /** Number of cells draining through each cell, including itself. */
  cells: Uint32Array;
  /** Index of the cell each cell drains into, or -1 where water leaves the map. */
  receiver: Int32Array;
};

/** Binary min-heap of cell indices keyed by height; grows as needed. */
class HeightHeap {
  private index = new Int32Array(1024);
  private key = new Float32Array(1024);
  size = 0;

  push(i: number, k: number): void {
    if (this.size === this.index.length) {
      const index = new Int32Array(this.size * 2);
      const key = new Float32Array(this.size * 2);
      index.set(this.index);
      key.set(this.key);
      this.index = index;
      this.key = key;
    }
    let pos = this.size++;
    while (pos > 0) {
      const parent = (pos - 1) >> 1;
      if (this.key[parent] <= k) {
        break;
      }
      this.index[pos] = this.index[parent];
      this.key[pos] = this.key[parent];
      pos = parent;
    }
    this.index[pos] = i;
    this.key[pos] = k;
  }

  pop(): number {
    const top = this.index[0];
    const lastIndex = this.index[--this.size];
    const lastKey = this.key[this.size];
    let pos = 0;
    for (;;) {
      let child = pos * 2 + 1;
      if (child >= this.size) {
        break;
      }
      if (child + 1 < this.size && this.key[child + 1] < this.key[child]) {
        child++;
      }
      if (this.key[child] >= lastKey) {
        break;
      }
      this.index[pos] = this.index[child];
      this.key[pos] = this.key[child];
      pos = child;
    }
    this.index[pos] = lastIndex;
    this.key[pos] = lastKey;
    return top;
  }
}

/**
 * D8 flow accumulation over a depression-filled surface.
 *
 * Pits are filled with Priority-Flood (Barnes et al. 2014, with the plain
 * queue for cells inside depressions). The flood visits cells in
 * non-decreasing filled height, so that order doubles as a topological sort:
 * each cell drains to its steepest strictly-lower neighbour on the filled
 * surface, or across flats/filled pits to the cell that flooded it, and both
 * were visited earlier.
 */
export const computeFlowAccumulation = (
  heights: Float32Array,
  width: number,
  height: number,
  metresPerPixel: {x: number, y: number} = {x: 1, y: 1},
): FlowResult => {
  const n = width * height;
  const filled = new Float32Array(n);
  const order = new Int32Array(n);
  // Holds the flooding cell during the flood, then the receiver
  const receiver = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const pit = new Int32Array(n);
  let pitHead = 0;
  let pitTail = 0;
  const heap = new HeightHeap();

  const offX = [-1, 0, 1, -1, 1, -1, 0, 1];
  const offY = [-1, -1, -1, 0, 0, 1, 1, 1];
  const dist = offX.map((ox, k) => Math.hypot(ox * metresPerPixel.x, offY[k] * metresPerPixel.y));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        const i = y * width + x;
        closed[i] = 1;
        filled[i] = heights[i];
        heap.push(i, heights[i]);
      }
    }
  }

  let visited = 0;
  while (pitHead < pitTail || heap.size > 0) {
    const c = pitHead < pitTail ? pit[pitHead++] : heap.pop();
    order[visited++] = c;
    const cx = c % width;
    const cy = (c - cx) / width;
    const level = filled[c];
    for (let k = 0; k < 8; k++) {
      const nx = cx + offX[k];
      const ny = cy + offY[k];
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }
      const nb = ny * width + nx;
      if (closed[nb]) {
        continue;
      }
      closed[nb] = 1;
      receiver[nb] = c;
      if (heights[nb] <= level) {
        filled[nb] = level;
        pit[pitTail++] = nb;
      } else {
        filled[nb] = heights[nb];
        heap.push(nb, heights[nb]);
      }
    }
  }

  // Steepest descent where the filled surface slopes; otherwise keep the flood parent
  for (let c = 0; c < n; c++) {
    const cx = c % width;
    const cy = (c - cx) / width;
    const level = filled[c];
    let best = 0;
    let target = -1;
    for (let k = 0; k < 8; k++) {
      const nx = cx + offX[k];
      const ny = cy + offY[k];
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }
      const nb = ny * width + nx;
      const drop = (level - filled[nb]) / dist[k];
      if (drop > best) {
        best = drop;
        target = nb;
      }
    }
    if (target >= 0) {
      receiver[c] = target;
    }
  }

  const cells = new Uint32Array(n).fill(1);
  for (let k = n - 1; k >= 0; k--) {
    const c = order[k];
    const r = receiver[c];
    if (r >= 0) {
      cells[r] += cells[c];
    }
  }
  return {cells, receiver};
};

/**
 * Flow map: log of the contributing area in m², from FLOW_MIN_AREA (0.1 ha,
 * black) to FLOW_FULL_AREA (100 km², white). Starting at 0.1 ha keeps open
 * hillsides black so only gullies, streams and rivers show; as a guide 1 ha
 * is about 51, 1 km² about 153. The scale is in real area, so tiles and
 * resolutions line up, though a river fed from outside a tile only counts
 * the part inside it.
 */
export const computeFlowMap = (
  heights: Float32Array,
  width: number,
  height: number,
  metresPerPixel: {x: number, y: number},
): Uint8Array => {
  const {cells} = computeFlowAccumulation(heights, width, height, metresPerPixel);
  const cellArea = metresPerPixel.x * metresPerPixel.y;
  const logMin = Math.log(FLOW_MIN_AREA);
  const scale = 255 / (Math.log(FLOW_FULL_AREA) - logMin);
  const out = new Uint8Array(cells.length);
  for (let i = 0; i < cells.length; i++) {
    const upstream = (cells[i] - 1) * cellArea;
    out[i] = upstream > FLOW_MIN_AREA ? toByte((Math.log(upstream) - logMin) * scale) : 0;
  }
  return out;
};
