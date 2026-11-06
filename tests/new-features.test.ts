import {applyShapeMask, decodeShape, encodeShape, resampleRotated, rotateIn, rotateOut, rotatedBounds} from '../src/area';
import {carveTerrain, downhillProfile, smoothProfile, defaultCarve} from '../src/carve';
import {OsmFeature, OsmGrid, latLngToPixel, pixelToLatLng, gridBBox} from '../src/osm-layers';
import {buildSplines, clipToImage, splinesBlenderScript, splinesToCsv, splinesToGeoJson, splinesUnrealScript} from '../src/splines';
import {PAINT_PRESETS, blankRule, decodePaint, encodePaint, paintTerrain, softRange} from '../src/painter';
import {decodeScatter, encodeScatter, scatterPoints, scatterUnrealScript, blankScatter} from '../src/scatter';
import {appendBuildings, buildingFootprints, triangulate} from '../src/buildings';
import {annualInsolation, viewshed} from '../src/analysis';
import {niceDistance, pagePixels, renderPosterMap} from '../src/poster';
import {bandMeshes, boxesMesh, labelBoxes, labelText, lithophaneThickness, threeMfModel} from '../src/print3d';
import {blendLandSea} from '../src/extra-sources';
import {buildMesh, defaultMeshOptions} from '../src/mesh';
import {buildHash, parseHash} from '../src/url-state';

const grid: OsmGrid = {zoom: 15, x0: 17000, y0: 11500, width: 100, height: 80};
const at = (px: number, py: number) => pixelToLatLng(grid, px, py);
const MPP = 156543.03392 * Math.cos(at(50, 40)[0] * Math.PI / 180) / Math.pow(2, 15);

describe('area', () => {
  it('rotates and un-rotates offsets', () => {
    const [x, y] = rotateOut(10, -4, 37);
    const [u, v] = rotateIn(x, y, 37);
    expect(u).toBeCloseTo(10, 9);
    expect(v).toBeCloseTo(-4, 9);
    // 90° clockwise: the top of the image points east
    const [ex, ey] = rotateOut(0, -1, 90);
    expect(ex).toBeCloseTo(1, 9);
    expect(ey).toBeCloseTo(0, 9);
  });

  it('bounds a rotated grid', () => {
    const b = rotatedBounds(100, 50, 100, 50, 90);
    expect(b.maxX - b.minX).toBeCloseTo(50, 6);
    expect(b.maxY - b.minY).toBeCloseTo(100, 6);
  });

  it('resamples into a rotated grid', () => {
    const w = 20, h = 20;
    const src = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) src[y * w + x] = x;
    const same = resampleRotated(src, w, h, {rotation: 0, gridWidth: w, gridHeight: h, areaWidth: w, areaHeight: h, centreX: w / 2, centreY: h / 2});
    expect(same[5 * w + 7]).toBeCloseTo(7, 5);
    // Rotated 90°: moving down the output moves west on the map, so values fall
    const rot = resampleRotated(src, w, h, {rotation: 90, gridWidth: 10, gridHeight: 10, areaWidth: 10, areaHeight: 10, centreX: w / 2, centreY: h / 2});
    expect(rot[2 * 10 + 5]).toBeGreaterThan(rot[7 * 10 + 5]);
    expect(rot[5 * 10 + 2]).toBeCloseTo(rot[5 * 10 + 7], 5);
  });

  it('round-trips a shape and masks outside it', () => {
    const ring: [number, number][] = [[1.123456, 2.5], [1.5, 2.9], [1.2, 3.1]];
    expect(decodeShape(encodeShape(ring))[0]).toEqual([1.12346, 2.5]);
    expect(decodeShape('1,2;3')).toEqual([]);
    const heights = Float32Array.from([10, 20, 30, 40]);
    const {floor} = applyShapeMask(heights, Uint8Array.from([255, 255, 0, 128]));
    expect(floor).toBe(10);
    expect(heights[2]).toBe(10);
    expect(heights[3]).toBeCloseTo(10 + 30 * 128 / 255, 3);
  });

  it('maps lat/lng into a rotated OSM grid and back', () => {
    const rotated = {...grid, rotation: 30};
    const ll = pixelToLatLng(rotated, 12, 34);
    const [px, py] = latLngToPixel(rotated, ll[0], ll[1]);
    expect(px).toBeCloseTo(12, 6);
    expect(py).toBeCloseTo(34, 6);
    const b = gridBBox(rotated), plain = gridBBox(grid);
    expect(b.north - b.south).toBeGreaterThan(plain.north - plain.south);
  });
});

describe('carve', () => {
  it('smooths and makes profiles run downhill', () => {
    expect(Array.from(downhillProfile(Float64Array.from([5, 6, 4, 4.5, 3])))).toEqual([5, 5, 4, 4, 3]);
    expect(Array.from(smoothProfile(Float64Array.from([0, 3, 0]), 1))).toEqual([1.5, 1, 1.5]);
  });

  it('flattens a road across a slope and cuts a river channel', () => {
    const {width, height} = grid;
    // Ground rises 0.5 m per pixel to the south (y) with bumps
    const make = () => {
      const h = new Float32Array(width * height);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) h[y * width + x] = y * 0.5 + Math.sin(x * 1.7) * 2;
      return h;
    };
    // A road running east-west at y = 40
    const road: OsmFeature = {layer: 'roads', kind: 'line', widthMetres: MPP * 6, lines: [[at(-5, 40.5), at(105, 40.5)]]};
    const heights = make();
    const result = carveTerrain(heights, width, height, [road], grid, {...defaultCarve, roads: true, shoulder: MPP * 3}, MPP);
    expect(result.roads).toBe(1);
    // Along the road the bumps are smoothed out
    let before = 0, after = 0;
    const original = make();
    for (let x = 10; x < 90; x++) {
      before += Math.abs(original[40 * width + x + 1] - original[40 * width + x]);
      after += Math.abs(heights[40 * width + x + 1] - heights[40 * width + x]);
    }
    expect(after).toBeLessThan(before * 0.3);
    // Far from the road nothing changes
    expect(heights[5 * width + 50]).toBeCloseTo(original[5 * width + 50], 5);

    const river: OsmFeature = {layer: 'rivers', kind: 'line', value: 'river', widthMetres: MPP * 4, lines: [[at(50.5, 75), at(50.5, 5)]]};
    const riverHeights = make();
    carveTerrain(riverHeights, width, height, [river], grid, {...defaultCarve, rivers: true}, MPP);
    // The channel is lower than the banks and never rises downstream (northwards here)
    expect(riverHeights[40 * width + 50]).toBeLessThan(original[40 * width + 50]);
    for (let y = 70; y > 10; y--) expect(riverHeights[(y - 1) * width + 50]).toBeLessThanOrEqual(riverHeights[y * width + 50] + 1e-3);
  });

  it('ignores bridges', () => {
    const heights = new Float32Array(grid.width * grid.height).fill(5);
    heights[40 * grid.width + 50] = 50;
    const bridge: OsmFeature = {layer: 'roads', kind: 'line', bridge: true, widthMetres: 10, lines: [[at(0, 40.5), at(100, 40.5)]]};
    carveTerrain(heights, grid.width, grid.height, [bridge], grid, {...defaultCarve, roads: true}, MPP);
    expect(heights[40 * grid.width + 50]).toBe(50);
  });
});

describe('splines', () => {
  const heights = new Float32Array(grid.width * grid.height);
  for (let i = 0; i < heights.length; i++) heights[i] = 100 + (i % grid.width);
  const features: OsmFeature[] = [
    {layer: 'roads', kind: 'line', value: 'primary', name: 'Main "Street"', widthMetres: 14, lines: [[at(-20, 10), at(50, 10), at(50, 60)]]},
    {layer: 'rivers', kind: 'line', value: 'stream', widthMetres: 3, lines: [[at(200, 200), at(300, 300)]]},
    {layer: 'roads', kind: 'line', value: 'bridge', bridge: true, widthMetres: 8, lines: [[at(10, 70), at(30, 70), at(60, 70)]]},
  ];

  it('clips lines to the image', () => {
    const runs = clipToImage(Float64Array.from([-5, 5, 15, 25]), Float64Array.from([5, 5, 5, 5]), 20, 10);
    expect(runs).toHaveLength(1);
    expect(runs[0].xs[0]).toBe(0);
    expect(runs[0].xs[runs[0].xs.length - 1]).toBe(20);
  });

  it('builds splines with heights, skipping lines outside', () => {
    const splines = buildSplines(features, grid, heights, ['roads', 'rivers']);
    expect(splines).toHaveLength(2);
    const road = splines[0];
    expect(road.name).toBe('Main "Street"');
    // Simplified to the corner points
    expect(road.points.length / 3).toBeLessThanOrEqual(4);
    expect(road.points[2]).toBeCloseTo(100, 0);
    // The bridge deck is a straight line between its ends
    const bridge = splines[1];
    expect(bridge.bridge).toBe(true);
    const n = bridge.points.length / 3;
    const mid = bridge.points[Math.floor(n / 2) * 3 + 2];
    expect(mid).toBeGreaterThan(bridge.points[2]);
    expect(bridge.points[(n - 1) * 3 + 2] - bridge.points[2]).toBeGreaterThan(40);
    expect(mid).toBeLessThanOrEqual(bridge.points[(n - 1) * 3 + 2]);
  });

  it('writes CSV, GeoJSON and scripts', () => {
    const splines = buildSplines(features, grid, heights, ['roads']);
    const g = {width: grid.width, height: grid.height, metresPerPixelX: 2, metresPerPixelY: 2};
    const csv = splinesToCsv(splines, g).trim().split('\n');
    expect(csv[0]).toMatch(/^spline_id,layer,kind/);
    expect(csv[1]).toContain('"Main ""Street"""');
    const geo = JSON.parse(splinesToGeoJson(splines, grid));
    expect(geo.features[0].geometry.coordinates[0]).toHaveLength(3);
    expect(splinesBlenderScript(splines, g, 'x')).toContain('bpy.data.curves.new');
    const ue = splinesUnrealScript(splines, 'x');
    expect(ue).toContain('unreal.SplineComponent');
    expect(ue).toContain('SPLINES = [');
  });
});

describe('painter', () => {
  it('round-trips settings through the share link encoding', () => {
    const settings = {enabled: true, ...JSON.parse(JSON.stringify(PAINT_PRESETS[0].settings))};
    settings.rules[0].name = 'Wet ~ | 100% rock';
    const back = decodePaint(encodePaint(settings));
    expect(back.rules).toEqual(settings.rules);
    expect(back.baseName).toBe(settings.baseName);
    expect(decodePaint('').enabled).toBe(false);
    // And survives the URL hash
    const hash = buildHash({paint: encodePaint(settings)});
    expect(decodePaint(parseHash(hash).paint!).rules[0].name).toBe('Wet ~ | 100% rock');
  });

  it('makes weightmaps that add up to 255 with rules in priority order', () => {
    const w = 10, h = 10;
    const heights = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) heights[y * w + x] = x < 5 ? 100 : 3000;
    const osm = new Uint8Array(w * h);
    osm[0] = 255;
    const settings = {
      enabled: true, baseName: 'Grass', baseColor: '#00ff00', heightBlend: 1, slopeBlend: 1,
      rules: [
        {...blankRule('Water', '#0000ff'), osm: 'water', noise: 0},
        {...blankRule('Snow', '#ffffff'), minHeight: 2000, noise: 0},
      ],
    };
    const result = paintTerrain(heights, w, h, {x: 1000, y: 1000}, settings, {water: osm});
    expect(result.maps.map(m => m.name)).toEqual(['paint_01_water', 'paint_02_snow', 'paint_03_grass']);
    for (let i = 0; i < w * h; i++) {
      expect(result.maps.reduce((s, m) => s + m.data[i], 0)).toBe(255);
    }
    expect(result.maps[0].data[0]).toBe(255);
    expect(result.maps[1].data[9]).toBe(255);
    expect(result.maps[2].data[w + 2]).toBe(255);
    expect(softRange(5, 5, null, 2)).toBeCloseTo(0.5, 5);
  });
});

describe('scatter', () => {
  it('round-trips sets', () => {
    const sets = [blankScatter('Pines', 'osm:forest'), {...blankScatter('Rocks', 'paint:2'), mesh: '/Game/Rock.Rock'}];
    expect(decodeScatter(encodeScatter(sets))).toEqual(sets);
  });

  it('places points at about the right density and never too close', () => {
    const w = 200, h = 200, mpp = {x: 1, y: 1};
    const heights = new Float32Array(w * h);
    const slope = new Float32Array(w * h);
    const set = {...blankScatter('Trees', 'all'), density: 100, spacing: 3};
    const pts = scatterPoints(heights, null, slope, w, h, mpp, set, 7);
    // 4 ha at 100 per ha
    expect(pts.count).toBeGreaterThan(300);
    expect(pts.count).toBeLessThan(460);
    for (let i = 0; i < Math.min(pts.count, 150); i++) {
      for (let j = i + 1; j < pts.count; j++) {
        const d = Math.hypot(pts.data[i * 5] - pts.data[j * 5], pts.data[i * 5 + 1] - pts.data[j * 5 + 1]);
        expect(d).toBeGreaterThanOrEqual(3 * 0.8 - 1e-6);
      }
    }
    const none = scatterPoints(heights, new Float32Array(w * h), slope, w, h, mpp, set, 7);
    expect(none.count).toBe(0);
    const steep = scatterPoints(heights, null, new Float32Array(w * h).fill(80), w, h, mpp, set, 7);
    expect(steep.count).toBe(0);
    expect(scatterUnrealScript([{set, points: pts}], 'x')).toContain('HierarchicalInstancedStaticMeshComponent');
  });
});

describe('buildings', () => {
  it('triangulates convex and concave footprints', () => {
    expect(triangulate(Float64Array.from([0, 0, 1, 0, 1, 1, 0, 1]))).toHaveLength(6);
    const ell = Float64Array.from([0, 0, 2, 0, 2, 1, 1, 1, 1, 2, 0, 2]);
    expect(triangulate(ell)).toHaveLength(12);
  });

  it('extrudes footprints onto the terrain with roofs facing up', () => {
    const input = {heights: new Float32Array(100 * 80).fill(10), width: 100, height: 80, physWidth: 100 * MPP, physHeight: 80 * MPP};
    const mesh = buildMesh(input, {...defaultMeshOptions, scale: 'real', solid: false, resolution: 100});
    const feature: OsmFeature = {layer: 'buildings', kind: 'area', heightMetres: 12, rings: [[at(10, 10), at(20, 10), at(20, 20), at(10, 20), at(10, 10)]]};
    const fps = buildingFootprints([feature], {...grid}, 8);
    expect(fps).toHaveLength(1);
    const {mesh: out, count} = appendBuildings(mesh, input, fps, {unitsPerMetre: 1, exaggeration: 1, base: 0, minHeight: 10});
    expect(count).toBe(1);
    const added = out.indices.slice(mesh.indices.length);
    // Two roof triangles first; check one faces up
    const p = out.positions;
    const [a, b, c] = [added[0], added[1], added[2]];
    const nz = (p[b * 3] - p[a * 3]) * (p[c * 3 + 1] - p[a * 3 + 1]) - (p[b * 3 + 1] - p[a * 3 + 1]) * (p[c * 3] - p[a * 3]);
    expect(nz).toBeGreaterThan(0);
    expect(p[a * 3 + 2]).toBeCloseTo(12, 5);
  });
});

describe('analysis', () => {
  it('sees everything on flat ground and nothing behind a wall', () => {
    const w = 40, h = 40;
    const flat = new Float32Array(w * h);
    const open = viewshed(flat, w, h, {x: 10, y: 10}, {x: 20, y: 20, observerHeight: 2, targetHeight: 0, radius: 6371000});
    expect(open.fraction).toBe(1);
    const walled = new Float32Array(w * h);
    for (let y = 0; y < h; y++) walled[y * w + 25] = 100;
    const blocked = viewshed(walled, w, h, {x: 10, y: 10}, {x: 20, y: 20, observerHeight: 2, targetHeight: 0, radius: 6371000});
    expect(blocked.visible[20 * w + 35]).toBe(0);
    expect(blocked.visible[20 * w + 10]).toBe(255);
  });

  it('gives south-facing slopes more sun than north-facing ones (northern hemisphere)', () => {
    const w = 24, h = 24;
    const heights = new Float32Array(w * h);
    // A ridge along the middle: north half slopes down to the north, south half down to the south
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) heights[y * w + x] = 300 - Math.abs(y - 12) * 25;
    const sun = annualInsolation(heights, w, h, {x: 50, y: 50}, {latitude: 46, longitude: 7, year: 2026, stepHours: 2});
    const northFacing = sun.data[4 * w + 12], southFacing = sun.data[20 * w + 12];
    expect(southFacing).toBeGreaterThan(northFacing * 1.3);
    expect(sun.flatReference).toBeGreaterThan(1000);
  });
});

describe('poster', () => {
  it('renders an opaque map of the requested size', () => {
    const heights = new Float32Array(16 * 16).map((_, i) => (i % 16) * 10);
    const rgba = renderPosterMap(heights, 16, 16, {style: 'classic', width: 40, height: 30, mpp: {x: 30, y: 30}, zFactor: 1.5, contourInterval: 20, waterLevel: null});
    expect(rgba.length).toBe(40 * 30 * 4);
    for (let i = 3; i < rgba.length; i += 4) expect(rgba[i]).toBe(255);
  });

  it('picks round scale bars and page orientation', () => {
    expect(niceDistance(3300)).toBe(2000);
    expect(niceDistance(4000)).toBe(5000);
    expect(niceDistance(1200)).toBe(1000);
    const portrait = pagePixels('a4', 100, 0.8);
    const landscape = pagePixels('a4', 100, 1.6);
    expect(portrait.height).toBeGreaterThan(portrait.width);
    expect(landscape.width).toBeGreaterThan(landscape.height);
  });
});

describe('print3d', () => {
  const input = {heights: new Float32Array(30 * 30).map((_, i) => (i % 30) * 10), width: 30, height: 30, physWidth: 3000, physHeight: 3000};

  it('stacks colour bands exactly on top of each other', () => {
    const bands = bandMeshes(input, {...defaultMeshOptions, resolution: 30, simplify: 0}, [100, 200]);
    expect(bands).toHaveLength(3);
    expect(bands[0].floorZ).toBe(0);
    // Band 1's floor is band 0's flat top
    let top0 = -Infinity;
    for (let v = 0; v < bands[0].mesh.topVertexCount; v++) top0 = Math.max(top0, bands[0].mesh.positions[v * 3 + 2]);
    expect(bands[1].floorZ).toBeCloseTo(top0, 4);
    const xml = threeMfModel(bands.map((b, i) => ({name: `Band ${i}`, color: '#112233', mesh: b.mesh})), 'Test & <title>');
    expect(xml).toContain('<basematerials id="1">');
    expect((xml.match(/<object /g) || []).length).toBe(4);
    expect(xml).toContain('<component objectid="4"/>');
    expect(xml).not.toContain('<title>');
  });

  it('makes a label from pixel-font boxes', () => {
    expect(labelText('Mönch & Co.!')).toBe('MONCH & CO.');
    const boxes = labelBoxes({lines: ['AB'], sizeX: 100, sizeY: 100, depth: 12, height: 2, relief: 0.8});
    expect(boxes.length).toBeGreaterThan(5);
    expect(boxes[0][1]).toBeCloseTo(-62, 6);
    const mesh = boxesMesh(boxes, buildMesh(input, {...defaultMeshOptions, resolution: 10}));
    expect(mesh.indices.length).toBe(boxes.length * 36);
  });

  it('turns hillshade into lithophane thickness within the limits', () => {
    const t = lithophaneThickness(input.heights, 30, 30, {x: 100, y: 100}, 0.8, 3);
    for (const v of Array.from(t)) {
      expect(v).toBeGreaterThanOrEqual(0.8 - 1e-6);
      expect(v).toBeLessThanOrEqual(3 + 1e-6);
    }
  });
});

describe('land + sea', () => {
  it('uses the sea floor where the land model shows flat sea', () => {
    const land = Float32Array.from([0, 0.3, 5, -30]);
    const sea = Float32Array.from([-120, -40, -10, -200]);
    const out = blendLandSea(land, sea);
    expect(out[0]).toBe(-120);
    expect(out[1]).toBeLessThan(0);
    expect(out[2]).toBe(5);
    expect(out[3]).toBe(-30);
  });
});
