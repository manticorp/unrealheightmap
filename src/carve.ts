/**
 * Shape the terrain around OpenStreetMap features so they sit right in a game
 * level: roads and railways get a flat bed that follows a smoothed profile
 * with sloped shoulders, rivers and streams get a channel that always runs
 * downhill (OSM waterways are drawn in the direction of flow), and lakes are
 * levelled to one surface height.
 *
 * Pure functions, run in the worker.
 */

import {OsmFeature, OsmGrid, latLngToPixel, rasterizeLayers} from './osm-layers';
import {sampleBilinear} from './area';

export type CarveOptions = {
  roads: boolean;
  /** Also flatten railways and paths with the roads. */
  railways: boolean;
  rivers: boolean;
  lakes: boolean;
  /** Width of the blended shoulder each side of a road, metres. */
  shoulder: number;
  /** Multiplies the default channel depth (about 15% of the river's width). */
  riverDepth: number;
};

export const defaultCarve: CarveOptions = {
  roads: false,
  railways: false,
  rivers: false,
  lakes: false,
  shoulder: 8,
  riverDepth: 1,
};

export const wantsCarve = (o?: CarveOptions) => !!o && (o.roads || o.railways || o.rivers || o.lakes);

/** OSM layers a carve needs downloaded. */
export const carveLayers = (o?: CarveOptions): string[] => {
  if (!o) return [];
  const ids: string[] = [];
  if (o.roads) ids.push('roads');
  if (o.railways) ids.push('railways');
  if (o.rivers) ids.push('rivers');
  if (o.lakes) ids.push('water');
  return ids;
};

export type Polyline = {xs: Float64Array, ys: Float64Array};

/** Project a lat/lng line to pixels and add points so no gap is wider than `spacing` px. */
export const densify = (grid: OsmGrid, line: [number, number][], spacing = 1): Polyline => {
  const xs: number[] = [], ys: number[] = [];
  let prev: [number, number] | null = null;
  for (const [lat, lng] of line) {
    const p = latLngToPixel(grid, lat, lng);
    if (prev) {
      const d = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      const steps = Math.max(1, Math.ceil(d / spacing));
      for (let k = 1; k <= steps; k++) {
        xs.push(prev[0] + (p[0] - prev[0]) * k / steps);
        ys.push(prev[1] + (p[1] - prev[1]) * k / steps);
      }
    } else {
      xs.push(p[0]);
      ys.push(p[1]);
    }
    prev = p;
  }
  return {xs: Float64Array.from(xs), ys: Float64Array.from(ys)};
};

/** Moving average over `radius` samples each side, shrinking at the ends. */
export const smoothProfile = (values: Float64Array, radius: number): Float64Array => {
  const n = values.length;
  const r = Math.max(0, Math.round(radius));
  if (r === 0 || n < 3) return Float64Array.from(values);
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + values[i];
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - r), b = Math.min(n - 1, i + r);
    out[i] = (prefix[b + 1] - prefix[a]) / (b - a + 1);
  }
  return out;
};

/** Never rises along the line: each point is at most the one before it. */
export const downhillProfile = (values: Float64Array): Float64Array => {
  const out = Float64Array.from(values);
  for (let i = 1; i < out.length; i++) if (out[i] > out[i - 1]) out[i] = out[i - 1];
  return out;
};

const smoothstep = (t: number) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

type Stamp = {weight: Float32Array, target: Float32Array};

/**
 * Stamp a carved line into the weight/target buffers. Inside half the width
 * the ground goes to the target; over the shoulder it blends back. `depthAt`
 * gives an extra cut below the profile for a channel cross-section.
 */
const stampLine = (
  stamp: Stamp, width: number, height: number, line: Polyline, profile: Float64Array,
  halfWidth: number, shoulder: number, channelDepth: number,
) => {
  const reach = halfWidth + shoulder;
  const {xs, ys} = line;
  for (let k = 0; k + 1 < xs.length; k++) {
    const ax = xs[k], ay = ys[k], bx = xs[k + 1], by = ys[k + 1];
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - reach));
    const x1 = Math.min(width - 1, Math.ceil(Math.max(ax, bx) + reach));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - reach));
    const y1 = Math.min(height - 1, Math.ceil(Math.max(ay, by) + reach));
    if (x0 > x1 || y0 > y1) continue;
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5;
      for (let x = x0; x <= x1; x++) {
        const xc = x + 0.5;
        let t = lenSq > 0 ? ((xc - ax) * dx + (yc - ay) * dy) / lenSq : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const d = Math.hypot(xc - ax - t * dx, yc - ay - t * dy);
        if (d >= reach) continue;
        const w = d <= halfWidth ? 1 : smoothstep(1 - (d - halfWidth) / shoulder);
        const i = y * width + x;
        if (w <= stamp.weight[i]) continue;
        let target = profile[k] + (profile[k + 1] - profile[k]) * t;
        if (channelDepth > 0) {
          // Parabolic channel: deepest in the middle, back to the profile at the banks
          const across = Math.min(1, d / Math.max(0.5, halfWidth));
          target -= channelDepth * (1 - across * across);
        }
        stamp.weight[i] = w;
        stamp.target[i] = target;
      }
    }
  }
};

const applyStamp = (heights: Float32Array, stamp: Stamp) => {
  for (let i = 0; i < heights.length; i++) {
    const w = stamp.weight[i];
    if (w > 0) heights[i] = heights[i] * (1 - w) + stamp.target[i] * w;
  }
};

export type CarveResult = {roads: number, rivers: number, lakes: number};

/**
 * Carve features into `heights` (metres, width × height on `grid`) in place.
 * `metresPerPixel` converts widths and shoulders to pixels.
 */
export const carveTerrain = (
  heights: Float32Array, width: number, height: number,
  features: OsmFeature[], grid: OsmGrid, options: CarveOptions, metresPerPixel: number,
): CarveResult => {
  const mpp = Math.max(1e-6, metresPerPixel);
  const result: CarveResult = {roads: 0, rivers: 0, lakes: 0};
  const original = Float32Array.from(heights);
  const sample = (line: Polyline) => {
    const out = new Float64Array(line.xs.length);
    for (let i = 0; i < out.length; i++) out[i] = sampleBilinear(original, width, height, line.xs[i] - 0.5, line.ys[i] - 0.5);
    return out;
  };
  const inside = (line: Polyline, margin: number) => {
    for (let i = 0; i < line.xs.length; i++) {
      if (line.xs[i] >= -margin && line.ys[i] >= -margin && line.xs[i] <= width + margin && line.ys[i] <= height + margin) return true;
    }
    return false;
  };

  // Lakes first, so rivers and roads cut through the levelled surface
  if (options.lakes) {
    const lakes = features.filter(f => f.layer === 'water' && f.kind === 'area' && f.rings);
    for (const lake of lakes) {
      const [mask] = rasterizeLayers([{...lake, layer: 'lake'}], grid, {layerIds: ['lake'], supersample: 2});
      const values: number[] = [];
      for (let i = 0; i < mask.data.length; i++) if (mask.data[i] >= 128) values.push(original[i]);
      if (values.length < 4) continue;
      values.sort((a, b) => a - b);
      // A low percentile: the DEM's water surface, ignoring overhanging trees on the shore
      const level = values[Math.floor(values.length * 0.1)];
      for (let i = 0; i < mask.data.length; i++) {
        const t = mask.data[i] / 255;
        if (t > 0) heights[i] = heights[i] * (1 - t) + Math.min(heights[i], level) * t;
      }
      result.lakes++;
    }
  }

  const roadLayers = new Set<string>();
  if (options.roads) roadLayers.add('roads');
  if (options.railways) {
    roadLayers.add('railways');
    roadLayers.add('paths');
  }
  if (roadLayers.size) {
    const stamp: Stamp = {weight: new Float32Array(heights.length), target: new Float32Array(heights.length)};
    const shoulder = Math.max(1.5, options.shoulder / mpp);
    for (const f of features) {
      if (!roadLayers.has(f.layer) || f.kind !== 'line' || !f.lines || f.bridge) continue;
      const halfWidth = Math.max(0.75, (f.widthMetres ?? 6) / mpp / 2);
      for (const raw of f.lines) {
        const line = densify(grid, raw, 1);
        if (line.xs.length < 2 || !inside(line, halfWidth + shoulder)) continue;
        // Average over about 40 m of road, so the bed ignores bumps and trees in the data
        const profile = smoothProfile(sample(line), Math.max(2, 20 / mpp));
        stampLine(stamp, width, height, line, profile, halfWidth, shoulder, 0);
        result.roads++;
      }
    }
    applyStamp(heights, stamp);
  }

  if (options.rivers) {
    const stamp: Stamp = {weight: new Float32Array(heights.length), target: new Float32Array(heights.length)};
    const after = Float32Array.from(heights);
    for (const f of features) {
      if (f.layer !== 'rivers' || f.kind !== 'line' || !f.lines || f.bridge) continue;
      const widthM = f.widthMetres ?? 3;
      const halfWidth = Math.max(0.75, widthM / mpp / 2);
      const bank = Math.max(1.5, Math.min(30, widthM * 0.75) / mpp);
      const depth = Math.min(6, Math.max(0.5, widthM * 0.15)) * Math.max(0, options.riverDepth);
      for (const raw of f.lines) {
        const line = densify(grid, raw, 1);
        if (line.xs.length < 2 || !inside(line, halfWidth + bank)) continue;
        const heightsAlong = new Float64Array(line.xs.length);
        for (let i = 0; i < heightsAlong.length; i++) heightsAlong[i] = sampleBilinear(after, width, height, line.xs[i] - 0.5, line.ys[i] - 0.5);
        const profile = downhillProfile(smoothProfile(heightsAlong, Math.max(1, 10 / mpp)));
        stampLine(stamp, width, height, line, profile, halfWidth, bank, depth);
        result.rivers++;
      }
    }
    // Rivers only ever lower the ground
    for (let i = 0; i < heights.length; i++) {
      const w = stamp.weight[i];
      if (w > 0 && stamp.target[i] < heights[i]) heights[i] = heights[i] * (1 - w) + stamp.target[i] * w;
    }
  }
  return result;
};
