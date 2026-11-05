import {
  bboxAreaKm2,
  buildOverpassQuery,
  fetchOsmLayers,
  FetchLike,
  gridBBox,
  joinRings,
  LatLng,
  latLngToPixel,
  OSM_LAYERS,
  OsmFeature,
  OsmGrid,
  parseOverpass,
  pixelToLatLng,
  rasterizeLayers,
  weightNormalise,
} from '../src/osm-layers';

// 100 x 100 px somewhere in mid-latitudes at zoom 14, 1 m per pixel for easy widths
const grid: OsmGrid = {zoom: 14, x0: 8100.25, y0: 5400.5, width: 100, height: 100, metresPerPixel: 1};

const ll = (px: number, py: number): LatLng => pixelToLatLng(grid, px, py);
const geom = (pts: LatLng[]) => pts.map(([lat, lon]) => ({lat, lon}));
const square = (x0: number, y0: number, x1: number, y1: number): LatLng[] =>
  [ll(x0, y0), ll(x1, y0), ll(x1, y1), ll(x0, y1), ll(x0, y0)];

const sum = (data: Uint8Array) => {
  let total = 0;
  for (let i = 0; i < data.length; i++) total += data[i];
  return total / 255;
};
const at = (data: Uint8Array, x: number, y: number) => data[y * grid.width + x];

describe('osm layers', () => {
  test('pixel <-> lat/lng round trips', () => {
    const [lat, lng] = ll(12.5, 87.25);
    const [px, py] = latLngToPixel(grid, lat, lng);
    expect(px).toBeCloseTo(12.5, 6);
    expect(py).toBeCloseTo(87.25, 6);
    const b = gridBBox(grid);
    expect(b.north).toBeGreaterThan(b.south);
    expect(b.east).toBeGreaterThan(b.west);
  });

  test('query has one statement per tag key and multipolygons only for areas', () => {
    const q = buildOverpassQuery({south: 51.5, west: -0.2, north: 51.6, east: -0.1}, ['roads', 'water', 'forest', 'buildings'], 60);
    expect(q).toMatch(/^\[out:json\]\[timeout:60\]\[bbox:51\.500000,-0\.200000,51\.600000,-0\.100000\];/);
    expect(q).toContain('way["highway"~"^(motorway|trunk|');
    expect(q).not.toContain('rel["type"="multipolygon"]["highway"');
    expect(q).toContain('way["natural"~"^(water|wood)$"];');
    expect(q).toContain('rel["type"="multipolygon"]["natural"~"^(water|wood)$"];');
    expect(q).toContain('way["landuse"~"^(reservoir|basin|forest)$"];');
    expect(q).toContain('way["building"];');
    expect(q).toContain('rel["type"="multipolygon"]["building"];');
    expect(q).toMatch(/out geom;$/);
    expect(q).not.toContain('railway');
  });

  test('a key used by line and area layers keeps line values off relations', () => {
    const q = buildOverpassQuery({south: 0, west: 0, north: 1, east: 1}, ['rivers', 'water']);
    expect(q).toContain('way["waterway"~"^(river|canal|stream|brook|ditch|drain|riverbank|dock)$"];');
    expect(q).toContain('rel["type"="multipolygon"]["waterway"~"^(riverbank|dock)$"];');
  });

  test('every layer has a unique id and at least one tag rule', () => {
    const ids = OSM_LAYERS.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    OSM_LAYERS.forEach(l => expect(l.tags.length).toBeGreaterThan(0));
  });

  test('joinRings joins a reversed half onto the other and drops unclosed chains', () => {
    const a: LatLng[] = [[0, 0], [0, 1], [1, 1]];
    const b: LatLng[] = [[0, 0], [1, 0], [1, 1]]; // runs the same way, so must be reversed
    const dangling: LatLng[] = [[5, 5], [6, 6]];
    const rings = joinRings([a, b, dangling]);
    expect(rings).toHaveLength(1);
    expect(rings[0]).toEqual([[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]);
  });

  test('multipolygon with split outer ring and an inner hole', () => {
    const outer = square(10, 10, 90, 90);
    const json = {elements: [{
      type: 'relation', id: 1, tags: {type: 'multipolygon', natural: 'water'},
      members: [
        {type: 'way', ref: 1, role: 'outer', geometry: geom(outer.slice(0, 3))},
        {type: 'way', ref: 2, role: 'outer', geometry: geom(outer.slice(2).reverse())},
        {type: 'way', ref: 3, role: 'inner', geometry: geom(square(40, 40, 60, 60))},
      ],
    }]};
    const features = parseOverpass(json, ['water']);
    expect(features).toHaveLength(1);
    expect(features[0].rings).toHaveLength(2);

    const [water] = rasterizeLayers(features, grid);
    expect(water.name).toBe('osm_water');
    expect(at(water.data, 50, 50)).toBe(0);
    expect(at(water.data, 20, 20)).toBe(255);
    expect(at(water.data, 5, 5)).toBe(0);
    expect(sum(water.data)).toBeCloseTo(80 * 80 - 20 * 20, 0);
  });

  test('open ways with area tags are ignored; tunnels and underground lines are skipped', () => {
    const json = {elements: [
      {type: 'way', id: 1, tags: {landuse: 'forest'}, geometry: geom([ll(0, 0), ll(10, 0), ll(10, 10)])},
      {type: 'way', id: 2, tags: {highway: 'primary', tunnel: 'yes'}, geometry: geom([ll(0, 0), ll(10, 0)])},
      {type: 'way', id: 3, tags: {waterway: 'stream', tunnel: 'culvert'}, geometry: geom([ll(0, 0), ll(10, 0)])},
      {type: 'way', id: 4, tags: {highway: 'primary'}, geometry: geom([ll(0, 0), ll(10, 0)])},
    ]};
    const features = parseOverpass(json, ['forest', 'roads', 'rivers']);
    expect(features).toHaveLength(1);
    expect(features[0]).toMatchObject({layer: 'roads', kind: 'line', widthMetres: 14});
  });

  test('a width tag overrides the class width; one element can feed two layers', () => {
    const json = {elements: [
      {type: 'way', id: 1, tags: {waterway: 'river', width: '35 m'}, geometry: geom([ll(0, 0), ll(10, 0)])},
      {type: 'way', id: 2, tags: {natural: 'water', landuse: 'reservoir', leisure: 'park'}, geometry: geom(square(0, 0, 5, 5))},
    ]};
    const features = parseOverpass(json, ['rivers', 'water', 'grass']);
    expect(features.map(f => f.layer)).toEqual(['rivers', 'water', 'grass']);
    expect(features[0].widthMetres).toBe(35);
  });

  test('horizontal road covers its width in pixels', () => {
    const json = {elements: [
      {type: 'way', id: 1, tags: {highway: 'residential'}, geometry: geom([ll(-20, 50), ll(120, 50)])},
    ]};
    const [roads] = rasterizeLayers(parseOverpass(json, ['roads']), grid);
    // residential = 7 m at 1 m/px across the full 100 px width
    expect(sum(roads.data)).toBeGreaterThan(100 * 7 * 0.98);
    expect(sum(roads.data)).toBeLessThan(100 * 7 * 1.02);
    expect(at(roads.data, 50, 50)).toBe(255);
    expect(at(roads.data, 50, 47)).toBe(255);
    expect(at(roads.data, 50, 44)).toBe(0);
    expect(at(roads.data, 50, 56)).toBe(0);
  });

  test('a diagonal line has the same area as a straight one', () => {
    const line: OsmFeature = {layer: 'roads', kind: 'line', widthMetres: 4, lines: [[ll(10, 10), ll(90, 90)]]};
    const [roads] = rasterizeLayers([line], grid);
    const length = Math.sqrt(2) * 80;
    // Centre-sampled distance coverage aliases slightly at 45 degrees
    expect(Math.abs(sum(roads.data) / (length * 4 + Math.PI * 4) - 1)).toBeLessThan(0.03);
  });

  test('thin lines are widened to the minimum pixel width', () => {
    const coarse = {...grid, metresPerPixel: 50};
    const line: OsmFeature = {layer: 'paths', kind: 'line', widthMetres: 1.5, lines: [[ll(-10, 30), ll(110, 30)]]};
    const [paths] = rasterizeLayers([line], coarse);
    expect(sum(paths.data)).toBeCloseTo(100, -1);
  });

  test('square half outside the image fills exactly half', () => {
    const f: OsmFeature = {layer: 'forest', kind: 'area', rings: [square(-30, -30, 50, 130)]};
    const [forest] = rasterizeLayers([f], grid);
    expect(sum(forest.data)).toBeCloseTo(5000, 0);
    expect(at(forest.data, 49, 99)).toBe(255);
    expect(at(forest.data, 50, 0)).toBe(0);
  });

  test('fractional edges are anti-aliased', () => {
    const f: OsmFeature = {layer: 'forest', kind: 'area', rings: [square(10.5, 10.25, 20.5, 20.25)]};
    const [forest] = rasterizeLayers([f], grid);
    expect(at(forest.data, 10, 15)).toBe(128);
    expect(at(forest.data, 15, 10)).toBe(191);
    expect(sum(forest.data)).toBeCloseTo(100, 0);
  });

  test('features entirely outside leave the mask empty and requested empty layers are kept', () => {
    const features: OsmFeature[] = [
      {layer: 'forest', kind: 'area', rings: [square(200, 200, 300, 300)]},
      {layer: 'roads', kind: 'line', widthMetres: 10, lines: [[ll(-50, -50), ll(-50, 150)]]},
    ];
    const maps = rasterizeLayers(features, grid, {layerIds: ['roads', 'forest', 'sand']});
    expect(maps.map(m => m.name)).toEqual(['osm_roads', 'osm_forest', 'osm_sand']);
    maps.forEach(m => {
      expect(m.data.length).toBe(100 * 100);
      expect(sum(m.data)).toBe(0);
    });
  });

  test('feather softens edges without changing total coverage much', () => {
    const f: OsmFeature = {layer: 'forest', kind: 'area', rings: [square(30, 30, 70, 70)]};
    const [hard] = rasterizeLayers([f], grid);
    const [soft] = rasterizeLayers([f], grid, {feather: 3});
    expect(at(soft.data, 30, 50)).toBeGreaterThan(64);
    expect(at(soft.data, 30, 50)).toBeLessThan(192);
    expect(at(soft.data, 50, 50)).toBe(255);
    expect(sum(soft.data)).toBeCloseTo(sum(hard.data), -1);
  });

  test('weightNormalise sums to 255 per pixel with later layers on top', () => {
    const features: OsmFeature[] = [
      {layer: 'grass', kind: 'area', rings: [square(0, 0, 60, 100)]},
      {layer: 'forest', kind: 'area', rings: [square(40.5, 0, 100, 100)]},
      {layer: 'roads', kind: 'line', widthMetres: 6, lines: [[ll(0, 50), ll(100, 50)]]},
    ];
    const weights = weightNormalise(rasterizeLayers(features, grid));
    expect(weights.map(w => w.name)).toEqual(['osmw_base', 'osmw_grass', 'osmw_forest', 'osmw_roads']);
    const [base, grass, forest, roads] = weights.map(w => w.data);
    for (let i = 0; i < 100 * 100; i++) {
      expect(base[i] + grass[i] + forest[i] + roads[i]).toBe(255);
    }
    expect(at(forest, 50, 10)).toBe(255);
    expect(at(grass, 50, 10)).toBe(0);
    expect(at(roads, 50, 50)).toBe(255);
    expect(at(grass, 20, 10)).toBe(255);
    expect(at(grass, 40, 10)).toBe(127);
    expect(at(forest, 40, 10)).toBe(128);
  });

  // Outside jest, 2048 px with ~6300 features takes about 0.3 s; jest's VM is much slower
  test('performance: 1024 px square with ~1600 features', () => {
    const big: OsmGrid = {zoom: 14, x0: 8100, y0: 5400, width: 1024, height: 1024};
    const bll = (x: number, y: number) => pixelToLatLng(big, x, y);
    let seed = 1;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const features: OsmFeature[] = [];
    for (let i = 0; i < 1000; i++) {
      const x = rand() * 1024, y = rand() * 1024, s = 4 + rand() * 40;
      features.push({layer: 'buildings', kind: 'area', rings: [[bll(x, y), bll(x + s, y), bll(x + s, y + s), bll(x, y + s), bll(x, y)]]});
    }
    for (let i = 0; i < 500; i++) {
      const pts: LatLng[] = [];
      let x = rand() * 1024, y = rand() * 1024;
      for (let k = 0; k < 20; k++) {
        pts.push(bll(x, y));
        x += (rand() - 0.5) * 60;
        y += (rand() - 0.5) * 60;
      }
      features.push({layer: 'roads', kind: 'line', widthMetres: 8, lines: [pts]});
    }
    for (let i = 0; i < 80; i++) {
      const cx = rand() * 1024, cy = rand() * 1024, r = 20 + rand() * 150;
      const ring: LatLng[] = [];
      for (let k = 0; k <= 200; k++) {
        const a = k / 200 * 2 * Math.PI, rr = r * (0.7 + 0.3 * Math.sin(a * 7));
        ring.push(bll(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
      }
      features.push({layer: 'forest', kind: 'area', rings: [ring]});
    }
    features.push({layer: 'grass', kind: 'area', rings: [[bll(-100, -100), bll(1500, -100), bll(1500, 1500), bll(-100, 1500), bll(-100, -100)]]});
    const start = Date.now();
    const maps = rasterizeLayers(features, big);
    const elapsed = Date.now() - start;
    expect(maps).toHaveLength(4);
    expect(sum(maps.find(m => m.name === 'osm_grass')!.data)).toBe(1024 * 1024);
    expect(elapsed).toBeLessThan(10000);
  });

  describe('fetchOsmLayers', () => {
    const bbox = gridBBox(grid);
    const ok = (body: object) => ({ok: true, status: 200, text: async () => JSON.stringify(body)});
    const fail = (status: number, body = '') => ({ok: false, status, text: async () => body});

    test('posts a form-encoded query and parses the result', async () => {
      const calls: {url: string, body: string}[] = [];
      const fetchImpl: FetchLike = async (url, init) => {
        calls.push({url, body: init.body});
        return ok({elements: [{type: 'way', id: 1, tags: {highway: 'track'}, geometry: geom([ll(0, 0), ll(5, 5)])}]});
      };
      const features = await fetchOsmLayers(bbox, ['roads'], fetchImpl);
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe('https://overpass-api.de/api/interpreter');
      expect(decodeURIComponent(calls[0].body.replace(/^data=/, ''))).toBe(buildOverpassQuery(bbox, ['roads'], 90));
      expect(features).toHaveLength(1);
    });

    test('falls back to the next endpoint on rate limits and network errors', async () => {
      const urls: string[] = [];
      let n = 0;
      const fetchImpl: FetchLike = async (url) => {
        urls.push(url);
        n++;
        if (n === 1) return fail(429);
        if (n === 2) throw new TypeError('Failed to fetch');
        return ok({elements: []});
      };
      await expect(fetchOsmLayers(bbox, ['water'], fetchImpl)).resolves.toEqual([]);
      expect(urls).toHaveLength(3);
      expect(new Set(urls).size).toBe(3);
    });

    test('readable errors for timeouts, bad requests and oversized areas', async () => {
      await expect(fetchOsmLayers(bbox, ['water'], async () => fail(504), {endpoint: 'https://x/api'}))
        .rejects.toThrow(/timed out/);
      await expect(fetchOsmLayers(bbox, ['water'], async () => fail(400, 'parse error')))
        .rejects.toThrow(/HTTP 400/);
      await expect(fetchOsmLayers(bbox, ['water'], async () => ok({elements: [], remark: 'runtime error: Query timed out in "query" at line 1'})))
        .rejects.toThrow(/timed out/);
      const huge = {south: 50, west: 0, north: 51, east: 2};
      expect(bboxAreaKm2(huge)).toBeGreaterThan(10000);
      await expect(fetchOsmLayers(huge, ['water'], async () => ok({elements: []})))
        .rejects.toThrow(/too large/);
    });
  });
});
