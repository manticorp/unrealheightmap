/**
 * Drawing for the "Elevation tint" layer, kept free of Leaflet and the DOM so
 * it can be tested: fetching heights for a tile (and its neighbours' edges)
 * and painting them with a palette and optional hillshading.
 */
import {ElevationSource, LruCache, TILE_SIZE} from "./elevation";
import {CUSTOM_ID, buildTintLut, getPalette, invertPalette, LUT_SIZE, Palette, TintMode} from "./palettes";

export type TintParams = {
  mode: TintMode;
  palette: string;
  /** The user's own palette, used when `palette` is "custom". */
  custom?: Palette;
  min: number;
  max: number;
  /** Run the palette's colours the other way up. */
  invert?: boolean;
};

/** The palette the settings ask for, inverted when asked. */
export const tintPalette = (p: TintParams): Palette => {
  const palette = (p.palette === CUSTOM_ID ? p.custom : undefined) ?? getPalette(p.palette);
  return p.invert ? invertPalette(palette) : palette;
};

/** Cache of the last lookup table, since every tile on screen shares it. */
let lutKey = '';
let lutValue: Uint8ClampedArray | null = null;
const lutFor = (p: TintParams) => {
  const custom = p.palette === CUSTOM_ID ? p.custom : undefined;
  const key = `${p.palette}|${custom ? JSON.stringify(custom) : ''}|${p.min}|${p.max}|${p.mode}|${p.invert ? 1 : 0}`;
  if (key !== lutKey || !lutValue) {
    lutValue = buildTintLut(tintPalette(p), p.min, p.max, p.mode === 'bands');
    lutKey = key;
  }
  return lutValue;
};

/**
 * 256 × 256 heights for tile (z, x, y), even above the source's own maximum
 * zoom: then the matching part of its parent tile is stretched (bilinear).
 */
export const heightsForTile = async (source: ElevationSource, z: number, x: number, y: number): Promise<Float32Array> => {
  if (z <= source.maxZoom) return source.getTile(z, x, y);
  const d = z - source.maxZoom;
  const k = Math.pow(2, d);
  const parent = await source.getTile(source.maxZoom, Math.floor(x / k), Math.floor(y / k));
  const size = TILE_SIZE / k;
  const x0 = (x % k) * size, y0 = (y % k) * size;
  const out = new Float32Array(TILE_SIZE * TILE_SIZE);
  for (let py = 0; py < TILE_SIZE; py++) {
    const sy = Math.min(TILE_SIZE - 1.001, Math.max(0, y0 + (py + 0.5) * size / TILE_SIZE - 0.5));
    const iy = Math.floor(sy), fy = sy - iy;
    for (let px = 0; px < TILE_SIZE; px++) {
      const sx = Math.min(TILE_SIZE - 1.001, Math.max(0, x0 + (px + 0.5) * size / TILE_SIZE - 0.5));
      const ix = Math.floor(sx), fx = sx - ix;
      const a = parent[iy * TILE_SIZE + ix], b = parent[iy * TILE_SIZE + ix + 1];
      const c = parent[(iy + 1) * TILE_SIZE + ix], e = parent[(iy + 1) * TILE_SIZE + ix + 1];
      out[py * TILE_SIZE + px] = (a + (b - a) * fx) * (1 - fy) + (c + (e - c) * fx) * fy;
    }
  }
  return out;
};

/**
 * Recent tiles per source. Hillshading reads each tile's neighbours too, so
 * without this every tile would be fetched up to five times. Keyed by the
 * source object, so a newly loaded file never sees another file's heights.
 */
const tileCaches = new WeakMap<ElevationSource, LruCache<Promise<Float32Array>>>();
export const cachedHeights = (source: ElevationSource, z: number, x: number, y: number): Promise<Float32Array> => {
  let cache = tileCaches.get(source);
  if (!cache) { cache = new LruCache(96); tileCaches.set(source, cache); }
  const key = `${z}/${x}/${y}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const promise = heightsForTile(source, z, x, y);
  promise.catch(() => cache!.map.delete(key));
  cache.set(key, promise);
  return promise;
};

/** The row or column of heights just outside each side of a tile, from its neighbours (null where there is none). */
export type TileEdges = {
  left: Float32Array | null;
  right: Float32Array | null;
  top: Float32Array | null;
  bottom: Float32Array | null;
};

export const NO_EDGES: TileEdges = {left: null, right: null, top: null, bottom: null};

/** Fetch the four neighbours' touching edges. Longitude wraps; above the poles there is nothing. Failures just leave that side empty. */
export const tileEdges = async (fetch: (x: number, y: number) => Promise<Float32Array>, z: number, x: number, y: number): Promise<TileEdges> => {
  const n = Math.pow(2, z);
  const N = TILE_SIZE;
  const get = (nx: number, ny: number) => ny < 0 || ny >= n ? Promise.resolve(null) : fetch(((nx % n) + n) % n, ny).catch(() => null);
  const [l, r, t, b] = await Promise.all([get(x - 1, y), get(x + 1, y), get(x, y - 1), get(x, y + 1)]);
  const column = (h: Float32Array | null, col: number) => {
    if (!h) return null;
    const out = new Float32Array(N);
    for (let i = 0; i < N; i++) out[i] = h[i * N + col];
    return out;
  };
  return {
    left: column(l, N - 1),
    right: column(r, 0),
    top: t ? t.slice((N - 1) * N, N * N) : null,
    bottom: b ? b.slice(0, N) : null,
  };
};

/**
 * Paint heights into RGBA pixels. `mpp` is the ground size of a pixel in metres
 * (for hillshade slope). `edges` lets the slope at a tile's border use the
 * neighbouring tile, so shading runs on without a seam.
 */
export const paintTint = (heights: Float32Array, params: TintParams, mpp: number, out: Uint8ClampedArray, edges: TileEdges = NO_EDGES) => {
  const lut = lutFor(params);
  const span = (params.max - params.min) || 1;
  const shaded = params.mode === 'hillshade';
  const lx = -0.5, ly = 0.5, lz = 0.7071;
  const N = TILE_SIZE;
  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      const i = py * N + px;
      const u = Math.max(0, Math.min(1, (heights[i] - params.min) / span));
      const li = Math.round(u * (LUT_SIZE - 1)) * 3;
      let k = 1;
      if (shaded) {
        // Central differences; at the border, step into the neighbour if we have it, else stay on this pixel
        let e: number, s: number, ex = 2, sy = 2;
        if (px === N - 1) { if (edges.right) e = edges.right[py] - heights[i - 1]; else { e = heights[i] - heights[i - 1]; ex = 1; } }
        else if (px === 0) { if (edges.left) e = heights[i + 1] - edges.left[py]; else { e = heights[i + 1] - heights[i]; ex = 1; } }
        else e = heights[i + 1] - heights[i - 1];
        if (py === N - 1) { if (edges.bottom) s = edges.bottom[px] - heights[i - N]; else { s = heights[i] - heights[i - N]; sy = 1; } }
        else if (py === 0) { if (edges.top) s = heights[i + N] - edges.top[px]; else { s = heights[i + N] - heights[i]; sy = 1; } }
        else s = heights[i + N] - heights[i - N];
        const nx = -e / (ex * mpp) * 3, ny = s / (sy * mpp) * 3;
        const shade = Math.max(0, (nx * lx + ny * ly + lz) / Math.hypot(nx, ny, 1));
        k = 0.4 + 0.85 * shade;
      }
      const o = i * 4;
      out[o] = lut[li] * k;
      out[o + 1] = lut[li + 1] * k;
      out[o + 2] = lut[li + 2] * k;
      out[o + 3] = 255;
    }
  }
};
