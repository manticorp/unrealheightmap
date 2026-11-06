/**
 * A map layer drawn in the browser from an elevation source: hillshade with
 * a gentle colour ramp. Used as the basemap for worlds without a tile server.
 */
import * as L from "leaflet";
import {ElevationSource} from "./elevation";

export type HillshadePalette = [number, [number, number, number]][];

export const GREY_PALETTE: HillshadePalette = [[0, [70, 66, 62]], [0.5, [150, 144, 136]], [1, [225, 220, 212]]];

const colourAt = (p: HillshadePalette, t: number): [number, number, number] => {
  if (t <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) {
    if (t <= p[i][0]) {
      const f = (t - p[i - 1][0]) / (p[i][0] - p[i - 1][0] || 1);
      const a = p[i - 1][1], b = p[i][1];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    }
  }
  return p[p.length - 1][1];
};

export type HillshadeOptions = L.GridLayerOptions & {
  /** Height range the colour ramp spans, metres. */
  range: [number, number];
  palette?: HillshadePalette;
  radius: number;
};

export const HillshadeLayer = L.GridLayer.extend({
  initialize(source: ElevationSource, options: HillshadeOptions) {
    (this as any)._source = source;
    L.setOptions(this, options);
  },
  createTile(coords: L.Coords, done: (error: Error | null, tile: HTMLElement) => void) {
    const tile = document.createElement('canvas');
    tile.width = 256;
    tile.height = 256;
    const source: ElevationSource = (this as any)._source;
    const options: HillshadeOptions = (this as any).options;
    const n = Math.pow(2, coords.z);
    const x = ((coords.x % n) + n) % n;
    source.getTile(Math.min(coords.z, source.maxZoom), x, coords.y).then(heights => {
      const ctx = tile.getContext('2d')!;
      const image = ctx.createImageData(256, 256);
      // Pixel size in metres at this zoom (equator), for a fair slope
      const mpp = 2 * Math.PI * options.radius / (256 * n);
      const [lo, hi] = options.range;
      const palette = options.palette ?? GREY_PALETTE;
      const lx = -0.5, ly = 0.5, lz = 0.7071;
      for (let py = 0; py < 256; py++) {
        for (let px = 0; px < 256; px++) {
          const h = heights[py * 256 + px];
          const e = heights[py * 256 + Math.min(255, px + 1)] - heights[py * 256 + Math.max(0, px - 1)];
          const s = heights[Math.min(255, py + 1) * 256 + px] - heights[Math.max(0, py - 1) * 256 + px];
          const nx = -e / (2 * mpp) * 3, ny = s / (2 * mpp) * 3;
          const len = Math.hypot(nx, ny, 1);
          const shade = Math.max(0, (nx * lx + ny * ly + lz) / len);
          const c = colourAt(palette, (h - lo) / (hi - lo || 1));
          const k = 0.35 + 0.9 * shade;
          const o = (py * 256 + px) * 4;
          image.data[o] = Math.min(255, c[0] * k);
          image.data[o + 1] = Math.min(255, c[1] * k);
          image.data[o + 2] = Math.min(255, c[2] * k);
          image.data[o + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
      done(null, tile);
    }).catch(e => done(e, tile));
    return tile;
  },
}) as unknown as new (source: ElevationSource, options: HillshadeOptions) => L.GridLayer;
