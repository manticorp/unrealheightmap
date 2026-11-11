/**
 * Live "Elevation tint" map layer: the selected elevation data coloured with a
 * hypsometric palette, optionally with hillshading. Drawn in the browser, so it
 * follows the elevation source and settings and doubles as the albedo export.
 */
import * as L from "leaflet";
import {ElevationSource, TILE_SIZE} from "./elevation";
import {CUSTOM_ID, buildTintLut, getPalette, LUT_SIZE, Palette, TintMode} from "./palettes";
import {BODY_RADIUS} from "./extra-sources";

export type TintParams = {
  mode: TintMode;
  palette: string;
  /** The user's own palette, used when `palette` is "custom". */
  custom?: Palette;
  min: number;
  max: number;
};

export type TintLayerOptions = L.GridLayerOptions & {
  getSource: () => ElevationSource;
  getParams: () => TintParams;
};

/** Cache of the last lookup table, since every tile on screen shares it. */
let lutKey = '';
let lutValue: Uint8ClampedArray | null = null;
const lutFor = (p: TintParams) => {
  const custom = p.palette === CUSTOM_ID ? p.custom : undefined;
  const key = `${p.palette}|${custom ? JSON.stringify(custom) : ''}|${p.min}|${p.max}|${p.mode}`;
  if (key !== lutKey || !lutValue) {
    lutValue = buildTintLut(custom ?? getPalette(p.palette), p.min, p.max, p.mode === 'bands');
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

/** Paint heights into RGBA pixels. `mpp` is the ground size of a pixel in metres (for hillshade slope). */
export const paintTint = (heights: Float32Array, params: TintParams, mpp: number, out: Uint8ClampedArray) => {
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
        const e = heights[py * N + Math.min(N - 1, px + 1)] - heights[py * N + Math.max(0, px - 1)];
        const s = heights[Math.min(N - 1, py + 1) * N + px] - heights[Math.max(0, py - 1) * N + px];
        const nx = -e / (2 * mpp) * 3, ny = s / (2 * mpp) * 3;
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

export const TintLayer = L.GridLayer.extend({
  initialize(options: TintLayerOptions) {
    L.setOptions(this, options);
  },
  createTile(coords: L.Coords, done: (error: Error | null, tile: HTMLElement) => void) {
    const tile = document.createElement('canvas');
    tile.width = TILE_SIZE;
    tile.height = TILE_SIZE;
    const options: TintLayerOptions = (this as any).options;
    const n = Math.pow(2, coords.z);
    const x = ((coords.x % n) + n) % n;
    if (coords.y < 0 || coords.y >= n) { done(null, tile); return tile; }
    const params = options.getParams();
    heightsForTile(options.getSource(), coords.z, x, coords.y).then(heights => {
      const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (coords.y + 0.5) / n)));
      const mpp = Math.cos(lat) * 2 * Math.PI * BODY_RADIUS.earth / (TILE_SIZE * n);
      const ctx = tile.getContext('2d')!;
      const image = ctx.createImageData(TILE_SIZE, TILE_SIZE);
      paintTint(heights, params, mpp, image.data);
      ctx.putImageData(image, 0, 0);
      done(null, tile);
    }).catch(e => done(e, tile));
    return tile;
  },
}) as unknown as new (options: TintLayerOptions) => L.GridLayer;
