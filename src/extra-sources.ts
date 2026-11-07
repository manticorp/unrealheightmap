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
import {ElevationSource, ElevationSourceId, ElevationStats, Limiter, LruCache, TILE_SIZE, parentRegion, resampleRegion} from "./elevation";
import {decodeTiff} from "./tiff";

export type Body = 'earth' | 'mars' | 'moon' | 'mercury';

/** Sphere radius (metres) used for each body's ground distances. Earth matches the app's haversine. */
export const BODY_RADIUS: Record<Body, number> = {
  earth: 6371e3,
  mars: 3396190,
  moon: 1737400,
  mercury: 2439400,
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
  /** Regional DEMs: where the file has data, in degrees. Elsewhere the fallback source is used. */
  bounds?: {west: number, east: number, south: number, north: number};
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
  {
    id: 'mercury',
    body: 'mercury',
    label: 'Mercury: MESSENGER (665 m)',
    url: 'https://asc-pds-services.s3.us-west-2.amazonaws.com/wms_basemaps3/Mercury/Messenger/Mercury_Messenger_USGS_DEM_Global_665m_v2_32bit_clon0_cog.tif',
    units: 'metres',
    nativeMetres: 665,
    maxZoom: 10,
    attributionHtml: 'Mercury elevation: MESSENGER MDIS global DEM, NASA / JHU APL / Carnegie Institution, processed by <a href="https://astrogeology.usgs.gov" target="_blank" rel="noopener">USGS Astrogeology</a> (public domain). Heights are relative to a 2,439.4 km sphere',
  },
  {
    id: 'gale',
    body: 'mars',
    label: 'Mars: Gale crater, Curiosity rover site (1 m)',
    url: 'https://asc-pds-services.s3.us-west-2.amazonaws.com/wms_basemaps3/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3_deg_cog.tif',
    units: 'degrees',
    nativeMetres: 1,
    maxZoom: 17,
    bounds: {west: 137.1242, east: 137.6806, south: -5.0986, north: -4.1297},
    attributionHtml: 'Gale crater elevation: HiRISE stereo DEM mosaic for the Mars Science Laboratory, NASA / JPL / University of Arizona / <a href="https://astrogeology.usgs.gov" target="_blank" rel="noopener">USGS Astrogeology</a> (public domain), with MOLA outside it. Heights are relative to the Mars areoid',
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

  /** Used outside a regional DEM's bounds, and to fill its gaps. */
  fallback?: ElevationSource;

  constructor(config: PlanetConfig, fallback?: ElevationSource) {
    this.config = config;
    this.fallback = fallback;
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

  /** Does the tile touch the regional DEM at all? */
  overlaps(z: number, x: number, y: number): boolean {
    const b = this.config.bounds;
    if (!b) return true;
    const west = tileXToLng(x, z), east = tileXToLng(x + 1, z);
    const north = tileYToLat(y, z), south = tileYToLat(y + 1, z);
    return east > b.west && west < b.east && north > b.south && south < b.north;
  }

  getTile(z: number, x: number, y: number): Promise<Float32Array> {
    if (this.fallback && !this.overlaps(z, x, y)) {
      return this.fallbackAt(z, x, y);
    }
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
        out[py * TILE_SIZE + px] = weight > 0 ? sum / weight : NaN;
      }
    }
    let gaps = 0;
    for (let i = 0; i < out.length; i++) if (Number.isNaN(out[i])) gaps++;
    if (gaps && this.fallback) {
      const fill = await this.fallbackAt(z, x, y);
      for (let i = 0; i < out.length; i++) if (Number.isNaN(out[i])) out[i] = fill[i];
    } else if (gaps) {
      for (let i = 0; i < out.length; i++) if (Number.isNaN(out[i])) out[i] = 0;
    }
    return out;
  }

  /** The fallback source at any zoom, upscaled from its finest tile when needed. */
  async fallbackAt(z: number, x: number, y: number): Promise<Float32Array> {
    const fb = this.fallback!;
    if (z <= fb.maxZoom) return fb.getTile(z, x, y);
    const region = parentRegion(z, x, y, fb.maxZoom, TILE_SIZE);
    const parent = await fb.getTile(fb.maxZoom, region.px, region.py);
    return resampleRegion(parent, TILE_SIZE, region.x0, region.y0, region.size);
  }
}

/**
 * Land from one source and sea floor from another: Mapterhorn's detailed land
 * (whose sea is flat at 0 m) over ETOPO's bathymetry, blended along the coast.
 */
export class LandSeaSource implements ElevationSource {
  id: ElevationSourceId = 'landsea';
  body: Body = 'earth';
  radius = BODY_RADIUS.earth;
  label = 'Mapterhorn land + ETOPO sea floor';
  maxZoom: number;
  attributionHtml: string;
  stats: ElevationStats = {bestZoom: null, worstZoom: null};

  constructor(private land: ElevationSource, private sea: ElevationSource) {
    this.maxZoom = land.maxZoom;
    this.attributionHtml = `${land.attributionHtml}; ${sea.attributionHtml}`;
  }
  resetStats() {
    this.land.resetStats();
    this.sea.resetStats();
  }
  getStats() {
    return this.land.getStats();
  }

  async seaTile(z: number, x: number, y: number): Promise<Float32Array> {
    if (z <= this.sea.maxZoom) return this.sea.getTile(z, x, y);
    const region = parentRegion(z, x, y, this.sea.maxZoom, TILE_SIZE);
    const parent = await this.sea.getTile(this.sea.maxZoom, region.px, region.py);
    return resampleRegion(parent, TILE_SIZE, region.x0, region.y0, region.size);
  }

  async getTile(z: number, x: number, y: number): Promise<Float32Array> {
    const land = await this.land.getTile(z, x, y);
    // Only fetch the sea floor where the land data shows sea
    let anySea = false;
    for (let i = 0; i < land.length; i++) if (land[i] < 2 && land[i] > -1) { anySea = true; break; }
    if (!anySea) return land;
    const sea = await this.seaTile(z, x, y);
    return blendLandSea(land, sea);
  }
}

/**
 * Where the land data sits at sea level (|h| < 2 m, i.e. the flat sea of a
 * land-only model) use the sea floor, never above 0 m, fading over the first
 * couple of metres so beaches don't get a step. Land below sea level away from
 * the coast (the Dead Sea, polders) keeps its real height.
 */
export const blendLandSea = (land: Float32Array, sea: Float32Array): Float32Array => {
  const out = new Float32Array(land.length);
  for (let i = 0; i < land.length; i++) {
    const h = land[i];
    if (h >= 2 || h <= -1) {
      out[i] = h;
      continue;
    }
    const floor = Math.min(sea[i], -0.5);
    const t = Math.max(0, Math.min(1, (h - 0.2) / 1.8));
    const w = t * t * (3 - 2 * t);
    out[i] = h * w + floor * (1 - w);
  }
  return out;
};

/** A handy starting view for each body. */
export const BODY_HOME: Record<Body, {lat: number, lng: number, zoom: number, label: string}> = {
  earth: {lat: 27.9881, lng: 86.925, zoom: 12, label: 'Everest'},
  mars: {lat: 18.4, lng: -134.0, zoom: 6, label: 'Olympus Mons'},
  moon: {lat: -43.31, lng: -11.36, zoom: 8, label: 'Tycho crater'},
  mercury: {lat: 31.5, lng: -170.0, zoom: 4, label: 'Caloris basin'},
};

/** Starting views for sources that cover only part of a world. */
export const SOURCE_HOME: Partial<Record<ElevationSourceId, {lat: number, lng: number, zoom: number, label: string}>> = {
  gale: {lat: -4.72, lng: 137.38, zoom: 12, label: 'Mount Sharp, Gale crater'},
};
