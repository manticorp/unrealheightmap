/**
 * Live "Elevation tint" map layer: the selected elevation data coloured with a
 * hypsometric palette, optionally with hillshading. Drawn in the browser, so it
 * follows the elevation source and settings and doubles as the albedo export.
 * The drawing itself lives in tint-render.ts.
 */
import * as L from "leaflet";
import {ElevationSource, TILE_SIZE} from "./elevation";
import {BODY_RADIUS} from "./extra-sources";
import {NO_EDGES, TintParams, cachedHeights, paintTint, tileEdges} from "./tint-render";

export type {TintParams} from "./tint-render";

export type TintLayerOptions = L.GridLayerOptions & {
  getSource: () => ElevationSource;
  getParams: () => TintParams;
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
    const source = options.getSource();
    const fetch = (tx: number, ty: number) => cachedHeights(source, coords.z, tx, ty);
    // Only hillshading looks across tile borders
    const edges = params.mode === 'hillshade' ? tileEdges(fetch, coords.z, x, coords.y) : Promise.resolve(NO_EDGES);
    Promise.all([fetch(x, coords.y), edges]).then(([heights, sides]) => {
      const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (coords.y + 0.5) / n)));
      const mpp = Math.cos(lat) * 2 * Math.PI * BODY_RADIUS.earth / (TILE_SIZE * n);
      const ctx = tile.getContext('2d')!;
      const image = ctx.createImageData(TILE_SIZE, TILE_SIZE);
      paintTint(heights, params, mpp, image.data, sides);
      ctx.putImageData(image, 0, 0);
      done(null, tile);
    }).catch(e => done(e, tile));
    return tile;
  },
}) as unknown as new (options: TintLayerOptions) => L.GridLayer;
