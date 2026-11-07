import {resampleGrid, rtinLayout, simplifyGrid, SimplifiedSurface} from '../src/mesh-simplify';

const makeGrid = (width: number, height: number, fn: (x: number, y: number) => number) => {
  const heights = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) heights[y * width + x] = fn(x, y);
  }
  return heights;
};

/** Deterministic fractal (value-noise fBm) terrain, roughly `relief` metres tall. */
const fractalTerrain = (width: number, height: number, relief: number, seed = 1) => {
  let s = seed >>> 0;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const lattice = new Float32Array(257 * 257).map(() => rand());
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const at = (i: number, j: number) => lattice[((j & 255) * 257) + (i & 255)];
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * sx;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * sx;
    return a + (b - a) * sy;
  };
  const size = Math.max(width, height);
  return makeGrid(width, height, (x, y) => {
    let h = 0, amp = 1, freq = 4 / size;
    for (let o = 0; o < 9; o++) {
      h += amp * noise(x * freq, y * freq);
      amp *= 0.5;
      freq *= 2;
    }
    return h * relief / 2;
  });
};

const triArea = (s: SimplifiedSurface, i: number) => {
  const [a, b, c] = [s.indices[i], s.indices[i + 1], s.indices[i + 2]];
  return ((s.u[b] - s.u[a]) * (s.v[c] - s.v[a]) - (s.u[c] - s.u[a]) * (s.v[b] - s.v[a])) / 2;
};

/** Largest |surface - grid| over every grid sample, found by rasterising each triangle with barycentrics. */
const maxGridError = (s: SimplifiedSurface, h: Float32Array, gw: number, gh: number) => {
  let worst = 0;
  const covered = new Uint8Array(gw * gh);
  for (let i = 0; i < s.indices.length; i += 3) {
    const [a, b, c] = [s.indices[i], s.indices[i + 1], s.indices[i + 2]];
    const P = [a, b, c].map(k => [s.u[k] * (gw - 1), s.v[k] * (gh - 1), s.heights[k]]);
    const det = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1]);
    const x0 = Math.round(Math.min(P[0][0], P[1][0], P[2][0])), x1 = Math.round(Math.max(P[0][0], P[1][0], P[2][0]));
    const y0 = Math.round(Math.min(P[0][1], P[1][1], P[2][1])), y1 = Math.round(Math.max(P[0][1], P[1][1], P[2][1]));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const w1 = ((x - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (y - P[0][1])) / det;
        const w2 = ((P[1][0] - P[0][0]) * (y - P[0][1]) - (x - P[0][0]) * (P[1][1] - P[0][1])) / det;
        const w0 = 1 - w1 - w2;
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
        const z = w0 * P[0][2] + w1 * P[1][2] + w2 * P[2][2];
        worst = Math.max(worst, Math.abs(z - h[y * gw + x]));
        covered[y * gw + x] = 1;
      }
    }
  }
  return {worst, allCovered: covered.every(c => c === 1)};
};

/** Interior edges must appear exactly twice in opposite directions; the rest must lie on the rectangle's border. */
const isConforming = (s: SimplifiedSurface) => {
  const edges = new Map<string, number>();
  for (let i = 0; i < s.indices.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const key = `${s.indices[i + k]}>${s.indices[i + (k + 1) % 3]}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  const onBorder = (a: number, b: number) =>
    (s.u[a] === 0 && s.u[b] === 0) || (s.u[a] === 1 && s.u[b] === 1) ||
    (s.v[a] === 0 && s.v[b] === 0) || (s.v[a] === 1 && s.v[b] === 1);
  let boundaryEdges = 0;
  for (const [edge, count] of Array.from(edges.entries())) {
    if (count !== 1) return false;
    const [a, b] = edge.split('>').map(Number);
    if (!edges.has(`${b}>${a}`)) {
      if (!onBorder(a, b)) return false;
      boundaryEdges++;
    }
  }
  return boundaryEdges === s.perimeter.length;
};

describe('mesh simplification (RTIN)', () => {
  test('layout covers the grid with power-of-two tiles and little upsampling', () => {
    expect(rtinLayout(513, 513)).toEqual({tileSize: 512, tilesX: 1, tilesY: 1, gridWidth: 513, gridHeight: 513});
    expect(rtinLayout(1009, 505)).toMatchObject({tileSize: 512, tilesX: 2, tilesY: 1, gridWidth: 1025, gridHeight: 513});
    expect(rtinLayout(512, 256)).toMatchObject({gridWidth: 513, gridHeight: 257});
    for (const [w, h] of [[258, 258], [2, 2], [9, 7], [300, 37]]) {
      const l = rtinLayout(w, h);
      expect(l.gridWidth).toBeGreaterThanOrEqual(w);
      expect(l.gridHeight).toBeGreaterThanOrEqual(h);
      expect((l.gridWidth - 1) * (l.gridHeight - 1) / ((w - 1) * (h - 1))).toBeLessThan(2);
    }
  });

  test('resampling keeps the corners and is exact for linear ramps', () => {
    const src = makeGrid(7, 5, (x, y) => 3 * x + 2 * y);
    const out = resampleGrid(src, 7, 5, 9, 9);
    expect(out[0]).toBeCloseTo(0);
    expect(out[8]).toBeCloseTo(18);
    expect(out[80]).toBeCloseTo(26);
    expect(out[4 * 9 + 4]).toBeCloseTo(3 * 3 + 2 * 2);
  });

  test('flat terrain collapses to two triangles', () => {
    const s = simplifyGrid(new Float32Array(513 * 513).fill(42), 513, 513, 0.01);
    expect(s.indices.length / 3).toBe(2);
    expect(s.u.length).toBe(4);
    expect(Array.from(s.heights)).toEqual([42, 42, 42, 42]);
    expect(isConforming(s)).toBe(true);
  });

  test('a tilted plane also collapses, even with zero tolerance', () => {
    const s = simplifyGrid(makeGrid(257, 257, (x, y) => x * 0.5 - y * 0.25), 257, 257, 0);
    expect(s.indices.length / 3).toBe(2);
  });

  test('smooth terrain needs far fewer triangles and stays within tolerance everywhere', () => {
    const n = 513;
    const h = makeGrid(n, n, (x, y) => 500 * Math.exp(-((x - 200) ** 2 + (y - 300) ** 2) / 20000) + 0.2 * x);
    const tolerance = 0.5;
    const s = simplifyGrid(h, n, n, tolerance);
    const full = (n - 1) * (n - 1) * 2;
    expect(s.indices.length / 3).toBeLessThan(full * 0.05);
    const {worst, allCovered} = maxGridError(s, h, n, n);
    expect(allCovered).toBe(true);
    expect(worst).toBeLessThanOrEqual(tolerance + 1e-4);
    expect(isConforming(s)).toBe(true);
  });

  test('rough terrain: error bound, no cracks, upward faces, area adds up', () => {
    const n = 257;
    const h = fractalTerrain(n, n, 300, 7);
    for (const tolerance of [0.5, 3, 20]) {
      const s = simplifyGrid(h, n, n, tolerance);
      expect(maxGridError(s, h, n, n).worst).toBeLessThanOrEqual(tolerance + 1e-3);
      expect(isConforming(s)).toBe(true);
      let area = 0;
      for (let i = 0; i < s.indices.length; i += 3) {
        // grid rows run north->south, so anticlockwise from above is a negative area here
        expect(triArea(s, i)).toBeLessThan(0);
        area -= triArea(s, i);
      }
      expect(area).toBeCloseTo(1, 6);
    }
  });

  test('random points: surface matches the barycentric interpolation of their triangle', () => {
    const n = 129;
    const h = fractalTerrain(n, n, 100, 3);
    const tolerance = 1;
    const s = simplifyGrid(h, n, n, tolerance);
    let seed = 99;
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let k = 0; k < 300; k++) {
      const gx = Math.floor(rand() * n), gy = Math.floor(rand() * n);
      const px = gx / (n - 1), py = gy / (n - 1);
      let found = false;
      for (let i = 0; i < s.indices.length && !found; i += 3) {
        const [a, b, c] = [s.indices[i], s.indices[i + 1], s.indices[i + 2]];
        const det = (s.u[b] - s.u[a]) * (s.v[c] - s.v[a]) - (s.u[c] - s.u[a]) * (s.v[b] - s.v[a]);
        const w1 = ((px - s.u[a]) * (s.v[c] - s.v[a]) - (s.u[c] - s.u[a]) * (py - s.v[a])) / det;
        const w2 = ((s.u[b] - s.u[a]) * (py - s.v[a]) - (px - s.u[a]) * (s.v[b] - s.v[a])) / det;
        if (w1 < -1e-6 || w2 < -1e-6 || w1 + w2 > 1 + 1e-6) continue;
        const z = (1 - w1 - w2) * s.heights[a] + w1 * s.heights[b] + w2 * s.heights[c];
        expect(Math.abs(z - h[gy * n + gx])).toBeLessThanOrEqual(tolerance + 1e-3);
        found = true;
      }
      expect(found).toBe(true);
    }
  });

  test('non-square grids cover exactly the input rectangle', () => {
    const w = 1009, hgt = 505;
    const h = fractalTerrain(w, hgt, 200, 11);
    const s = simplifyGrid(h, w, hgt, 2);
    expect(s.gridWidth).toBe(1025);
    expect(s.gridHeight).toBe(513);
    expect(Math.min(...Array.from(s.u))).toBe(0);
    expect(Math.max(...Array.from(s.u))).toBe(1);
    expect(Math.min(...Array.from(s.v))).toBe(0);
    expect(Math.max(...Array.from(s.v))).toBe(1);
    expect(isConforming(s)).toBe(true);
    let area = 0;
    for (let i = 0; i < s.indices.length; i += 3) area -= triArea(s, i);
    expect(area).toBeCloseTo(1, 6);
    // corners keep the input's corner heights
    const corner = (u: number, v: number) => {
      for (let i = 0; i < s.u.length; i++) if (s.u[i] === u && s.v[i] === v) return s.heights[i];
      return NaN;
    };
    expect(corner(0, 0)).toBeCloseTo(h[0]);
    expect(corner(1, 0)).toBeCloseTo(h[w - 1]);
    expect(corner(0, 1)).toBeCloseTo(h[(hgt - 1) * w]);
    expect(corner(1, 1)).toBeCloseTo(h[w * hgt - 1]);
    // within tolerance of the resampled grid it was built on
    const resampled = resampleGrid(h, w, hgt, s.gridWidth, s.gridHeight);
    expect(maxGridError(s, resampled, s.gridWidth, s.gridHeight).worst).toBeLessThanOrEqual(2 + 1e-3);
  });

  test('perimeter runs anticlockwise from the south-west corner', () => {
    const s = simplifyGrid(fractalTerrain(65, 33, 50, 5), 65, 33, 1);
    const p = Array.from(s.perimeter);
    expect(s.u[p[0]]).toBe(0);
    expect(s.v[p[0]]).toBe(1);
    expect(new Set(p).size).toBe(p.length);
    // signed area of the rim polygon in (u, -v) is positive => anticlockwise from above
    let area = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      area += s.u[a] * -s.v[b] - s.u[b] * -s.v[a];
    }
    expect(area / 2).toBeCloseTo(1, 6);
  });
});
