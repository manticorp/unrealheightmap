/**
 * Elevation data sources.
 *
 * Every source hands back the same thing: a 256 × 256 grid of heights in
 * metres for a standard slippy-map tile (z, x, y). That keeps the stitching,
 * normalising and export code unchanged whatever the data comes from.
 */

export type ElevationSourceId = 'aws' | 'mapterhorn';

export type ElevationStats = {
  /** Slippy zoom (256 px tiles) of the most and least detailed data actually used. */
  bestZoom: number | null;
  worstZoom: number | null;
};

export interface ElevationSource {
  id: ElevationSourceId;
  label: string;
  /** Highest output zoom (256 px tile scheme) worth requesting. */
  maxZoom: number;
  attributionHtml: string;
  getTile(z: number, x: number, y: number): Promise<Float32Array>;
  resetStats(): void;
  getStats(): ElevationStats;
}

export const TILE_SIZE = 256;

/** Terrarium encoding: height = R * 256 + G + B / 256 - 32768. */
export const decodeTerrarium = (pixels: ArrayLike<number>, channels: number, count: number): Float32Array => {
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const p = i * channels;
    out[i] = pixels[p] * 256 + pixels[p + 1] + pixels[p + 2] / 256 - 32768;
  }
  return out;
};

/**
 * Which part of a larger parent tile covers the 256 px tile (z, x, y).
 * `parentZoom` and `parentSize` describe the parent's tile scheme
 * (e.g. Mapterhorn uses 512 px tiles, so its zoom Z matches 256 px zoom Z + 1).
 */
export const parentRegion = (z: number, x: number, y: number, parentZoom: number, parentSize: number) => {
  // How many 256 px tiles at zoom z span one parent tile, along each axis
  const k = Math.pow(2, z - parentZoom);
  const px = Math.floor(x / k);
  const py = Math.floor(y / k);
  const size = parentSize / k;
  return {px, py, x0: (x - px * k) * size, y0: (y - py * k) * size, size};
};

/**
 * Bilinear resample of a square region of `src` into an out × out grid,
 * sampling at pixel centres. A 1:1 region is an exact copy.
 */
export const resampleRegion = (
  src: Float32Array, srcSize: number,
  x0: number, y0: number, size: number,
  out: number = TILE_SIZE,
): Float32Array => {
  const result = new Float32Array(out * out);
  const step = size / out;
  const max = srcSize - 1;
  for (let j = 0; j < out; j++) {
    const sy = Math.min(max, Math.max(0, y0 + (j + 0.5) * step - 0.5));
    const iy = Math.floor(sy);
    const fy = sy - iy;
    const iy1 = Math.min(max, iy + 1);
    for (let i = 0; i < out; i++) {
      const sx = Math.min(max, Math.max(0, x0 + (i + 0.5) * step - 0.5));
      const ix = Math.floor(sx);
      const fx = sx - ix;
      const ix1 = Math.min(max, ix + 1);
      const a = src[iy * srcSize + ix];
      const b = src[iy * srcSize + ix1];
      const c = src[iy1 * srcSize + ix];
      const d = src[iy1 * srcSize + ix1];
      result[j * out + i] = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
    }
  }
  return result;
};

/** Caps how many requests a source has in flight at once. */
export class Limiter {
  active = 0;
  queue: (() => void)[] = [];
  constructor(public max: number) {}
  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }
    this.active++;
    try {
      return await task();
    } finally {
      this.active--;
      this.queue.shift()?.();
    }
  }
}

/** Small least-recently-used cache. */
export class LruCache<V> {
  map = new Map<string, V>();
  constructor(public max: number) {}
  get(key: string): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }
  set(key: string, value: V) {
    this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.max) {
      this.map.delete(this.map.keys().next().value);
    }
  }
  has(key: string) {
    return this.map.has(key);
  }
}

const trackZoom = (stats: ElevationStats, zoom: number) => {
  stats.bestZoom = stats.bestZoom === null ? zoom : Math.max(stats.bestZoom, zoom);
  stats.worstZoom = stats.worstZoom === null ? zoom : Math.min(stats.worstZoom, zoom);
};

/** Turn an image (PNG/WebP) blob into RGBA pixels without colour management. */
const decodeImage = async (blob: Blob): Promise<{data: Uint8ClampedArray, width: number, height: number}> => {
  const bitmap = await createImageBitmap(blob, {premultiplyAlpha: 'none', colorSpaceConversion: 'none'});
  const {width, height} = bitmap;
  let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  if (typeof OffscreenCanvas !== 'undefined') {
    ctx = new OffscreenCanvas(width, height).getContext('2d', {willReadFrequently: true}) as OffscreenCanvasRenderingContext2D;
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext('2d', {willReadFrequently: true});
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return {data: ctx.getImageData(0, 0, width, height).data, width, height};
};

/**
 * Mapterhorn (https://mapterhorn.com): open terrain tiles combining
 * Copernicus GLO-30 worldwide with national lidar and USGS 3DEP where
 * available. Terrarium-encoded 512 px WebP, z0–z12 everywhere and up to
 * z17 where high-resolution data exists (404 elsewhere).
 */
export class MapterhornSource implements ElevationSource {
  id: ElevationSourceId = 'mapterhorn';
  label = 'Mapterhorn (Copernicus 30 m + lidar)';
  /** Mapterhorn z17 at 512 px = z18 at 256 px. */
  maxZoom = 18;
  static readonly URL = 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp';
  static readonly SIZE = 512;
  static readonly MAX_ZOOM = 17;
  /** Every tile up to here exists worldwide. */
  static readonly GLOBAL_ZOOM = 12;
  attributionHtml = '© <a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener">Mapterhorn</a> (Copernicus GLO-30, USGS 3DEP and national lidar)';

  cache = new LruCache<Promise<Float32Array | null>>(48);
  limiter = new Limiter(12);
  stats: ElevationStats = {bestZoom: null, worstZoom: null};

  resetStats() {
    this.stats = {bestZoom: null, worstZoom: null};
  }
  getStats() {
    return {...this.stats};
  }

  /** Heights for one 512 px tile, or null if Mapterhorn has no tile there. */
  fetchParent(z: number, x: number, y: number): Promise<Float32Array | null> {
    const key = `${z}/${x}/${y}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const promise = this.limiter.run(async () => {
      const url = MapterhornSource.URL.replace('{z}', `${z}`).replace('{x}', `${x}`).replace('{y}', `${y}`);
      const response = await fetch(url);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Mapterhorn tile ${key} failed (${response.status})`);
      const image = await decodeImage(await response.blob());
      return decodeTerrarium(image.data, 4, image.width * image.height);
    });
    // Don't keep failures around, so a retry can succeed
    promise.catch(() => this.cache.map.delete(key));
    this.cache.set(key, promise);
    return promise;
  }

  async getTile(z: number, x: number, y: number): Promise<Float32Array> {
    // Start at the 512 px zoom that matches this 256 px tile, then step back
    // to coarser tiles until one exists.
    let parentZoom = Math.min(MapterhornSource.MAX_ZOOM, Math.max(0, z - 1));
    while (parentZoom >= 0) {
      const region = parentRegion(z, x, y, parentZoom, MapterhornSource.SIZE);
      const heights = await this.fetchParent(parentZoom, region.px, region.py);
      if (heights) {
        trackZoom(this.stats, parentZoom + 1);
        return resampleRegion(heights, MapterhornSource.SIZE, region.x0, region.y0, region.size);
      }
      // Missing above GLOBAL_ZOOM just means no finer data here (e.g. 10 m but not 1 m);
      // each miss is cached, so neighbouring tiles don't ask again
      parentZoom--;
    }
    throw new Error(`No Mapterhorn data for ${z}/${x}/${y}`);
  }
}

/**
 * The original source: AWS Terrain Tiles (Mapzen/Nextzen Terrarium PNGs).
 * Fetching stays in the app so it keeps its retry and abort handling.
 */
export class AwsTerrainSource implements ElevationSource {
  id: ElevationSourceId = 'aws';
  label = 'AWS Terrain Tiles (Mapzen)';
  maxZoom = 15;
  attributionHtml = '© <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener">Mapzen</a>, <a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> and others';
  stats: ElevationStats = {bestZoom: null, worstZoom: null};

  constructor(private fetchTile: (z: number, x: number, y: number) => Promise<Float32Array>) {}

  resetStats() {
    this.stats = {bestZoom: null, worstZoom: null};
  }
  getStats() {
    return {...this.stats};
  }
  async getTile(z: number, x: number, y: number) {
    const heights = await this.fetchTile(z, x, y);
    trackZoom(this.stats, z);
    return heights;
  }
}

/** Ground size of one pixel at a 256 px slippy zoom level, in metres. */
export const metresPerPixel = (zoom: number, latitude: number) =>
  156543.03392 * Math.cos(latitude * Math.PI / 180) / Math.pow(2, zoom);
