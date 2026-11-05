/**
 * Elevation sources beyond the Terrarium tile services:
 *  - NOAA ETOPO 2022: land and sea floor worldwide, as float GeoTIFFs from an
 *    ArcGIS ImageServer, already in web mercator.
 *  - Mars and the Moon: USGS cloud-optimised GeoTIFFs in an equirectangular
 *    projection on each body's sphere, read with HTTP range requests and
 *    resampled into web-mercator tiles here.
 *
 * All of them return the usual 256 × 256 grid of metres per slippy tile.
 */
import {ElevationSource, ElevationSourceId, ElevationStats, Limiter, LruCache, TILE_SIZE} from "./elevation";
import {decodeTiff} from "./tiff";

export type Body = 'earth' | 'mars' | 'moon';

/** Sphere radius (metres) used for each body's ground distances. Earth matches the app's haversine. */
export const BODY_RADIUS: Record<Body, number> = {
  earth: 6371e3,
  mars: 3396190,
  moon: 1737400,
};

/** Equatorial radius web mercator tiles are defined on. */
const MERCATOR_RADIUS = 6378137;

const trackZoom = (stats: ElevationStats, zoom: number) => {
  stats.bestZoom = stats.bestZoom === null ? zoom : Math.max(stats.bestZoom, zoom);
  stats.worstZoom = stats.worstZoom === null ? zoom : Math.min(stats.worstZoom, zoom);
};

/** Longitude of a fractional tile x, and latitude of a fractional tile y, in degrees. */
export const tileXToLng = (x: number, z: number) => x / Math.pow(2, z) * 360 - 180;
export const tileYToLat = (y: number, z: number) => {
  const n = Math.PI * (1 - 2 * y / Math.pow(2, z));
  return Math.atan(Math.sinh(n)) * 180 / Math.PI;
};

/** EPSG:3857 bounding box of a slippy tile. */
export const tileBounds3857 = (z: number, x: number, y: number) => {
  const size = 2 * Math.PI * MERCATOR_RADIUS / Math.pow(2, z);
  const shift = Math.PI * MERCATOR_RADIUS;
  return {
    xmin: x * size - shift,
    xmax: (x + 1) * size - shift,
    ymin: shift - (y + 1) * size,
    ymax: shift - y * size,
  };
};

/** Slippy zoom whose pixels at the equator are about `metres` wide on a sphere of `radius`. */
export const zoomForResolution = (metres: number, radius: number) =>
  Math.log2(2 * Math.PI * radius / (TILE_SIZE * metres));

export class EtopoSource implements ElevationSource {
  id: ElevationSourceId = 'etopo';
  body: Body = 'earth';
  radius = BODY_RADIUS.earth;
  label = 'NOAA ETOPO 2022 (land + sea floor)';
  maxZoom = 12;
  /** 15 arc-seconds is about 460 m at the equator, i.e. zoom ~8.4. */
  nativeZoom = 8;
  static readonly URL = 'https://gis.ngdc.noaa.gov/arcgis/rest/services/DEM_mosaics/DEM_global_mosaic/ImageServer/exportImage';
  /** Raster id of the ETOPO 2022 15″ grid inside NOAA's mosaic, so coastal topo-only DEMs don't flatten the sea. */
  static readonly ETOPO_RASTER = 4593;
  attributionHtml = 'NOAA NCEI <a href="https://doi.org/10.25921/fd45-gt74" target="_blank" rel="noopener">ETOPO 2022 15 Arc-Second Global Relief Model</a> (public domain)';
  cache = new LruCache<Promise<Float32Array>>(64);
  limiter = new Limiter(6);
  stats: ElevationStats = {bestZoom: null, worstZoom: null};

  resetStats() {
    this.stats = {bestZoom: null, worstZoom: null};
  }
  getStats() {
    return {...this.stats};
  }

  static tileUrl(z: number, x: number, y: number): string {
    const b = tileBounds3857(z, x, y);
    const params = new URLSearchParams({
      bbox: `${b.xmin},${b.ymin},${b.xmax},${b.ymax}`,
      bboxSR: '3857',
      imageSR: '3857',
      size: `${TILE_SIZE},${TILE_SIZE}`,
      format: 'tiff',
      pixelType: 'F32',
      compression: 'None',
      interpolation: 'RSP_BilinearInterpolation',
      mosaicRule: JSON.stringify({mosaicMethod: 'esriMosaicLockRaster', lockRasterIds: [EtopoSource.ETOPO_RASTER]}),
      f: 'image',
    });
    return `${EtopoSource.URL}?${params.toString()}`;
  }

  getTile(z: number, x: number, y: number): Promise<Float32Array> {
    trackZoom(this.stats, Math.min(z, this.nativeZoom));
    const key = `${z}/${x}/${y}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const promise = this.limiter.run(async () => {
      const response = await fetch(EtopoSource.tileUrl(z, x, y));
      if (!response.ok) throw new Error(`ETOPO tile ${key} failed (${response.status})`);
      const tiff = decodeTiff(await response.arrayBuffer());
      if (tiff.width !== TILE_SIZE || tiff.height !== TILE_SIZE) {
        throw new Error(`ETOPO tile ${key} came back ${tiff.width} × ${tiff.height}`);
      }
      const out = tiff.data;
      for (let i = 0; i < out.length; i++) {
        if (!Number.isFinite(out[i]) || (tiff.noData !== null && out[i] === tiff.noData)) out[i] = 0;
      }
      return out;
    });
    promise.catch(() => this.cache.map.delete(key));
    this.cache.set(key, promise);
    return promise;
  }
}

export type PlanetConfig = {
  id: ElevationSourceId;
  body: Body;
  label: string;
  url: string;
  /** Units of the file's CRS: plain degrees, or metres of an equirectangular projection on the sphere. */
  units: 'degrees' | 'metres';
  nativeMetres: number;
  maxZoom: number;
  attributionHtml: string;
};

export const PLANETS: PlanetConfig[] = [
  {
    id: 'mars',
    body: 'mars',
    label: 'Mars: MOLA (463 m)',
    url: 'https://asc-pds-services.s3.us-west-2.amazonaws.com/wms_basemaps3/Mars/MOLA/mola128_mola64_merge_90Nto90S_SimpleC_clon0_cog.tif',
    units: 'metres',
    nativeMetres: 463,
    maxZoom: 11,
    attributionHtml: 'Mars elevation: MOLA Science Team, NASA / <a href="https://astrogeology.usgs.gov" target="_blank" rel="noopener">USGS Astrogeology</a> (public domain). Heights are relative to the Mars areoid',
  },
  {
    id: 'moon',
    body: 'moon',
    label: 'Moon: LRO LOLA (118 m)',
    url: 'https://asc-pds-services.s3.us-west-2.amazonaws.com/wms_basemaps3/Moon/LRO_LOLA_DEM_Global_256ppd_v06_16bit_cog.tif',
    units: 'degrees',
    nativeMetres: 118,
    maxZoom: 12,
    attributionHtml: 'Moon elevation: LRO LOLA Science Team, NASA / <a href="https://astrogeology.usgs.gov" target="_blank" rel="noopener">USGS Astrogeology</a> (public domain). Heights are relative to a 1,737.4 km sphere',
  },
];

type CogLevel = {image: any, width: number, height: number, resX: number, resY: number};

/**
 * A global DEM in a cloud-optimised GeoTIFF on another body, resampled into
 * web-mercator tiles (the same tile maths works on any sphere).
 */
export class PlanetSource implements ElevationSource {
  id: ElevationSourceId;
  body: Body;
  radius: number;
  label: string;
  maxZoom: number;
  nativeZoom: number;
  attributionHtml: string;
  config: PlanetConfig;
  stats: ElevationStats = {bestZoom: null, worstZoom: null};
  levels: Promise<{levels: CogLevel[], originX: number, originY: number, noData: number | null}> | null = null;
  cache = new LruCache<Promise<Float32Array>>(64);
  limiter = new Limiter(4);

  constructor(config: PlanetConfig) {
    this.config = config;
    this.id = config.id;
    this.body = config.body;
    this.radius = BODY_RADIUS[config.body];
    this.label = config.label;
    this.maxZoom = config.maxZoom;
    this.nativeZoom = Math.floor(zoomForResolution(config.nativeMetres, this.radius));
    this.attributionHtml = config.attributionHtml;
  }

  resetStats() {
    this.stats = {bestZoom: null, worstZoom: null};
  }
  getStats() {
    return {...this.stats};
  }

  /** Open the file once: the full-resolution image plus its overviews, finest first. */
  open() {
    if (!this.levels) {
      this.levels = (async () => {
        const {fromUrl} = await import(/* webpackChunkName: "geotiff" */ 'geotiff');
        const tiff = await fromUrl(this.config.url);
        const count = await tiff.getImageCount();
        const main = await tiff.getImage(0);
        const [resX, resY] = main.getResolution();
        const [originX, originY] = main.getOrigin();
        const levels: CogLevel[] = [];
        for (let i = 0; i < count; i++) {
          const image = i === 0 ? main : await tiff.getImage(i);
          const width = image.getWidth();
          const height = image.getHeight();
          // Overviews carry no georeferencing of their own: they cover the same extent
          levels.push({image, width, height, resX: resX * main.getWidth() / width, resY: Math.abs(resY) * main.getHeight() / height});
        }
        return {levels, originX, originY, noData: main.getGDALNoData()};
      })();
      this.levels.catch(() => { this.levels = null; });
    }
    return this.levels;
  }

  /** Degrees to the file's own x/y units. */
  toCrs(lng: number, lat: number): [number, number] {
    if (this.config.units === 'degrees') return [lng, lat];
    const k = this.radius * Math.PI / 180;
    return [lng * k, lat * k];
  }

  getTile(z: number, x: number, y: number): Promise<Float32Array> {
    trackZoom(this.stats, Math.min(z, this.nativeZoom));
    const key = `${z}/${x}/${y}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const promise = this.limiter.run(() => this.readTile(z, x, y));
    promise.catch(() => this.cache.map.delete(key));
    this.cache.set(key, promise);
    return promise;
  }

  async readTile(z: number, x: number, y: number): Promise<Float32Array> {
    const {levels, originX, originY, noData} = await this.open();
    const west = tileXToLng(x, z), east = tileXToLng(x + 1, z);
    const north = tileYToLat(y, z), south = tileYToLat(y + 1, z);
    const [cx0, cyN] = this.toCrs(west, north);
    const [cx1, cyS] = this.toCrs(east, south);
    // Coarsest level that is still at least as detailed as the output (in longitude, where mercator pixels are widest)
    const target = (cx1 - cx0) / TILE_SIZE;
    let level = levels[0];
    for (const l of levels) {
      if (l.resX <= target) level = l;
    }
    const colMin = Math.max(0, Math.floor((cx0 - originX) / level.resX) - 1);
    const colMax = Math.min(level.width - 1, Math.ceil((cx1 - originX) / level.resX) + 1);
    const rowMin = Math.max(0, Math.floor((originY - cyN) / level.resY) - 1);
    const rowMax = Math.min(level.height - 1, Math.ceil((originY - cyS) / level.resY) + 1);
    const out = new Float32Array(TILE_SIZE * TILE_SIZE);
    if (colMax < colMin || rowMax < rowMin) return out;
    const w = colMax - colMin + 1;
    const h = rowMax - rowMin + 1;
    const rasters = await level.image.readRasters({window: [colMin, rowMin, colMax + 1, rowMax + 1], samples: [0]});
    const src = rasters[0] as ArrayLike<number>;
    const valid = (v: number) => Number.isFinite(v) && (noData === null || v !== noData);

    const n = Math.pow(2, z);
    for (let py = 0; py < TILE_SIZE; py++) {
      const lat = tileYToLat(y + (py + 0.5) / TILE_SIZE, z);
      for (let px = 0; px < TILE_SIZE; px++) {
        const lng = (x + (px + 0.5) / TILE_SIZE) / n * 360 - 180;
        const [cx, cy] = this.toCrs(lng, lat);
        // Pixel-centre coordinates inside the window
        const fx = Math.min(w - 1, Math.max(0, (cx - originX) / level.resX - 0.5 - colMin));
        const fy = Math.min(h - 1, Math.max(0, (originY - cy) / level.resY - 0.5 - rowMin));
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        const x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
        const tx = fx - x0, ty = fy - y0;
        let sum = 0, weight = 0;
        const add = (ix: number, iy: number, wt: number) => {
          const v = src[iy * w + ix];
          if (wt > 0 && valid(v)) { sum += v * wt; weight += wt; }
        };
        add(x0, y0, (1 - tx) * (1 - ty));
        add(x1, y0, tx * (1 - ty));
        add(x0, y1, (1 - tx) * ty);
        add(x1, y1, tx * ty);
        out[py * TILE_SIZE + px] = weight > 0 ? sum / weight : 0;
      }
    }
    return out;
  }
}

/** A handy starting view for each body. */
export const BODY_HOME: Record<Body, {lat: number, lng: number, zoom: number, label: string}> = {
  earth: {lat: 27.9881, lng: 86.925, zoom: 12, label: 'Everest'},
  mars: {lat: 18.4, lng: -134.0, zoom: 6, label: 'Olympus Mons'},
  moon: {lat: -43.31, lng: -11.36, zoom: 8, label: 'Tycho crater'},
};
