/**
 * Using the user's own elevation file (GeoTIFF or SRTM .hgt) as an
 * elevation source: the raster is loaded once, then resampled into
 * whatever slippy tiles the export asks for.
 */
import {ElevationSource, ElevationSourceId, ElevationStats, TILE_SIZE} from './elevation';
import {DecodedTiff, decodeTiff, isTiff} from './tiff';

const EARTH_RADIUS = 6378137;
const DEG = Math.PI / 180;
/** Metres per pixel at zoom 0 on the equator for 256 px tiles. */
const ZOOM0_METRES = 2 * Math.PI * EARTH_RADIUS / TILE_SIZE;
const MAX_UPLOAD_ZOOM = 20;

/** Geographic CRSes close enough to WGS 84 for heightmaps (all lat/lng in degrees). */
const GEOGRAPHIC_CODES = [4326, 4979, 4269, 4258, 4283, 7844, 4617, 4167, 6318, 4937, 4171];
/** Codes used for Web Mercator over the years. */
const MERCATOR_CODES = [3857, 900913, 3785, 102100, 102113];

const REPROJECT_HINT = 'Reproject it to EPSG:4326 (WGS 84) first: in QGIS use Raster > Projections > Warp (Reproject…), '
  + 'set the target CRS to EPSG:4326, save as GeoTIFF and upload that file.';

export type DemBounds = {south: number; west: number; north: number; east: number};

export type DemRaster = {
  width: number;
  height: number;
  /** Heights in metres, row-major from the top row, NaN where there's no data. */
  data: Float32Array;
  /** 4326: x = longitude, y = latitude in degrees. 3857: Web Mercator metres. */
  crs: 4326 | 3857;
  /**
   * GDAL-style geotransform in the pixel-corner convention:
   * x = t[0] + col·t[1] + row·t[2], y = t[3] + col·t[4] + row·t[5], where
   * (0, 0) is the outer corner of the first pixel. Use pixelToCrs/crsToPixel
   * to work with pixel centres.
   */
  transform: number[];
  /** Outer edges of the raster in degrees. */
  bounds: DemBounds;
  /** Range of valid heights. */
  min: number;
  max: number;
};

/** CRS coordinates of the centre of pixel (col, row). */
export const pixelToCrs = (raster: DemRaster, col: number, row: number): [number, number] => {
  const t = raster.transform;
  const c = col + 0.5;
  const r = row + 0.5;
  return [t[0] + c * t[1] + r * t[2], t[3] + c * t[4] + r * t[5]];
};

/** Fractional pixel position of CRS (x, y), where whole numbers are pixel centres. */
export const crsToPixel = (raster: DemRaster, x: number, y: number): [number, number] => {
  const t = raster.transform;
  const det = t[1] * t[5] - t[2] * t[4];
  const dx = x - t[0];
  const dy = y - t[3];
  return [(t[5] * dx - t[2] * dy) / det - 0.5, (t[1] * dy - t[4] * dx) / det - 0.5];
};

const mercatorToLngLat = (x: number, y: number): [number, number] =>
  [x / EARTH_RADIUS / DEG, Math.atan(Math.sinh(y / EARTH_RADIUS)) / DEG];

const lngLatToMercator = (lng: number, lat: number): [number, number] =>
  [lng * DEG * EARTH_RADIUS, Math.log(Math.tan(Math.PI / 4 + lat * DEG / 2)) * EARTH_RADIUS];

/** Fill in bounds and the valid height range; NaN-out anything non-finite. */
const finishRaster = (raster: Omit<DemRaster, 'bounds' | 'min' | 'max'>): DemRaster => {
  const {width, height, data, crs, transform: t} = raster;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (!Number.isFinite(v)) {
      data[i] = NaN;
      continue;
    }
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min > max) throw new Error('The file has no valid heights (every pixel is no-data).');

  const corners = [[0, 0], [width, 0], [0, height], [width, height]].map(([c, r]) => {
    const x = t[0] + c * t[1] + r * t[2];
    const y = t[3] + c * t[4] + r * t[5];
    return crs === 3857 ? mercatorToLngLat(x, y) : [x, y];
  });
  const lngs = corners.map(p => p[0]);
  const lats = corners.map(p => p[1]);
  const bounds = {
    south: Math.min(...lats), west: Math.min(...lngs),
    north: Math.max(...lats), east: Math.max(...lngs),
  };
  if (crs === 4326 && (bounds.south < -90.5 || bounds.north > 90.5 || bounds.west < -360 || bounds.east > 360)) {
    throw new Error(`The file says it's in degrees (EPSG:4326) but its coordinates are out of range. ${REPROJECT_HINT}`);
  }
  return {...raster, bounds, min, max};
};

/**
 * SRTM .hgt: a square of big-endian int16 metres, -32768 for voids, named
 * after its lower-left corner (e.g. N27E086.hgt). Samples sit on whole
 * fractions of a degree, so the grid's pixel centres span exactly 1°.
 */
export const parseHgt = (buffer: ArrayBuffer, filename: string): DemRaster => {
  const name = filename.split(/[\\/]/).pop();
  const match = /([NS])(\d{1,2})([EW])(\d{1,3})/i.exec(name);
  if (!match) {
    throw new Error(`Can't tell where "${name}" is: SRTM .hgt files must keep their original name, like N27E086.hgt.`);
  }
  const lat = parseInt(match[2], 10) * (match[1].toUpperCase() === 'S' ? -1 : 1);
  const lng = parseInt(match[4], 10) * (match[3].toUpperCase() === 'W' ? -1 : 1);
  const size = Math.round(Math.sqrt(buffer.byteLength / 2));
  if (size * size * 2 !== buffer.byteLength || size < 2) {
    throw new Error(`"${name}" isn't a valid .hgt file (expected 1201×1201 or 3601×3601 heights, got ${buffer.byteLength} bytes).`);
  }
  const view = new DataView(buffer);
  const data = new Float32Array(size * size);
  for (let i = 0; i < data.length; i++) {
    const v = view.getInt16(i * 2, false);
    data[i] = v === -32768 ? NaN : v;
  }
  const step = 1 / (size - 1);
  return finishRaster({
    width: size,
    height: size,
    data,
    crs: 4326,
    transform: [lng - step / 2, step, 0, lat + 1 + step / 2, 0, -step],
  });
};

const describeCrs = (tiff: DecodedTiff) => {
  const {epsg, citation} = tiff.geo;
  if (epsg && epsg >= 32601 && epsg <= 32660) return `UTM zone ${epsg - 32600}N (EPSG:${epsg})`;
  if (epsg && epsg >= 32701 && epsg <= 32760) return `UTM zone ${epsg - 32700}S (EPSG:${epsg})`;
  if (epsg) return `EPSG:${epsg}`;
  return citation ? `a custom coordinate system ("${citation}")` : 'a custom coordinate system';
};

/** Work out which of the two supported CRSes a GeoTIFF is in, or explain why not. */
const tiffCrs = (tiff: DecodedTiff): 4326 | 3857 => {
  const {epsg, modelType, citation} = tiff.geo;
  if (epsg !== null && GEOGRAPHIC_CODES.indexOf(epsg) >= 0) return 4326;
  if (epsg !== null && MERCATOR_CODES.indexOf(epsg) >= 0) return 3857;
  if (epsg === null && modelType === 'geographic') return 4326; // user-defined lat/lng, near enough
  if (epsg === null && modelType === 'projected' && citation && /pseudo.?mercator|web.?mercator|popular.?visuali[sz]ation/i.test(citation)) {
    return 3857;
  }
  if (modelType === null && epsg === null) {
    throw new Error(`This GeoTIFF doesn't say which coordinate system it uses. ${REPROJECT_HINT}`);
  }
  throw new Error(`This file uses ${describeCrs(tiff)}, which isn't supported. ${REPROJECT_HINT}`);
};

/** Turn a decoded GeoTIFF into a DemRaster (no-data → NaN). */
export const demFromTiff = (tiff: DecodedTiff): DemRaster => {
  if (!tiff.geo.geoTransform) {
    throw new Error('This TIFF has no georeferencing, so there\'s no way to place it on the map. Export it as a GeoTIFF instead.');
  }
  const crs = tiffCrs(tiff);
  const data = tiff.data;
  const noData = tiff.noData;
  const noDataF = noData === null ? null : Math.fround(noData);
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    // Float rasters often mark voids with huge negative sentinels without declaring them
    if (v === noDataF || v === noData || v < -1e30) data[i] = NaN;
  }
  return finishRaster({width: tiff.width, height: tiff.height, data, crs, transform: tiff.geo.geoTransform.slice()});
};

/** Read a user's elevation file: GeoTIFF (.tif/.tiff) or SRTM .hgt. */
export const loadDemFile = (buffer: ArrayBuffer, filename: string): DemRaster => {
  if (isTiff(buffer)) return demFromTiff(decodeTiff(buffer));
  if (/\.hgt$/i.test(filename)) return parseHgt(buffer, filename);
  if (/\.zip$/i.test(filename)) throw new Error('Please unzip the file first and upload the .hgt or .tif inside.');
  throw new Error(`"${filename}" isn't a file type that can be read here. Upload a GeoTIFF (.tif) or an SRTM .hgt file.`);
};

/** Ground size of one raster pixel in metres at its centre latitude (the finer axis). */
const nativeResolution = (raster: DemRaster) => {
  const t = raster.transform;
  const sizeX = Math.hypot(t[1], t[4]);
  const sizeY = Math.hypot(t[2], t[5]);
  const lat = (raster.bounds.north + raster.bounds.south) / 2;
  if (raster.crs === 3857) return Math.min(sizeX, sizeY) * Math.cos(lat * DEG);
  const metresPerDegree = EARTH_RADIUS * DEG;
  return Math.min(sizeX * metresPerDegree * Math.cos(lat * DEG), sizeY * metresPerDegree);
};

/**
 * Bilinear sample at fractional pixel (col, row), whole numbers at pixel
 * centres. Missing neighbours are left out of the weighting, so voids don't
 * spread; returns NaN outside the raster or where nothing valid is near.
 */
const sample = (raster: DemRaster, col: number, row: number): number => {
  const {width, height, data} = raster;
  if (col < -0.5 || row < -0.5 || col > width - 0.5 || row > height - 0.5) return NaN;
  const c = Math.min(width - 1, Math.max(0, col));
  const r = Math.min(height - 1, Math.max(0, row));
  const c0 = Math.min(width - 2, Math.floor(c));
  const r0 = Math.min(height - 2, Math.floor(r));
  // Single-row/column rasters
  if (c0 < 0 || r0 < 0) return data[Math.round(r) * width + Math.round(c)];
  const fx = c - c0;
  const fy = r - r0;
  const i = r0 * width + c0;
  const values = [data[i], data[i + 1], data[i + width], data[i + width + 1]];
  const weights = [(1 - fx) * (1 - fy), fx * (1 - fy), (1 - fx) * fy, fx * fy];
  let sum = 0;
  let weight = 0;
  for (let k = 0; k < 4; k++) {
    if (!Number.isNaN(values[k]) && weights[k] > 0) {
      sum += values[k] * weights[k];
      weight += weights[k];
    }
  }
  return weight > 0 ? sum / weight : NaN;
};

/** Serves an uploaded raster as slippy-map tiles. */
export class UploadedDemSource implements ElevationSource {
  id: ElevationSourceId = 'upload';
  label: string;
  maxZoom: number;
  /** Slippy zoom whose pixels are just finer than the raster's own. */
  nativeZoom: number;
  attributionHtml = 'Your uploaded elevation data';
  /** Height used outside the raster and in voids; defaults to the lowest valid height. */
  fill: number;
  bounds: DemBounds;
  stats: ElevationStats = {bestZoom: null, worstZoom: null};

  constructor(public raster: DemRaster, public filename: string, options: {fill?: number} = {}) {
    this.label = filename;
    this.bounds = raster.bounds;
    this.fill = options.fill !== undefined ? options.fill : raster.min;
    const lat = (raster.bounds.north + raster.bounds.south) / 2;
    const zoom = Math.log2(ZOOM0_METRES * Math.cos(lat * DEG) / nativeResolution(raster));
    // A hair of tolerance so an exact match doesn't round up a level
    this.nativeZoom = Math.max(0, Math.min(MAX_UPLOAD_ZOOM, Math.ceil(zoom - 1e-9)));
    this.maxZoom = Math.min(MAX_UPLOAD_ZOOM, this.nativeZoom + 1);
  }

  resetStats() {
    this.stats = {bestZoom: null, worstZoom: null};
  }
  getStats() {
    return {...this.stats};
  }

  /** True if the slippy tile overlaps the raster at all. */
  coversTile(z: number, x: number, y: number) {
    const n = Math.pow(2, z);
    const west = x / n * 360 - 180;
    const east = (x + 1) / n * 360 - 180;
    const north = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) / DEG;
    const south = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) / DEG;
    const b = this.bounds;
    return west < b.east && east > b.west && south < b.north && north > b.south;
  }

  async getTile(z: number, x: number, y: number): Promise<Float32Array> {
    const {raster, fill} = this;
    const out = new Float32Array(TILE_SIZE * TILE_SIZE).fill(fill);
    this.stats.bestZoom = this.nativeZoom;
    this.stats.worstZoom = this.nativeZoom;
    if (!this.coversTile(z, x, y)) return out;
    const worldSize = TILE_SIZE * Math.pow(2, z);
    const circumference = 2 * Math.PI * EARTH_RADIUS;
    for (let j = 0; j < TILE_SIZE; j++) {
      const my = (0.5 - (y * TILE_SIZE + j + 0.5) / worldSize) * circumference;
      const lat = Math.atan(Math.sinh(my / EARTH_RADIUS)) / DEG;
      for (let i = 0; i < TILE_SIZE; i++) {
        const mx = ((x * TILE_SIZE + i + 0.5) / worldSize - 0.5) * circumference;
        const [col, row] = raster.crs === 3857
          ? crsToPixel(raster, mx, my)
          : crsToPixel(raster, mx / EARTH_RADIUS / DEG, lat);
        const value = sample(raster, col, row);
        if (!Number.isNaN(value)) out[j * TILE_SIZE + i] = value;
      }
    }
    return out;
  }
}

export {lngLatToMercator, mercatorToLngLat};
