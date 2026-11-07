import {
  contourLayerSvgs,
  contourLevels,
  contoursToDxf,
  contoursToSvg,
  dxfLayerName,
  ringSignedArea,
  simplifyContours,
  simplifyPolyline,
  smoothHeights,
  traceContours,
} from '../src/contours';

const grid = (width: number, height: number, fn: (x: number, y: number) => number) => {
  const data = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[y * width + x] = fn(x, y);
    }
  }
  return data;
};

/** Cone peaking at 100 m in the middle, falling 1 m per pixel. */
const cone = (size: number, cx = (size - 1) / 2, cy = (size - 1) / 2) =>
  grid(size, size, (x, y) => 100 - Math.hypot(x - cx, y - cy));

const radii = (points: Float32Array, cx: number, cy: number) => {
  const out: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    out.push(Math.hypot(points[i] - cx, points[i + 1] - cy));
  }
  return out;
};

describe('contourLevels', () => {
  test('multiples strictly above min and up to max', () => {
    expect(contourLevels(0, 100, 25)).toEqual([25, 50, 75, 100]);
    expect(contourLevels(-12, 31, 10)).toEqual([-10, 0, 10, 20, 30]);
  });

  test('base offsets the levels', () => {
    expect(contourLevels(0, 30, 10, 5)).toEqual([5, 15, 25]);
  });

  test('no float drift and no levels for bad input', () => {
    expect(contourLevels(0, 0.35, 0.1)).toEqual([0.1, 0.2, 0.3]);
    expect(contourLevels(0, 10, 0)).toEqual([]);
    expect(contourLevels(10, 0, 1)).toEqual([]);
  });
});

describe('smoothHeights', () => {
  test('flattens a spike, keeps flat ground and returns a new array', () => {
    const h = grid(5, 5, (x, y) => (x === 2 && y === 2 ? 16 : 0));
    const s = smoothHeights(h, 5, 5, 1);
    expect(s).not.toBe(h);
    expect(h[12]).toBe(16);
    expect(s[12]).toBeCloseTo(4);
    expect(s[0]).toBe(0);
    expect(smoothHeights(grid(3, 3, () => 7), 3, 3, 3).every(v => Math.abs(v - 7) < 1e-5)).toBe(true);
  });
});

describe('traceContours', () => {
  test('a cone gives one stitched circular ring per level at the right radius', () => {
    const size = 41;
    const c = (size - 1) / 2;
    const contours = traceContours(cone(size), size, size, [90, 95], {closed: false});
    expect(contours.map(k => k.level)).toEqual([90, 95]);
    for (const [k, r] of [[0, 10], [1, 5]]) {
      expect(contours[k].rings).toHaveLength(1);
      const ring = contours[k].rings[0];
      expect(ring.closed).toBe(true);
      for (const d of radii(ring.points, c, c)) {
        // Linear interpolation along cell edges of a cone is close to exact
        expect(Math.abs(d - r)).toBeLessThan(0.1);
      }
    }
  });

  test('closed rings run clockwise on screen (positive area) and enclose the high ground', () => {
    const size = 41;
    const [contour] = traceContours(cone(size), size, size, [90], {closed: true});
    const area = ringSignedArea(contour.rings[0].points);
    expect(area).toBeGreaterThan(0);
    expect(area).toBeCloseTo(Math.PI * 100, -1);
  });

  test('a pit gives a ring with negative area', () => {
    const size = 21;
    const h = grid(size, size, (x, y) => Math.hypot(x - 10, y - 10));
    const [contour] = traceContours(h, size, size, [5], {closed: true});
    const areas = contour.rings.map(r => ringSignedArea(r.points)).sort((a, b) => a - b);
    // The hole around the pit plus the outer border of the whole raster
    expect(areas).toHaveLength(2);
    expect(areas[0]).toBeLessThan(0);
    expect(areas[0]).toBeCloseTo(-Math.PI * 25, -1);
    expect(areas[1]).toBeCloseTo(20 * 20, 0);
  });

  test('a hill clipped by the border stays open in lines mode but closes in layers mode', () => {
    const size = 21;
    // Peak in the top-left corner
    const h = cone(size, 0, 0);
    const [open] = traceContours(h, size, size, [90], {closed: false});
    expect(open.rings).toHaveLength(1);
    expect(open.rings[0].closed).toBe(false);
    const p = open.rings[0].points;
    // Ends on the top and left borders
    const ends = [[p[0], p[1]], [p[p.length - 2], p[p.length - 1]]];
    expect(ends.some(([x, y]) => Math.abs(y) < 1e-6 && Math.abs(x - 10) < 0.01)).toBe(true);
    expect(ends.some(([x, y]) => Math.abs(x) < 1e-6 && Math.abs(y - 10) < 0.01)).toBe(true);

    const [closed] = traceContours(h, size, size, [90], {closed: true});
    expect(closed.rings).toHaveLength(1);
    expect(closed.rings[0].closed).toBe(true);
    // Quarter disc of radius 10
    expect(ringSignedArea(closed.rings[0].points)).toBeCloseTo(Math.PI * 100 / 4, -1);
    const xs = closed.rings[0].points.filter((_, i) => i % 2 === 0);
    expect(Math.min(...Array.from(xs))).toBe(0);
  });

  test('every ring is closed in layers mode even when terrain runs off all sides', () => {
    const size = 64;
    const h = grid(size, size, (x, y) => 50 + 30 * Math.sin(x / 7) * Math.cos(y / 9) + x * 0.5);
    const contours = traceContours(h, size, size, contourLevels(0, 120, 10), {closed: true});
    const rings = contours.reduce((all, c) => all.concat(c.rings), []);
    expect(rings.length).toBeGreaterThan(5);
    expect(rings.every(r => r.closed)).toBe(true);
  });

  test('saddle: centre average decides whether diagonal highs connect', () => {
    // 2x2 grid: high on the tl/br diagonal
    const high = new Float32Array([10, 0, 0, 10]);
    const [joined] = traceContours(high, 2, 2, [4], {closed: false});
    // Centre 5 >= 4: one band, two separate lines cutting off the low corners
    expect(joined.rings).toHaveLength(2);
    const [split] = traceContours(high, 2, 2, [6], {closed: false});
    expect(split.rings).toHaveLength(2);

    // Bigger grid, two peaks joined by a ridge just under/above the level
    const twin = (ridge: number) => grid(5, 3, (x, y) => {
      if (y !== 1) return 0;
      return x === 1 || x === 3 ? 10 : x === 2 ? ridge : 0;
    });
    expect(traceContours(twin(8), 5, 3, [5], {closed: true})[0].rings).toHaveLength(1);
    expect(traceContours(twin(2), 5, 3, [5], {closed: true})[0].rings).toHaveLength(2);
  });

  test('separate hills give one ring each', () => {
    const size = 60;
    const h = grid(size, size, (x, y) => Math.max(
      0,
      40 - Math.hypot(x - 15, y - 15),
      40 - Math.hypot(x - 45, y - 40),
    ));
    const [c] = traceContours(h, size, size, [30], {closed: false});
    expect(c.rings).toHaveLength(2);
    expect(c.rings.every(r => r.closed)).toBe(true);
  });

  test('1024² terrain with 20 levels is quick', () => {
    const size = 1024;
    const h = grid(size, size, (x, y) =>
      500 + 200 * Math.sin(x / 61) * Math.cos(y / 47) + 80 * Math.sin((x + y) / 13) + 20 * Math.cos(x / 3.1 - y / 5.3));
    const levels = contourLevels(150, 850, 35);
    expect(levels.length).toBe(20);
    const t0 = Date.now();
    const contours = traceContours(h, size, size, levels, {closed: false});
    const simplified = simplifyContours(contours, 0.25);
    const elapsed = Date.now() - t0;
    const count = (cs: typeof contours) => cs.reduce((n, c) => n + c.rings.reduce((m, r) => m + r.points.length / 2, 0), 0);
    expect(count(contours)).toBeGreaterThan(10000);
    expect(count(simplified)).toBeLessThan(count(contours));
    expect(elapsed).toBeLessThan(5000);
  });
});

describe('simplifyPolyline', () => {
  test('drops collinear points but keeps the endpoints', () => {
    const line = new Float32Array([0, 0, 1, 0.01, 2, 0, 3, 0.02, 4, 0, 5, 3]);
    const s = simplifyPolyline(line, false, 0.25);
    expect(Array.from(s)).toEqual([0, 0, 4, 0, 5, 3]);
  });

  test('a densely sampled circle loses most points but keeps its shape', () => {
    const pts: number[] = [];
    for (let i = 0; i < 400; i++) {
      const a = (i / 400) * Math.PI * 2;
      pts.push(50 + 20 * Math.cos(a), 50 + 20 * Math.sin(a));
    }
    const ring = new Float32Array(pts);
    const s = simplifyPolyline(ring, true, 0.25);
    expect(s.length).toBeLessThan(ring.length / 4);
    expect(s[0]).toBe(ring[0]);
    expect(s[1]).toBe(ring[1]);
    expect(Math.abs(ringSignedArea(s) - ringSignedArea(ring)) / ringSignedArea(ring)).toBeLessThan(0.02);
  });

  test('a long polyline does not overflow the stack', () => {
    const n = 200000;
    const pts = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      pts[i * 2] = i;
      pts[i * 2 + 1] = (i % 2) * 0.5;
    }
    expect(simplifyPolyline(pts, false, 0.1).length).toBe(pts.length);
  });
});

describe('writers', () => {
  const size = 41;
  // The 100 m peak is a single sample, so it has no ring
  const levels = [80, 85, 90, 95];
  const lines = simplifyContours(traceContours(cone(size), size, size, levels, {closed: false}));
  const layers = simplifyContours(traceContours(cone(size), size, size, levels, {closed: true}));

  test('SVG lines: physical size, one Inkscape layer per level, thicker majors', () => {
    const svg = contoursToSvg(lines, {width: size, height: size, outputWidthMm: 200, mode: 'lines', majorEvery: 4, interval: 5, title: 'A & B'});
    expect(svg.startsWith('<?xml')).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"');
    expect(svg).toContain('width="200mm" height="200mm" viewBox="0 0 200 200"');
    expect(svg.match(/inkscape:groupmode="layer"/g)).toHaveLength(levels.length);
    expect(svg).toContain('<g id="level_85m" inkscape:groupmode="layer" inkscape:label="85 m">');
    expect(svg).toContain('<title>A &amp; B</title>');
    // Only 80 is a multiple of 20
    expect(svg.match(/stroke-width="0.375"/g)).toHaveLength(1);
    expect(svg.match(/stroke-width="0.15"/g)).toHaveLength(3);
    expect(svg.match(/<g /g).length).toBe(svg.match(/<\/g>/g).length);
    // No more than 3 decimals anywhere in path data
    expect(/\d\.\d{4}/.test(svg)).toBe(false);
  });

  test('SVG layers: red hairline outlines, no fill', () => {
    const svg = contoursToSvg(layers, {width: size, height: size, outputWidthMm: 100, mode: 'layers'});
    expect(svg.match(/stroke="#ff0000"/g)).toHaveLength(levels.length);
    expect(svg).toContain('fill="none" fill-rule="evenodd"');
    expect(svg).not.toContain('stroke="#000000"');
  });

  test('layer sheets: one SVG per non-empty level with registration marks', () => {
    const sheets = contourLayerSvgs(layers, {width: size, height: size, outputWidthMm: 100});
    expect(sheets.map(s => s.name)).toEqual(['layer_01_80m.svg', 'layer_02_85m.svg', 'layer_03_90m.svg', 'layer_04_95m.svg']);
    expect(sheets[0].svg).toContain('id="registration"');
    expect(sheets[0].svg).toContain('id="next_level"');
    expect(sheets[sheets.length - 1].svg).not.toContain('id="next_level"');
    const plain = contourLayerSvgs(layers, {width: size, height: size, outputWidthMm: 100, registrationMarks: false});
    expect(plain[0].svg).not.toContain('registration');
  });

  test('DXF: R12 structure, layers, vertices in metres with north up', () => {
    const dxf = contoursToDxf(lines, {width: size, height: size, physWidth: 4000, physHeight: 4000, interval: 5, majorEvery: 4});
    const rows = dxf.trim().split('\n');
    expect(rows.length % 2).toBe(0);
    const pairs: [string, string][] = [];
    for (let i = 0; i < rows.length; i += 2) pairs.push([rows[i].trim(), rows[i + 1]]);
    const values = (code: string) => pairs.filter(p => p[0] === code).map(p => p[1]);

    expect(values('0').filter(v => v === 'SECTION')).toHaveLength(3);
    expect(values('0').filter(v => v === 'ENDSEC')).toHaveLength(3);
    expect(pairs[pairs.length - 1]).toEqual(['0', 'EOF']);
    expect(dxf).toContain('$ACADVER\n1\nAC1009');
    expect(dxf).toContain('$INSUNITS\n70\n6');
    expect(dxf).toContain('$EXTMAX\n10\n4000\n20\n4000');

    const layerNames = pairs.filter((p, i) => p[0] === '2' && pairs[i - 1][1] === 'LAYER').map(p => p[1]);
    expect(layerNames).toEqual(['0', 'CONTOUR_0080', 'CONTOUR_0085', 'CONTOUR_0090', 'CONTOUR_0095']);

    const ringCount = lines.reduce((n, c) => n + c.rings.length, 0);
    const vertexCount = lines.reduce((n, c) => n + c.rings.reduce((m, r) => m + r.points.length / 2, 0), 0);
    expect(values('0').filter(v => v === 'POLYLINE')).toHaveLength(ringCount);
    expect(values('0').filter(v => v === 'SEQEND')).toHaveLength(ringCount);
    expect(values('0').filter(v => v === 'VERTEX')).toHaveLength(vertexCount);

    // The 90 m ring is centred on the middle of the 4 km square
    const xs = values('10').map(Number).filter(v => v > 0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(4000);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
  });

  test('DXF flips rows so +y is north', () => {
    const contours = [{level: 7, rings: [{closed: false, points: new Float32Array([0, 0, 10, 10])}]}];
    const dxf = contoursToDxf(contours, {width: 11, height: 11, physWidth: 100, physHeight: 50});
    // Pixel (0,0) is the north-west corner: x=0, y=50; pixel (10,10) is south-east: x=100, y=0
    expect(dxf).toContain('VERTEX\n8\nCONTOUR_0007\n10\n0\n20\n50\n30\n7');
    expect(dxf).toContain('VERTEX\n8\nCONTOUR_0007\n10\n100\n20\n0\n30\n7');
  });

  test('layer names cover negative and fractional levels', () => {
    expect(dxfLayerName(123)).toBe('CONTOUR_0123');
    expect(dxfLayerName(-12)).toBe('CONTOUR_M0012');
    expect(dxfLayerName(12.5)).toBe('CONTOUR_0012_5');
    expect(dxfLayerName(12345)).toBe('CONTOUR_12345');
  });
});

describe('autoContourInterval', () => {
  // Lives in the worker module, but is pure
  const {autoContourInterval} = require('../src/processor-helpers');
  test('picks round intervals giving about 20 levels', () => {
    expect(autoContourInterval(3300)).toBe(200);
    expect(autoContourInterval(100)).toBe(5);
    expect(autoContourInterval(45)).toBe(2.5);
    expect(autoContourInterval(0)).toBe(1);
  });
});
