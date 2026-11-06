/**
 * Rule-based material painter: "rock above 35°", "snow above 2,800 m on north
 * faces", "forest where OpenStreetMap says forest". Rules are applied top to
 * bottom, each taking its share of whatever the rules above left, and a base
 * layer gets the rest, so the weightmaps add up to 255 at every pixel - what
 * Unreal landscape layers expect.
 *
 * Pure, runs in the worker. Settings round-trip through a compact string for
 * share links.
 */

import {DerivedMap} from './derived-maps';

export type Facing = 'any' | 'north' | 'south' | 'east' | 'west';

export type PaintRule = {
  name: string;
  /** #rrggbb, for previews only. */
  color: string;
  minHeight: number | null;
  maxHeight: number | null;
  /** Degrees. */
  minSlope: number | null;
  maxSlope: number | null;
  facing: Facing;
  /** OpenStreetMap layer id the rule is limited to, or '' for anywhere. */
  osm: string;
  /** 0–1: how much of the remaining ground this rule may take. */
  strength: number;
  /** 0–1: how much natural-looking noise breaks up the edges. */
  noise: number;
};

export type PaintSettings = {
  enabled: boolean;
  baseName: string;
  baseColor: string;
  /** Soft edge widths. */
  heightBlend: number;
  slopeBlend: number;
  rules: PaintRule[];
};

export const blankRule = (name = 'New layer', color = '#8a8a8a'): PaintRule => ({
  name, color, minHeight: null, maxHeight: null, minSlope: null, maxSlope: null,
  facing: 'any', osm: '', strength: 1, noise: 0.3,
});

const rule = (partial: Partial<PaintRule> & {name: string, color: string}): PaintRule => ({...blankRule(), ...partial});

export const PAINT_PRESETS: {id: string, label: string, settings: Omit<PaintSettings, 'enabled'>}[] = [
  {
    id: 'alpine', label: 'Alpine',
    settings: {
      baseName: 'Grass', baseColor: '#6f9a4a', heightBlend: 120, slopeBlend: 6,
      rules: [
        rule({name: 'Water', color: '#3d78c4', osm: 'water', noise: 0}),
        rule({name: 'Snow', color: '#f2f5f8', minHeight: 2900, maxSlope: 42, noise: 0.5}),
        rule({name: 'Snow north', color: '#e3e9ef', minHeight: 2400, maxSlope: 40, facing: 'north', noise: 0.5}),
        rule({name: 'Cliff', color: '#6d6762', minSlope: 38, noise: 0.2}),
        rule({name: 'Scree', color: '#9a9187', minHeight: 2100, minSlope: 22, noise: 0.5}),
        rule({name: 'Forest', color: '#2f5a32', osm: 'forest', maxHeight: 2100, noise: 0.2}),
        rule({name: 'Alpine meadow', color: '#93a65a', minHeight: 1900, noise: 0.4}),
      ],
    },
  },
  {
    id: 'temperate', label: 'Temperate lowland',
    settings: {
      baseName: 'Grass', baseColor: '#7aa451', heightBlend: 40, slopeBlend: 5,
      rules: [
        rule({name: 'Water', color: '#3d78c4', osm: 'water', noise: 0}),
        rule({name: 'Road', color: '#55555a', osm: 'roads', noise: 0}),
        rule({name: 'Buildings', color: '#b5655a', osm: 'buildings', noise: 0}),
        rule({name: 'Forest', color: '#2f5a32', osm: 'forest', noise: 0.15}),
        rule({name: 'Rock', color: '#7c766e', minSlope: 35, noise: 0.3}),
        rule({name: 'Farmland', color: '#c2b162', osm: 'farmland', noise: 0.1}),
      ],
    },
  },
  {
    id: 'desert', label: 'Desert',
    settings: {
      baseName: 'Sand', baseColor: '#d8b97c', heightBlend: 60, slopeBlend: 6,
      rules: [
        rule({name: 'Cliff', color: '#8c5a3c', minSlope: 32, noise: 0.25}),
        rule({name: 'Rocky slope', color: '#b07a50', minSlope: 14, noise: 0.5}),
        rule({name: 'Gravel plain', color: '#c8a273', maxSlope: 4, noise: 0.6, strength: 0.6}),
      ],
    },
  },
  {
    id: 'tropical', label: 'Tropical island',
    settings: {
      baseName: 'Jungle', baseColor: '#2e6b34', heightBlend: 15, slopeBlend: 6,
      rules: [
        rule({name: 'Beach', color: '#e8d7a1', maxHeight: 4, maxSlope: 10, noise: 0.3}),
        rule({name: 'Sand', color: '#e8d7a1', osm: 'sand', noise: 0.1}),
        rule({name: 'Cliff', color: '#5d5751', minSlope: 40, noise: 0.2}),
        rule({name: 'Grassland', color: '#8fb35a', maxSlope: 12, maxHeight: 300, noise: 0.5, strength: 0.6}),
      ],
    },
  },
  {
    id: 'rocky', label: 'Moon / Mars / Mercury',
    settings: {
      baseName: 'Dust', baseColor: '#a9a39b', heightBlend: 300, slopeBlend: 6,
      rules: [
        rule({name: 'Rock', color: '#6b665f', minSlope: 18, noise: 0.4}),
        rule({name: 'Rubble', color: '#8a847b', minSlope: 8, noise: 0.6, strength: 0.7}),
      ],
    },
  },
];

export const defaultPaint = (): PaintSettings => ({enabled: false, ...JSON.parse(JSON.stringify(PAINT_PRESETS[0].settings))});

/** OSM layers the rules need. */
export const paintOsmLayers = (s?: PaintSettings): string[] =>
  s && s.enabled ? Array.from(new Set(s.rules.map(r => r.osm).filter(Boolean))) : [];

/* --------------------------- share-link encoding -------------------------- */

const enc = (s: string) => s.replace(/%/g, '%25').replace(/~/g, '%7E').replace(/\|/g, '%7C');
const num = (n: number | null) => n === null || !Number.isFinite(n) ? '' : `${Math.round(n * 100) / 100}`;
const parseNum = (s: string | undefined): number | null => {
  if (s === undefined || s === '') return null;
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : null;
};
const hex = (s: string) => /^#?[0-9a-f]{6}$/i.test(s) ? (s.startsWith('#') ? s : '#' + s).toLowerCase() : '#888888';

export const encodePaint = (s: PaintSettings): string => {
  if (!s.enabled) return '';
  const head = [enc(s.baseName), s.baseColor.replace('#', ''), num(s.heightBlend), num(s.slopeBlend)].join('~');
  const rules = s.rules.map(r => [
    enc(r.name), r.color.replace('#', ''), num(r.minHeight), num(r.maxHeight), num(r.minSlope), num(r.maxSlope),
    r.facing === 'any' ? '' : r.facing[0], r.osm, Math.round(r.strength * 100), Math.round(r.noise * 100),
  ].join('~'));
  return [head, ...rules].join('|');
};

export const decodePaint = (text: string): PaintSettings => {
  if (!text) return {...defaultPaint(), enabled: false};
  const [head, ...rules] = text.split('|');
  const h = head.split('~');
  const facings: Record<string, Facing> = {n: 'north', s: 'south', e: 'east', w: 'west'};
  return {
    enabled: true,
    baseName: decodeURIComponent(h[0] || 'Base'),
    baseColor: hex(h[1] || ''),
    heightBlend: parseNum(h[2]) ?? 50,
    slopeBlend: parseNum(h[3]) ?? 5,
    rules: rules.filter(Boolean).map(r => {
      const f = r.split('~');
      return {
        name: decodeURIComponent(f[0] || 'Layer'),
        color: hex(f[1] || ''),
        minHeight: parseNum(f[2]), maxHeight: parseNum(f[3]),
        minSlope: parseNum(f[4]), maxSlope: parseNum(f[5]),
        facing: facings[f[6]] ?? 'any',
        osm: f[7] || '',
        strength: Math.min(1, Math.max(0, (parseNum(f[8]) ?? 100) / 100)),
        noise: Math.min(1, Math.max(0, (parseNum(f[9]) ?? 0) / 100)),
      };
    }),
  };
};

/* --------------------------------- noise ---------------------------------- */

/** Smooth value noise in 0–1, a few octaves, deterministic. */
export const valueNoise = (width: number, height: number, cellPx: number, seed = 1): Float32Array => {
  const out = new Float32Array(width * height);
  const hash = (x: number, y: number, o: number) => {
    let h = (x * 374761393 + y * 668265263 + o * 2147483647 + seed * 1442695041) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const fade = (t: number) => t * t * (3 - 2 * t);
  let amp = 1, total = 0, cell = Math.max(2, cellPx);
  for (let o = 0; o < 4; o++) {
    for (let y = 0; y < height; y++) {
      const gy = y / cell, y0 = Math.floor(gy), ty = fade(gy - y0);
      for (let x = 0; x < width; x++) {
        const gx = x / cell, x0 = Math.floor(gx), tx = fade(gx - x0);
        const a = hash(x0, y0, o), b = hash(x0 + 1, y0, o), c = hash(x0, y0 + 1, o), d = hash(x0 + 1, y0 + 1, o);
        out[y * width + x] += amp * ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty);
      }
    }
    total += amp;
    amp *= 0.5;
    cell = Math.max(2, cell / 2);
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
};

/* -------------------------------- painting -------------------------------- */

const smoothstep = (t: number) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

/** Soft membership of `v` in [min, max]: 0.5 exactly at a limit, fully in `blend` beyond it. */
export const softRange = (v: number, min: number | null, max: number | null, blend: number): number => {
  const b = Math.max(1e-6, blend);
  const lo = min === null ? 1 : smoothstep((v - min) / b + 0.5);
  const hi = max === null ? 1 : smoothstep((max - v) / b + 0.5);
  return lo * hi;
};

export type TerrainFields = {
  slope: Float32Array;
  /** How much each pixel faces north (+1) or south (-1), and east (+1) or west (-1), scaled by steepness. */
  northness: Float32Array;
  eastness: Float32Array;
};

export const terrainFields = (heights: Float32Array, width: number, height: number, mpp: {x: number, y: number}): TerrainFields => {
  const slope = new Float32Array(width * height);
  const northness = new Float32Array(width * height);
  const eastness = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const ya = Math.max(0, y - 1), yb = Math.min(height - 1, y + 1);
    for (let x = 0; x < width; x++) {
      const xa = Math.max(0, x - 1), xb = Math.min(width - 1, x + 1);
      // Heights rise towards +x (east) and +y (south)
      const gx = (heights[y * width + xb] - heights[y * width + xa]) / ((xb - xa || 1) * mpp.x);
      const gy = (heights[yb * width + x] - heights[ya * width + x]) / ((yb - ya || 1) * mpp.y);
      const g = Math.hypot(gx, gy);
      const i = y * width + x;
      slope[i] = Math.atan(g) * 180 / Math.PI;
      const steep = Math.min(1, slope[i] / 10);
      // A slope faces the way it goes down: uphill to the south faces north
      northness[i] = g > 0 ? gy / g * steep : 0;
      eastness[i] = g > 0 ? -gx / g * steep : 0;
    }
  }
  return {slope, northness, eastness};
};

const facingWeight = (rule: Facing, n: number, e: number) => {
  if (rule === 'any') return 1;
  const f = rule === 'north' ? n : rule === 'south' ? -n : rule === 'east' ? e : -e;
  return smoothstep((f + 0.1) / 0.5);
};

const parseColor = (c: string): [number, number, number] => {
  const h = hex(c);
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
};

export const safeName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'layer';

export type PaintResult = {
  /** One weightmap per rule, then the base layer; they sum to 255. */
  maps: DerivedMap[];
  /** RGBA preview of the painted colours. */
  preview: Uint8ClampedArray;
  /** Share of the area each layer covers, rules then base, 0–1. */
  coverage: number[];
  /** Per-layer weights 0–1 for scatter rules (same order as maps). */
  weights: Float32Array[];
};

export const paintTerrain = (
  heights: Float32Array, width: number, height: number, mpp: {x: number, y: number},
  settings: PaintSettings, osmMasks: {[id: string]: Uint8Array},
  fields: TerrainFields = terrainFields(heights, width, height, mpp),
): PaintResult => {
  const n = width * height;
  const rules = settings.rules;
  const noise = rules.some(r => r.noise > 0) ? valueNoise(width, height, Math.max(4, 60 / Math.max(mpp.x, 0.01)), 7) : null;
  const weights = rules.map(() => new Float32Array(n));
  const base = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let remaining = 1;
    for (let r = 0; r < rules.length; r++) {
      const rule = rules[r];
      let w = rule.strength;
      if (w <= 0) continue;
      w *= softRange(heights[i], rule.minHeight, rule.maxHeight, settings.heightBlend);
      if (w <= 0) continue;
      w *= softRange(fields.slope[i], rule.minSlope, rule.maxSlope, settings.slopeBlend);
      if (w <= 0) continue;
      w *= facingWeight(rule.facing, fields.northness[i], fields.eastness[i]);
      if (rule.osm) {
        const mask = osmMasks[rule.osm];
        w *= mask ? mask[i] / 255 : 0;
      }
      if (noise && rule.noise > 0 && w > 0 && w < 1.0001) {
        // Push weights up or down by the noise, sharpening the result into natural patches
        w = smoothstep(w + (noise[i] - 0.5) * 1.6 * rule.noise);
      }
      const take = Math.min(1, w) * remaining;
      weights[r][i] = take;
      remaining -= take;
      if (remaining <= 1e-6) break;
    }
    base[i] = Math.max(0, remaining);
  }
  const all = [...weights, base];
  const names = [...rules.map(r => r.name), settings.baseName];
  const colors = [...rules.map(r => parseColor(r.color)), parseColor(settings.baseColor)];
  const bytes = all.map(() => new Uint8Array(n));
  const preview = new Uint8ClampedArray(n * 4);
  const coverage = all.map(() => 0);
  for (let i = 0; i < n; i++) {
    let sum = 0, largest = 0, largestAt = 0;
    let cr = 0, cg = 0, cb = 0;
    for (let k = 0; k < all.length; k++) {
      const w = all[k][i];
      const b = Math.round(w * 255);
      bytes[k][i] = b;
      sum += b;
      if (b > largest) { largest = b; largestAt = k; }
      cr += colors[k][0] * w; cg += colors[k][1] * w; cb += colors[k][2] * w;
      coverage[k] += w;
    }
    // Rounding can leave the total at 254 or 256: settle it on the biggest layer
    if (sum !== 255) bytes[largestAt][i] = Math.max(0, Math.min(255, bytes[largestAt][i] + 255 - sum));
    preview[i * 4] = cr; preview[i * 4 + 1] = cg; preview[i * 4 + 2] = cb; preview[i * 4 + 3] = 255;
  }
  const maps: DerivedMap[] = bytes.map((data, k) => ({
    name: `paint_${String(k + 1).padStart(2, '0')}_${safeName(names[k])}`,
    channels: 1 as const,
    data,
  }));
  return {maps, preview, coverage: coverage.map(c => c / n), weights: all};
};
