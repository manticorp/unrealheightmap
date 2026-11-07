import {
  TreeRaster, buildTreemap, crownRadius, decodeTrees, defaultTreeSettings, detectTrees, encodeTrees,
  lv95ToWgs84, rasterLatLng, rasterXY, treeFraction, treesToCsv, wgs84ToLv95,
} from '../src/trees';
import {OsmGrid, latLngToPixel} from '../src/osm-layers';
import {MM_PER_UNIT, POSTER_CREDIT_URL, POSTER_THEMES, pagePixels, posterQrUrl, qrColours, qrModules} from '../src/poster';
import {scatterUnrealScript} from '../src/scatter';

describe('Swiss projection', () => {
  it('matches swisstopo reference points', () => {
    // Bern observatory (LV95 origin area): 46.95108, 7.43864 -> about 2600000, 1200000
    const [e, n] = wgs84ToLv95(46.95108, 7.43864);
    expect(Math.abs(e - 2600000)).toBeLessThan(5);
    expect(Math.abs(n - 1200000)).toBeLessThan(5);
  });
  it('round-trips within a metre', () => {
    for (const [lat, lng] of [[46.0, 7.75], [47.5, 9.4], [46.2, 6.1]]) {
      const [e, n] = wgs84ToLv95(lat, lng);
      const [la, lo] = lv95ToWgs84(e, n);
      expect(Math.abs(la - lat) * 111000).toBeLessThan(1.5);
      expect(Math.abs(lo - lng) * 111000 * Math.cos(lat * Math.PI / 180)).toBeLessThan(1.5);
    }
  });
});

/** A 1 m canopy raster in LV95 with cone-shaped trees at known spots. */
const forest = (trees: [number, number, number][], size = 60): TreeRaster => {
  const data = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let h = 0;
      for (const [tx, ty, th] of trees) {
        const r = crownRadius(th) * 1.6;
        const d = Math.hypot(x - tx, y - ty);
        if (d < r) h = Math.max(h, th * (1 - d / r));
      }
      data[y * size + x] = h;
    }
  }
  return {kind: 'height', crs: '2056', data, width: size, height: size, originX: 2624000, originY: 1096060, resX: 1, resY: 1, label: 'test'};
};

describe('tree detection', () => {
  it('finds each tree once, at its height', () => {
    const r = forest([[10, 10, 20], [30, 12, 15], [45, 40, 25], [15, 45, 8]]);
    const found = detectTrees(r, 3);
    expect(found.count).toBe(4);
    const tops = [];
    for (let k = 0; k < found.count; k++) tops.push([found.data[k * 4], found.data[k * 4 + 1], found.data[k * 4 + 2]]);
    for (const [tx, ty, th] of [[10, 10, 20], [30, 12, 15], [45, 40, 25], [15, 45, 8]]) {
      const hit = tops.find(([x, y]) => Math.hypot(x - tx, y - ty) <= 1);
      expect(hit).toBeDefined();
      expect(hit![2]).toBeGreaterThan(th * 0.8);
    }
  });
  it('ignores low vegetation', () => {
    const r = forest([[20, 20, 2], [40, 40, 12]]);
    expect(detectTrees(r, 3).count).toBe(1);
  });
  it('measures tree cover as a share of the ground', () => {
    const r = forest([[30, 30, 20]]);
    const f = treeFraction(r, 3, 30);
    // About 23 tree pixels in a 61 × 61 window
    expect(f[30 * 60 + 30]).toBeGreaterThan(0.003);
    expect(f[30 * 60 + 30]).toBeLessThan(0.02);
    const sharp = treeFraction(r, 3, 0);
    expect(sharp[30 * 60 + 30]).toBe(1);
    expect(sharp[0]).toBe(0);
  });
  it('maps raster pixels to lat/lng and back', () => {
    const r = forest([]);
    const [lat, lng] = rasterLatLng(r, 12, 34);
    const [x, y] = rasterXY(r, lat, lng);
    expect(x).toBeCloseTo(12, 0);
    expect(y).toBeCloseTo(34, 0);
  });
});

describe('treemap', () => {
  it('builds maps and single trees on the export grid', () => {
    const r = forest([[10, 10, 20], [30, 12, 15], [45, 40, 25], [15, 45, 8]]);
    // An export grid over the same ground at about 1 m per pixel
    const [lat, lng] = rasterLatLng(r, -0.5, -0.5);
    const zoom = 17;
    const n = Math.pow(2, zoom);
    const tx = (lng + 180) / 360 * n;
    const latRad = lat * Math.PI / 180;
    const ty = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
    const grid: OsmGrid = {zoom, x0: tx, y0: ty, width: 70, height: 70};
    const [px, py] = latLngToPixel(grid, ...rasterLatLng(r, 59.5, 59.5));
    expect(px).toBeGreaterThan(40);
    const heights = new Float32Array(70 * 70).fill(1500);
    const mpp = {x: px / 60, y: py / 60};
    const result = buildTreemap(heights, 70, 70, grid, mpp, [r], {}, {...defaultTreeSettings, leaf: 'broadleaf'});
    expect(result.detected).toBe(4);
    expect(result.points.count).toBe(4);
    expect(result.broadleaf).toBe(4);
    expect(result.maps.map(m => m.name)).toEqual(['trees_density', 'trees_conifer', 'trees_broadleaf', 'trees_canopy_height_0-51m']);
    expect(result.cover).toBeGreaterThan(0.01);
    const csv = treesToCsv(result.points, (x, y) => [x, y]);
    expect(csv.split('\n')[1].startsWith('broadleaf,')).toBe(true);
  });
  it('scatters trees through tree cover where there is no canopy height', () => {
    const size = 50;
    const data = new Float32Array(size * size).fill(30); // grassland
    for (let y = 0; y < size; y++) for (let x = 0; x < 10; x++) data[y * size + x] = 10; // forest: about the first 47 px of the grid
    const zoom = 15;
    const grid: OsmGrid = {zoom, x0: 17000, y0: 11500, width: 100, height: 100};
    const [lat0, lng0] = [ (() => { const m = Math.PI - 2 * Math.PI * 11500 / Math.pow(2, zoom); return 180 / Math.PI * Math.atan(Math.sinh(m)); })(), 17000 / Math.pow(2, zoom) * 360 - 180];
    const res = 0.00025;
    const cover: TreeRaster = {kind: 'cover', crs: '4326', data, width: size, height: size, originX: lng0 - res * 2, originY: lat0 + res * 2, resX: res, resY: res, label: 'cover'};
    const heights = new Float32Array(100 * 100);
    const result = buildTreemap(heights, 100, 100, grid, {x: 3, y: 3}, [cover], {}, {...defaultTreeSettings, density: 200, spacing: 2});
    expect(result.detected).toBe(0);
    expect(result.scattered).toBeGreaterThan(100);
    // Trees only on the forest side
    const d = result.points.data;
    let west = 0;
    for (let k = 0; k < result.points.count; k++) if (d[k * 7] < 50) west++;
    expect(west / result.points.count).toBeGreaterThan(0.95);
  });
  it('round-trips settings', () => {
    const s = {minHeight: 4.5, density: 220, spacing: 2.5, leaf: 'mixed' as const, swiss: false};
    expect(decodeTrees(encodeTrees(s))).toEqual(s);
    expect(decodeTrees('')).toEqual(defaultTreeSettings);
  });
});

describe('poster extras', () => {
  it('uses custom sizes exactly', () => {
    const page = pagePixels('custom', 100, 2, [254, 127]);
    expect(page).toEqual({width: 1000, height: 500});
    expect(10 * MM_PER_UNIT.in).toBeCloseTo(254, 6);
  });
  it('makes a square QR code for the credit link', () => {
    const m = qrModules(POSTER_CREDIT_URL);
    expect(m.length).toBeGreaterThanOrEqual(21);
    expect(m.every(row => row.length === m.length)).toBe(true);
    // Finder pattern corners are dark
    expect(m[0][0] && m[0][m.length - 1] && m[m.length - 1][0]).toBe(true);
  });
  it('links the QR code to the same settings, with UTM tags', () => {
    const url = posterQrUrl('#lat=1&lng=2', 'mars_a4');
    expect(url).toBe(`${POSTER_CREDIT_URL}?utm_source=poster&utm_medium=qr&utm_content=mars_a4#lat=1&lng=2`);
    expect(posterQrUrl('', 'x')).toBe(`${POSTER_CREDIT_URL}?utm_source=poster&utm_medium=qr&utm_content=x`);
  });
  it('keeps QR modules dark on light in every poster style', () => {
    const classic = qrColours(POSTER_THEMES.classic);
    expect(classic).toEqual({dark: POSTER_THEMES.classic.ink, light: POSTER_THEMES.classic.paper, onPaper: true});
    const night = qrColours(POSTER_THEMES.dark);
    expect(night).toEqual({dark: POSTER_THEMES.dark.paper, light: POSTER_THEMES.dark.ink, onPaper: false});
  });
  it('lets tree scripts size basic shapes by real height', () => {
    const script = scatterUnrealScript([], 'x', {meshSize: 10, note: 'hello'});
    expect(script).toContain('MESH_SIZE = 10.0');
    expect(script).toContain('# hello');
  });
});
