import {
  DemRaster,
  UploadedDemSource,
  crsToPixel,
  demFromTiff,
  lngLatToMercator,
  loadDemFile,
  parseHgt,
  pixelToCrs,
} from '../src/dem-import';
import {TILE_SIZE, metresPerPixel} from '../src/elevation';
import {DecodedTiff, TiffGeo, encodeGeoTiff} from '../src/tiff';

const hgtBuffer = (size: number, value: (c: number, r: number) => number) => {
  const buffer = new ArrayBuffer(size * size * 2);
  const view = new DataView(buffer);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) view.setInt16((r * size + c) * 2, value(c, r), false);
  }
  return buffer;
};

const geo = (overrides: Partial<TiffGeo>): TiffGeo => ({
  epsg: 4326,
  modelType: 'geographic',
  rasterType: 'area',
  geoTransform: null,
  pixelScale: null,
  tiepoints: null,
  transformation: null,
  geoKeys: {},
  citation: null,
  ...overrides,
});

const tiff = (width: number, height: number, value: (c: number, r: number) => number, g: Partial<TiffGeo>, noData: number | null = null): DecodedTiff => {
  const data = new Float32Array(width * height);
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) data[r * width + c] = value(c, r);
  }
  return {width, height, data, noData, geo: geo(g)};
};

/** Centre of output pixel (i, j) in tile (z, x, y), in degrees. */
const tilePixelLngLat = (z: number, x: number, y: number, i: number, j: number) => {
  const n = TILE_SIZE * Math.pow(2, z);
  const lng = (x * TILE_SIZE + i + 0.5) / n * 360 - 180;
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y * TILE_SIZE + j + 0.5) / n))) * 180 / Math.PI;
  return [lng, lat];
};

/** Slippy tile containing a point. */
const tileAt = (z: number, lng: number, lat: number) => {
  const n = Math.pow(2, z);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return {x, y};
};

describe('parseHgt', () => {
  test('reads SRTM1 heights, voids and bounds from the filename', () => {
    const raster = parseHgt(hgtBuffer(3601, (c, r) => (c === 5 && r === 7 ? -32768 : r * 2 + c)), 'N27E086.hgt');
    expect(raster.width).toBe(3601);
    expect(raster.crs).toBe(4326);
    expect(raster.data[0]).toBe(0);
    expect(raster.data[3600]).toBe(3600);
    expect(raster.data[7 * 3601 + 5]).toBeNaN();
    // Pixel centres span exactly one degree; edges reach half a pixel beyond
    const half = 0.5 / 3600;
    expect(raster.bounds.south).toBeCloseTo(27 - half, 10);
    expect(raster.bounds.north).toBeCloseTo(28 + half, 10);
    expect(raster.bounds.west).toBeCloseTo(86 - half, 10);
    expect(raster.bounds.east).toBeCloseTo(87 + half, 10);
    const topLeft = pixelToCrs(raster, 0, 0);
    expect(topLeft[0]).toBeCloseTo(86, 10);
    expect(topLeft[1]).toBeCloseTo(28, 10);
    const bottomRight = pixelToCrs(raster, 3600, 3600);
    expect(bottomRight[0]).toBeCloseTo(87, 10);
    expect(bottomRight[1]).toBeCloseTo(27, 10);
    expect(raster.min).toBe(0);
  });

  test('handles southern/western SRTM3 tiles and paths', () => {
    const raster = parseHgt(hgtBuffer(1201, () => 5), 'C:\\data\\s13w072.hgt');
    expect(raster.width).toBe(1201);
    const corner = pixelToCrs(raster, 0, 1200);
    expect(corner[0]).toBeCloseTo(-72, 10);
    expect(corner[1]).toBeCloseTo(-13, 10);
  });

  test('rejects bad names and sizes', () => {
    expect(() => parseHgt(hgtBuffer(1201, () => 0), 'terrain.hgt')).toThrow(/N27E086/);
    expect(() => parseHgt(new ArrayBuffer(1000), 'N27E086.hgt')).toThrow(/valid \.hgt/);
  });

  test('loadDemFile dispatches .hgt by extension', () => {
    expect(loadDemFile(hgtBuffer(1201, () => 9), 'N00E000.hgt').max).toBe(9);
    expect(() => loadDemFile(new ArrayBuffer(10), 'heights.png')).toThrow(/GeoTIFF/);
  });
});

describe('demFromTiff', () => {
  test('PixelIsArea and PixelIsPoint place pixel centres correctly', () => {
    // decodeTiff already reports the corner geotransform for both raster types
    const raster = demFromTiff(tiff(4, 3, () => 1, {geoTransform: [10, 0.5, 0, 50, 0, -0.5], rasterType: 'point'}));
    expect(pixelToCrs(raster, 0, 0)).toEqual([10.25, 49.75]);
    expect(crsToPixel(raster, 10.25, 49.75)).toEqual([0, 0]);
    expect(crsToPixel(raster, 11, 49)).toEqual([1.5, 1.5]);
    expect(raster.bounds).toEqual({south: 48.5, west: 10, north: 50, east: 12});
  });

  test('declared no-data and float sentinels become NaN', () => {
    const raster = demFromTiff(tiff(3, 1, c => [-9999, -3.4e38, 12][c], {geoTransform: [0, 1, 0, 1, 0, -1]}, -9999));
    expect(raster.data[0]).toBeNaN();
    expect(raster.data[1]).toBeNaN();
    expect(raster.min).toBe(12);
  });

  test('accepts other WGS 84-like geographic codes and Web Mercator aliases', () => {
    expect(demFromTiff(tiff(2, 2, () => 0, {epsg: 4269, geoTransform: [0, 1, 0, 2, 0, -1]})).crs).toBe(4326);
    expect(demFromTiff(tiff(2, 2, () => 0, {epsg: null, modelType: 'geographic', geoTransform: [0, 1, 0, 2, 0, -1]})).crs).toBe(4326);
    const merc = {modelType: 'projected' as const, geoTransform: [0, 100, 0, 200, 0, -100]};
    expect(demFromTiff(tiff(2, 2, () => 0, {...merc, epsg: 900913})).crs).toBe(3857);
    expect(demFromTiff(tiff(2, 2, () => 0, {...merc, epsg: 102100})).crs).toBe(3857);
    expect(demFromTiff(tiff(2, 2, () => 0, {...merc, epsg: null, citation: 'WGS 84 / Pseudo-Mercator'})).crs).toBe(3857);
  });

  test('rejects UTM and other projections with QGIS instructions', () => {
    const utm = tiff(2, 2, () => 0, {epsg: 32633, modelType: 'projected', geoTransform: [500000, 30, 0, 5000000, 0, -30]});
    expect(() => demFromTiff(utm)).toThrow(/UTM zone 33N.*EPSG:4326.*Raster > Projections > Warp/);
    const bng = tiff(2, 2, () => 0, {epsg: 27700, modelType: 'projected', geoTransform: [0, 1, 0, 2, 0, -1]});
    expect(() => demFromTiff(bng)).toThrow(/EPSG:27700.*Warp/);
    const custom = tiff(2, 2, () => 0, {epsg: null, modelType: 'projected', citation: 'Lambert thing', geoTransform: [0, 1, 0, 2, 0, -1]});
    expect(() => demFromTiff(custom)).toThrow(/Lambert thing/);
  });

  test('rejects missing georeferencing, unknown CRS, all-void and out-of-range degrees', () => {
    expect(() => demFromTiff(tiff(2, 2, () => 0, {}))).toThrow(/no georeferencing/);
    expect(() => demFromTiff(tiff(2, 2, () => 0, {epsg: null, modelType: null, geoTransform: [0, 1, 0, 2, 0, -1]}))).toThrow(/doesn't say/);
    expect(() => demFromTiff(tiff(2, 2, () => NaN, {geoTransform: [0, 1, 0, 2, 0, -1]}))).toThrow(/no valid heights/);
    expect(() => demFromTiff(tiff(2, 2, () => 0, {geoTransform: [500000, 30, 0, 5000000, 0, -30]}))).toThrow(/out of range/);
  });
});

describe('UploadedDemSource', () => {
  // 0.001° pixels (~111 m) over 1° × 0.5° near the equator, height = 1000 × lng + 10 × lat
  const ramp = (lng: number, lat: number) => 1000 * lng + 10 * lat;
  const west = 10;
  const north = 1.5;
  const step = 0.001;
  const raster4326 = (): DemRaster => demFromTiff(tiff(1000, 500,
    (c, r) => ramp(west + (c + 0.5) * step, north - (r + 0.5) * step),
    {geoTransform: [west, step, 0, north, 0, -step]}));

  test('samples a linear ramp exactly at the right tile pixels', async () => {
    const source = new UploadedDemSource(raster4326(), 'ramp.tif');
    const z = 12;
    const {x, y} = tileAt(z, 10.5, 1.2);
    const heights = await source.getTile(z, x, y);
    for (const [i, j] of [[0, 0], [17, 200], [128, 128], [255, 255], [3, 250]]) {
      const [lng, lat] = tilePixelLngLat(z, x, y, i, j);
      expect(heights[j * TILE_SIZE + i]).toBeCloseTo(ramp(lng, lat), 1);
    }
  });

  test('fills outside the raster with the minimum height, or a chosen fill', async () => {
    const raster = raster4326();
    const source = new UploadedDemSource(raster, 'ramp.tif');
    // Tile straddling the raster's west edge at lng 10
    const z = 12;
    const {x, y} = tileAt(z, 10, 1.2);
    const heights = await source.getTile(z, x, y);
    const [lng0] = tilePixelLngLat(z, x, y, 0, 100);
    expect(lng0).toBeLessThan(10);
    expect(heights[100 * TILE_SIZE]).toBe(raster.min);
    expect(heights[100 * TILE_SIZE + 255]).toBeGreaterThan(10000);

    source.fill = -5;
    const far = await source.getTile(z, 0, 0);
    expect(far.every(v => v === -5)).toBe(true);
    expect(new UploadedDemSource(raster, 'ramp.tif', {fill: 42}).fill).toBe(42);
  });

  test('fills voids and never returns NaN', async () => {
    const raster = demFromTiff(tiff(4, 4, (c, r) => (r < 2 ? NaN : 100 + c), {geoTransform: [0, 0.25, 0, 1, 0, -0.25]}));
    const source = new UploadedDemSource(raster, 'holes.tif', {fill: -1});
    const z = 9;
    const {x, y} = tileAt(z, 0.5, 0.5);
    const heights = await source.getTile(z, x, y);
    expect(heights.some(v => Number.isNaN(v))).toBe(false);
    // Top half of the raster is void: those pixels get the fill
    const {x: vx, y: vy} = tileAt(z, 0.2, 0.9);
    const voidTile = await source.getTile(z, vx, vy);
    expect(voidTile.some(v => v === -1)).toBe(true);
    // Near the void edge the valid neighbours are used alone, so no blending towards the fill
    const valid = Array.from(heights).filter(v => v !== -1);
    expect(Math.min(...valid)).toBeGreaterThanOrEqual(100);
  });

  test('reads a Web Mercator GeoTIFF end to end', async () => {
    const z = 13;
    const {x, y} = tileAt(z, 86.9, 27.9);
    // Raster lined up exactly with tile (x, y) at zoom z + 1: 512 px over one tile
    const tileMetres = 2 * Math.PI * 6378137 / Math.pow(2, z);
    const left = -Math.PI * 6378137 + x * tileMetres;
    const top = Math.PI * 6378137 - y * tileMetres;
    const size = 512;
    const px = tileMetres / size;
    const data = new Float32Array(size * size).map((_, i) => (i % size) + Math.floor(i / size) * 1000);
    const buffer = encodeGeoTiff({width: size, height: size, data, bounds3857: {left, top, pixelSizeX: px, pixelSizeY: px}, compress: true});
    const raster = loadDemFile(buffer, 'everest.tif');
    expect(raster.crs).toBe(3857);
    expect(raster.bounds.west).toBeCloseTo(x / Math.pow(2, z) * 360 - 180, 9);

    const source = new UploadedDemSource(raster, 'everest.tif');
    const heights = await source.getTile(z, x, y);
    // Each output pixel covers 2×2 raster pixels; its centre is midway between them
    expect(heights[0]).toBeCloseTo(0.5 + 500, 3);
    expect(heights[10 * TILE_SIZE + 20]).toBeCloseTo(40.5 + 20.5 * 1000, 3);
    // And at zoom z + 1 it's a straight copy
    const child = await source.getTile(z + 1, 2 * x + 1, 2 * y);
    expect(child[5 * TILE_SIZE + 7]).toBeCloseTo(256 + 7 + 5 * 1000, 3);
    // Mercator helpers agree with the raster corner
    const [mx, my] = lngLatToMercator(raster.bounds.west, raster.bounds.north);
    expect(mx).toBeCloseTo(left, 3);
    expect(my).toBeCloseTo(top, 3);
  });

  test('picks zooms from the native resolution and reports them', async () => {
    const raster = raster4326();
    const source = new UploadedDemSource(raster, 'ramp.tif');
    // 0.001° ≈ 111.3 m at lat ~1.25°: z10 is ~152 m/px, z11 ~76 m/px
    expect(source.nativeZoom).toBe(11);
    expect(metresPerPixel(source.nativeZoom, 1.25)).toBeLessThan(111.3);
    expect(metresPerPixel(source.nativeZoom - 1, 1.25)).toBeGreaterThan(111.3);
    expect(source.maxZoom).toBe(12);
    expect(source.id).toBe('upload');
    expect(source.label).toBe('ramp.tif');
    expect(source.filename).toBe('ramp.tif');
    expect(source.attributionHtml).toBe('Your uploaded elevation data');
    expect(source.bounds).toEqual(raster.bounds);

    expect(source.getStats()).toEqual({bestZoom: null, worstZoom: null});
    await source.getTile(12, 2161, 2034);
    expect(source.getStats()).toEqual({bestZoom: 11, worstZoom: 11});
    source.resetStats();
    expect(source.getStats()).toEqual({bestZoom: null, worstZoom: null});

    // Very fine lidar caps at zoom 20
    const lidar = demFromTiff(tiff(2, 2, () => 0, {geoTransform: [0, 1e-6, 0, 1e-6, 0, -1e-6]}));
    expect(new UploadedDemSource(lidar, 'lidar.tif').maxZoom).toBe(20);
  });
});
