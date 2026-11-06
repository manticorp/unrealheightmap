/**
 * Real treemaps: where the trees are, how tall they are and what kind, from
 * measured data rather than rules.
 *
 * - Canopy height (Switzerland, 1 m): individual trees are found as local
 *   maxima of the canopy height model, each with its real height.
 * - Tree cover (worldwide, ESA WorldCover 10 m): where there is no canopy
 *   height, trees are scattered through the mapped forest at a set density.
 * - Leaf type (OpenStreetMap leaf_type on forests): conifer or broadleaf.
 *
 * Pure functions on plain arrays, so they run in the worker.
 */

import {OsmGrid, latLngToPixel, pixelToLatLng} from './osm-layers';
import {sampleBilinear} from './area';
import {SCATTER_MAX_POINTS, ScatterSet, rng, scatterPoints} from './scatter';
import {DerivedMap} from './derived-maps';

export type TreeRaster = {
  /** "height": canopy height in metres. "cover": ESA WorldCover land-cover classes. */
  kind: 'height' | 'cover';
  /** EPSG:4326 (degrees) or EPSG:2056 (Swiss LV95 metres). */
  crs: '4326' | '2056';
  /** Row-major, north up; NaN where there is no data. */
  data: Float32Array;
  width: number;
  height: number;
  /** Top-left corner of the top-left pixel. */
  originX: number;
  originY: number;
  resX: number;
  resY: number;
  label: string;
};

export type LeafType = 'conifer' | 'broadleaf' | 'mixed';

export type TreeSettings = {
  /** Vegetation lower than this (m) is not a tree. */
  minHeight: number;
  /** Trees per hectare in mapped forest where no canopy height is known. */
  density: number;
  /** Minimum spacing between scattered trees, metres. */
  spacing: number;
  /** Leaf type where OpenStreetMap doesn't say. */
  leaf: LeafType;
  /** Use Swiss 1 m canopy heights where available. */
  swiss: boolean;
};

export const defaultTreeSettings: TreeSettings = {minHeight: 3, density: 350, spacing: 3, leaf: 'conifer', swiss: true};

/** WorldCover classes counted as trees: tree cover and mangroves. */
export const WORLDCOVER_TREE_CLASSES = [10, 95];

/** Canopy detail needed to pick out single trees, metres per pixel. */
export const TREE_DETECT_MAX_RES = 2;

/* ------------------------------ Swiss projection ------------------------------ */

/** WGS84 to Swiss LV95 (swisstopo's approximate formulas, about 1 m). */
export const wgs84ToLv95 = (lat: number, lng: number): [number, number] => {
  const p = (lat * 3600 - 169028.66) / 10000;
  const l = (lng * 3600 - 26782.5) / 10000;
  const e = 2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l * l * l;
  const n = 1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p * p * p;
  return [e, n];
};

/** Swiss LV95 to WGS84 [lat, lng]. */
export const lv95ToWgs84 = (e: number, n: number): [number, number] => {
  const y = (e - 2600000) / 1e6, x = (n - 1200000) / 1e6;
  const l = 2.6779094 + 4.728982 * y + 0.791484 * y * x + 0.1306 * y * x * x - 0.0436 * y * y * y;
  const p = 16.9023892 + 3.238272 * x - 0.270978 * y * y - 0.002528 * x * x - 0.0447 * y * y * x - 0.014 * x * x * x;
  let lat = p * 100 / 36, lng = l * 100 / 36;
  // Refine against the forward formula so the two directions agree exactly
  for (let i = 0; i < 3; i++) {
    const [fe, fn] = wgs84ToLv95(lat, lng);
    lat += (n - fn) / 111132;
    lng += (e - fe) / (111320 * Math.cos(lat * Math.PI / 180));
  }
  return [lat, lng];
};

/** Raster pixel coordinates (pixel centres at integers) of a lat/lng. */
export const rasterXY = (r: TreeRaster, lat: number, lng: number): [number, number] => {
  const [cx, cy] = r.crs === '2056' ? wgs84ToLv95(lat, lng) : [lng, lat];
  return [(cx - r.originX) / r.resX - 0.5, (r.originY - cy) / r.resY - 0.5];
};

export const rasterLatLng = (r: TreeRaster, x: number, y: number): [number, number] => {
  const cx = r.originX + (x + 0.5) * r.resX, cy = r.originY - (y + 0.5) * r.resY;
  return r.crs === '2056' ? lv95ToWgs84(cx, cy) : [cy, cx];
};

/** Approximate ground metres per raster pixel. */
export const rasterMetres = (r: TreeRaster) =>
  r.crs === '2056' ? r.resX : r.resX * 111320 * Math.cos((r.originY - r.height * r.resY / 2) * Math.PI / 180);

/**
 * Raster coordinates for every output pixel, interpolated from a coarse
 * lattice of exact projections (projecting all of an 8k² grid is slow).
 */
export const rasterCoords = (r: TreeRaster, grid: OsmGrid, width: number, height: number, step = 16) => {
  const cols = Math.ceil(width / step) + 1, rows = Math.ceil(height / step) + 1;
  const lx = new Float64Array(cols * rows), ly = new Float64Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const [lat, lng] = pixelToLatLng(grid, Math.min(width, i * step) + 0.5, Math.min(height, j * step) + 0.5);
      const [x, y] = rasterXY(r, lat, lng);
      lx[j * cols + i] = x;
      ly[j * cols + i] = y;
    }
  }
  return (px: number, py: number): [number, number] => {
    const fi = px / step, fj = py / step;
    const i0 = Math.min(cols - 2, Math.floor(fi)), j0 = Math.min(rows - 2, Math.floor(fj));
    const ti = fi - i0, tj = fj - j0;
    const a = j0 * cols + i0, b = a + 1, c = a + cols, d = c + 1;
    return [
      lx[a] * (1 - ti) * (1 - tj) + lx[b] * ti * (1 - tj) + lx[c] * (1 - ti) * tj + lx[d] * ti * tj,
      ly[a] * (1 - ti) * (1 - tj) + ly[b] * ti * (1 - tj) + ly[c] * (1 - ti) * tj + ly[d] * ti * tj,
    ];
  };
};

/** Bilinear sample ignoring NaN neighbours; NaN if all four are missing or outside. */
export const sampleNaN = (data: Float32Array, w: number, h: number, x: number, y: number): number => {
  if (x < -0.5 || y < -0.5 || x > w - 0.5 || y > h - 0.5) return NaN;
  const cx = Math.min(w - 1, Math.max(0, x)), cy = Math.min(h - 1, Math.max(0, y));
  const x0 = Math.floor(cx), y0 = Math.floor(cy);
  const x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
  const tx = cx - x0, ty = cy - y0;
  let sum = 0, weight = 0;
  const add = (ix: number, iy: number, wt: number) => {
    const v = data[iy * w + ix];
    if (wt > 0 && !Number.isNaN(v)) { sum += v * wt; weight += wt; }
  };
  add(x0, y0, (1 - tx) * (1 - ty));
  add(x1, y0, tx * (1 - ty));
  add(x0, y1, (1 - tx) * ty);
  add(x1, y1, tx * ty);
  return weight > 0 ? sum / weight : NaN;
};

/**
 * Share of tree pixels around each raster pixel (a box of ±radius pixels),
 * so a coarse output pixel gets the fraction of its ground that is trees.
 */
export const treeFraction = (r: TreeRaster, minHeight: number, radius: number): Float32Array => {
  const {width: w, height: h, data} = r;
  const trees = new Set(WORLDCOVER_TREE_CLASSES);
  const sum = new Float64Array((w + 1) * (h + 1)), count = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rs = 0, rc = 0;
    for (let x = 0; x < w; x++) {
      const v = data[y * w + x];
      if (!Number.isNaN(v)) {
        rc++;
        if (r.kind === 'height' ? v >= minHeight : trees.has(v)) rs++;
      }
      const o = (y + 1) * (w + 1) + x + 1;
      sum[o] = sum[o - (w + 1)] + rs;
      count[o] = count[o - (w + 1)] + rc;
    }
  }
  const k = Math.max(0, Math.round(radius));
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const ya = Math.max(0, y - k), yb = Math.min(h, y + k + 1);
    for (let x = 0; x < w; x++) {
      const xa = Math.max(0, x - k), xb = Math.min(w, x + k + 1);
      const s = sum[yb * (w + 1) + xb] - sum[ya * (w + 1) + xb] - sum[yb * (w + 1) + xa] + sum[ya * (w + 1) + xa];
      const c = count[yb * (w + 1) + xb] - count[ya * (w + 1) + xb] - count[yb * (w + 1) + xa] + count[ya * (w + 1) + xa];
      out[y * w + x] = c > 0 ? s / c : NaN;
    }
  }
  return out;
};

/** Typical crown radius for a tree of a given height, metres. */
export const crownRadius = (heightM: number) => Math.min(6, Math.max(1, 0.6 + 0.07 * heightM));

/**
 * Single trees from a canopy height model: pixels at least `minHeight` tall
 * that are the highest point within their own crown radius (after a light
 * blur, so one crown doesn't split into several tops).
 * Returns interleaved raster x, y, height, crown radius.
 */
export const detectTrees = (r: TreeRaster, minHeight: number, maxTrees = SCATTER_MAX_POINTS): {data: Float32Array, count: number, capped: boolean} => {
  const {width: w, height: h} = r;
  const res = rasterMetres(r);
  const src = r.data;
  const smooth = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, wt = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const v = src[yy * w + xx];
          if (Number.isNaN(v)) continue;
          const k = (dx ? 1 : 2) * (dy ? 1 : 2);
          s += v * k;
          wt += k;
        }
      }
      smooth[y * w + x] = wt ? s / wt : NaN;
    }
  }
  const out: number[] = [];
  let capped = false;
  for (let y = 0; y < h && !capped; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const v = smooth[i];
      if (!(v >= minHeight)) continue;
      // Quick reject against the 8 neighbours before the wider crown search
      let top = true;
      for (let dy = -1; dy <= 1 && top; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const u = smooth[yy * w + xx];
          if (u > v || (u === v && yy * w + xx < i)) { top = false; break; }
        }
      }
      if (!top) continue;
      const crown = crownRadius(v);
      const k = Math.max(1, Math.round(crown / res));
      const k2 = k * k;
      for (let dy = -k; dy <= k && top; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -k; dx <= k; dx++) {
          if (dx * dx + dy * dy > k2 || (dx >= -1 && dx <= 1 && dy >= -1 && dy <= 1)) continue;
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const u = smooth[yy * w + xx];
          if (u > v || (u === v && yy * w + xx < i)) { top = false; break; }
        }
      }
      if (!top) continue;
      out.push(x, y, Number.isNaN(src[i]) ? v : Math.max(v, src[i]), crown);
      if (out.length / 4 >= maxTrees) { capped = true; break; }
    }
  }
  return {data: Float32Array.from(out), count: out.length / 4, capped};
};

/* ------------------------------ the whole treemap ------------------------------ */

/** Leaf-type masks (0..1) on the output grid, from OpenStreetMap forests. */
export type LeafMasks = {conifer?: Uint8Array, broadleaf?: Uint8Array, mixed?: Uint8Array};

export type TreePoints = {
  /** Interleaved per tree: pixel x, pixel y, ground z (m), tree height (m), crown radius (m), yaw (deg), type (0 conifer, 1 broadleaf). */
  data: Float32Array;
  count: number;
  capped: boolean;
};

export const TREE_STRIDE = 7;

export type TreemapResult = {
  maps: DerivedMap[];
  points: TreePoints;
  /** Share of the area under trees. */
  cover: number;
  conifers: number;
  broadleaf: number;
  /** Trees found one by one in canopy heights, vs scattered through tree cover. */
  detected: number;
  scattered: number;
  sources: string[];
  /** Translucent preview for the map: dark green conifers, light green broadleaf. */
  preview: Uint8ClampedArray;
};

/**
 * Density, canopy height, leaf type and single trees for the export grid.
 * `rasters` should come finest first (canopy heights before tree cover).
 */
export const buildTreemap = (
  heights: Float32Array, width: number, height: number, grid: OsmGrid, mpp: {x: number, y: number},
  rasters: TreeRaster[], leaf: LeafMasks, settings: TreeSettings, options: {points: boolean, seed?: number} = {points: true},
): TreemapResult => {
  const n = width * height;
  const outMetres = (mpp.x + mpp.y) / 2;
  const density = new Float32Array(n).fill(NaN);
  const canopy = new Float32Array(n).fill(NaN);
  const covered = new Uint8Array(n); // 1 where single trees were detected
  const random = rng(options.seed ?? 7);
  const sources: string[] = [];
  const detectedPts: number[] = [];
  let capped = false;

  for (const r of rasters) {
    const res = rasterMetres(r);
    const fraction = treeFraction(r, settings.minHeight, Math.max(0, outMetres / res / 2 - 0.5));
    const coords = rasterCoords(r, grid, width, height);
    const detect = options.points && r.kind === 'height' && res <= TREE_DETECT_MAX_RES;
    let used = false;
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const i = py * width + px;
        if (!Number.isNaN(density[i])) continue;
        const [x, y] = coords(px + 0.5, py + 0.5);
        const f = sampleNaN(fraction, r.width, r.height, x, y);
        if (Number.isNaN(f)) continue;
        density[i] = f;
        used = true;
        if (r.kind === 'height') {
          canopy[i] = sampleNaN(r.data, r.width, r.height, x, y);
          if (detect) covered[i] = 1;
        }
      }
    }
    if (!used) continue;
    sources.push(r.label);
    if (detect) {
      const found = detectTrees(r, settings.minHeight);
      capped = capped || found.capped;
      for (let k = 0; k < found.count; k++) {
        const [lat, lng] = rasterLatLng(r, found.data[k * 4], found.data[k * 4 + 1]);
        const [px, py] = latLngToPixel(grid, lat, lng);
        if (px < 0 || py < 0 || px >= width || py >= height) continue;
        // Only where this raster is the one in charge (no overlap with finer data)
        if (!covered[Math.floor(py) * width + Math.floor(px)]) continue;
        detectedPts.push(px, py, found.data[k * 4 + 2], found.data[k * 4 + 3]);
      }
    }
  }
  for (let i = 0; i < n; i++) if (Number.isNaN(density[i])) density[i] = 0;

  // Leaf type share per pixel: OSM where mapped, else the default
  const coniferShare = (i: number) => {
    const c = leaf.conifer?.[i] ?? 0, b = leaf.broadleaf?.[i] ?? 0, m = leaf.mixed?.[i] ?? 0;
    if (c >= 128) return 1;
    if (b >= 128) return 0;
    if (m >= 128) return 0.5;
    return settings.leaf === 'conifer' ? 1 : settings.leaf === 'broadleaf' ? 0 : 0.5;
  };

  const points: number[] = [];
  const pushTree = (px: number, py: number, treeH: number, crown: number) => {
    const i = Math.min(height - 1, Math.floor(py)) * width + Math.min(width - 1, Math.floor(px));
    const type = random() < coniferShare(i) ? 0 : 1;
    points.push(px, py, sampleBilinear(heights, width, height, px - 0.5, py - 0.5), treeH, crown, random() * 360, type);
  };
  for (let k = 0; k < detectedPts.length; k += 4) {
    pushTree(detectedPts[k], detectedPts[k + 1], detectedPts[k + 2], detectedPts[k + 3]);
  }
  const detected = detectedPts.length / 4;

  // Scatter the rest of the tree cover at the chosen density
  let scattered = 0;
  if (options.points && points.length / TREE_STRIDE < SCATTER_MAX_POINTS) {
    const weights = new Float32Array(n);
    let any = false;
    for (let i = 0; i < n; i++) {
      if (!covered[i] && density[i] > 0) { weights[i] = density[i]; any = true; }
    }
    if (any) {
      const set: ScatterSet = {name: 'Trees', source: 'all', density: settings.density, spacing: settings.spacing, minScale: 1, maxScale: 1, maxSlope: 90, mesh: ''};
      const flat = new Float32Array(n);
      const placed = scatterPoints(heights, weights, flat, width, height, mpp, set, options.seed ?? 11);
      capped = capped || placed.capped;
      for (let k = 0; k < placed.count && points.length / TREE_STRIDE < SCATTER_MAX_POINTS; k++) {
        const px = placed.data[k * 5], py = placed.data[k * 5 + 1];
        const c = sampleNaN(canopy, width, height, px - 0.5, py - 0.5);
        const treeH = c >= settings.minHeight ? c : 12 + random() * 14;
        pushTree(px, py, treeH, crownRadius(treeH));
        scattered++;
      }
    }
  }

  // Maps
  const densityMap = new Uint8Array(n), conifer = new Uint8Array(n), broad = new Uint8Array(n);
  const preview = new Uint8ClampedArray(n * 4);
  let coverSum = 0;
  for (let i = 0; i < n; i++) {
    const d = Math.min(1, Math.max(0, density[i]));
    coverSum += d;
    const share = coniferShare(i);
    densityMap[i] = Math.round(d * 255);
    conifer[i] = Math.round(d * share * 255);
    broad[i] = Math.round(d * (1 - share) * 255);
    preview[i * 4] = 20 + 90 * (1 - share);
    preview[i * 4 + 1] = 90 + 80 * (1 - share);
    preview[i * 4 + 2] = 40;
    preview[i * 4 + 3] = Math.round(d * 210);
  }
  const maps: DerivedMap[] = [
    {name: 'trees_density', channels: 1, data: densityMap},
    {name: 'trees_conifer', channels: 1, data: conifer},
    {name: 'trees_broadleaf', channels: 1, data: broad},
  ];
  if (rasters.some(r => r.kind === 'height') && canopy.some(v => !Number.isNaN(v))) {
    const ch = new Uint8Array(n);
    for (let i = 0; i < n; i++) ch[i] = Number.isNaN(canopy[i]) ? 0 : Math.min(255, Math.max(0, Math.round(canopy[i] * 5)));
    maps.push({name: 'trees_canopy_height_0-51m', channels: 1, data: ch});
  }
  const data = Float32Array.from(points);
  let conifers = 0;
  for (let k = 0; k < data.length; k += TREE_STRIDE) if (data[k + 6] === 0) conifers++;
  return {
    maps, preview, sources, detected, scattered,
    points: {data, count: data.length / TREE_STRIDE, capped},
    cover: n ? coverSum / n : 0,
    conifers, broadleaf: data.length / TREE_STRIDE - conifers,
  };
};

/* ---------------------------------- exports ---------------------------------- */

const r2 = (v: number) => Math.round(v * 100) / 100;

export const TREE_TYPE_NAMES = ['conifer', 'broadleaf'];

/** CSV of every tree, in the same coordinate systems as the scatter CSV. */
export const treesToCsv = (p: TreePoints, toBlender: (px: number, py: number) => [number, number]): string => {
  const rows = ['type,pixel_x,pixel_y,blender_x_m,blender_y_m,z_m,height_m,crown_radius_m,yaw_deg,ue_vertex_x,ue_vertex_y,ue_z_cm'];
  const d = p.data;
  for (let k = 0; k < p.count; k++) {
    const o = k * TREE_STRIDE;
    const [bx, by] = toBlender(d[o], d[o + 1]);
    rows.push([TREE_TYPE_NAMES[d[o + 6]], r2(d[o]), r2(d[o + 1]), r2(bx), r2(by), r2(d[o + 2]), r2(d[o + 3]), r2(d[o + 4]), Math.round(d[o + 5]),
      r2(d[o] - 0.5), r2(d[o + 1] - 0.5), Math.round(d[o + 2] * 100)].join(','));
  }
  return rows.join('\n') + '\n';
};

/** Encode settings for the URL: minHeight~density~spacing~leaf~swiss. */
export const encodeTrees = (s: TreeSettings) => [s.minHeight, s.density, s.spacing, s.leaf, s.swiss ? 1 : 0].join('~');

export const decodeTrees = (text: string | null | undefined): TreeSettings => {
  const d = defaultTreeSettings;
  if (!text) return {...d};
  const f = text.split('~');
  const num = (v: string | undefined, def: number) => {
    const x = parseFloat(v ?? '');
    return Number.isFinite(x) ? x : def;
  };
  const leaf = (['conifer', 'broadleaf', 'mixed'] as LeafType[]).includes(f[3] as LeafType) ? f[3] as LeafType : d.leaf;
  return {minHeight: num(f[0], d.minHeight), density: num(f[1], d.density), spacing: num(f[2], d.spacing), leaf, swiss: f[4] !== '0'};
};
