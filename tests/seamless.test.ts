import {Fft, edgeMismatch, makeSeamless, minCostSeam, mirrorTile, periodicComponent, seamlessMargin} from '../src/seamless';

const naiveDft = (re: number[], im: number[], inverse = false) => {
  const n = re.length;
  const outRe: number[] = [], outIm: number[] = [];
  for (let k = 0; k < n; k++) {
    let sr = 0, si = 0;
    for (let t = 0; t < n; t++) {
      const a = (inverse ? 2 : -2) * Math.PI * k * t / n;
      sr += re[t] * Math.cos(a) - im[t] * Math.sin(a);
      si += re[t] * Math.sin(a) + im[t] * Math.cos(a);
    }
    outRe.push(sr);
    outIm.push(si);
  }
  return {outRe, outIm};
};

/** Smooth, bumpy pseudo-terrain with a strong tilt, so the edges don't match. */
const terrain = (w: number, h: number, tilt = 3) => {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[y * w + x] = tilt * x + 2 * y + 40 * Math.sin(x / 7) * Math.cos(y / 5) + 15 * Math.sin((x + 2 * y) / 3.3);
    }
  }
  return out;
};

/** Mean jump across the wrap divided by the mean step between neighbours inside. */
const wrapRatio = (h: Float32Array, w: number, rows: number) => {
  let wrap = 0, inner = 0;
  for (let y = 0; y < rows; y++) {
    wrap += Math.abs(h[y * w] - h[y * w + w - 1]);
    inner += Math.abs(h[y * w + 1] - h[y * w]);
  }
  return wrap / inner;
};

describe('Fft', () => {
  for (const n of [1, 2, 7, 8, 12, 17]) {
    it(`matches a naive DFT for length ${n}`, () => {
      const re = Array.from({length: n}, (_, i) => Math.sin(i * 1.3) + i * 0.1);
      const im = Array.from({length: n}, (_, i) => Math.cos(i * 0.7));
      const fft = new Fft(n);
      const r = Float64Array.from(re), m = Float64Array.from(im);
      fft.transform(r, m, false);
      const expected = naiveDft(re, im);
      for (let k = 0; k < n; k++) {
        expect(r[k]).toBeCloseTo(expected.outRe[k], 8);
        expect(m[k]).toBeCloseTo(expected.outIm[k], 8);
      }
      fft.transform(r, m, true);
      for (let k = 0; k < n; k++) {
        expect(r[k] / n).toBeCloseTo(re[k], 8);
        expect(m[k] / n).toBeCloseTo(im[k], 8);
      }
    });
  }
});

describe('periodicComponent', () => {
  it('turns a tilted area into one that wraps smoothly and keeps the mean', () => {
    const w = 33, h = 21;
    const u = terrain(w, h);
    expect(wrapRatio(u, w, h)).toBeGreaterThan(5);
    const {data} = periodicComponent(u, w, h);
    expect(wrapRatio(data, w, h)).toBeLessThan(1.5);
    const mean = (a: Float32Array) => a.reduce((s, v) => s + v, 0) / a.length;
    expect(mean(data)).toBeCloseTo(mean(u), 2);
  });

  it('leaves an already periodic image alone', () => {
    const w = 16, h = 12;
    const u = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) u[y * w + x] = Math.sin(2 * Math.PI * x / w) * 10 + Math.cos(2 * Math.PI * y / h) * 5;
    const {data, maxAdjust} = periodicComponent(u, w, h);
    expect(maxAdjust).toBeLessThan(3);
    for (let i = 0; i < u.length; i += 7) expect(Math.abs(data[i] - u[i])).toBeLessThan(3);
  });
});

describe('makeSeamless', () => {
  it('mirror mode repeats edge to edge', () => {
    const w = 20, h = 12;
    const out = mirrorTile(terrain(w, h), w, h);
    for (let y = 0; y < h; y++) expect(out[y * w]).toBe(out[y * w + w - 1]);
    for (let x = 0; x < w; x++) expect(out[x]).toBe(out[(h - 1) * w + x]);
  });

  it('landscape period repeats the first row and column at the end', () => {
    const w = 25, h = 17;
    const {data} = makeSeamless(terrain(w, h), w, h, w, h, {mode: 'smooth', period: 'landscape', overlap: 0.1});
    for (let y = 0; y < h; y++) expect(data[y * w + w - 1]).toBeCloseTo(data[y * w], 5);
    for (let x = 0; x < w; x++) expect(data[(h - 1) * w + x]).toBeCloseTo(data[x], 5);
  });

  it('seam cutting uses the extra strip and still wraps smoothly', () => {
    const w = 48, h = 40;
    const margin = seamlessMargin(w, h, {mode: 'seamcut', period: 'texture', overlap: 0.2});
    expect(margin).toBe(8);
    const sw = w + margin, sh = h + margin;
    const src = terrain(sw, sh);
    const {data, maxAdjust} = makeSeamless(src, sw, sh, w, h, {mode: 'seamcut', period: 'texture', overlap: 0.2});
    expect(data.length).toBe(w * h);
    expect(maxAdjust).toBeGreaterThan(0);
    expect(wrapRatio(data, w, h)).toBeLessThan(1.6);
    // Away from the strips the detail is untouched apart from the smooth bend
    const m = edgeMismatch(data, w, h);
    expect(m.leftRight).toBeLessThan(m.typicalStep * 2);
  });
});

describe('minCostSeam', () => {
  it('follows the cheapest column and stays inside the strip', () => {
    const rows = 6, cols = 9;
    const cost = new Float64Array(rows * cols).fill(10);
    for (let r = 0; r < rows; r++) cost[r * cols + 4] = 0;
    expect(Array.from(minCostSeam(cost, rows, cols))).toEqual([4, 4, 4, 4, 4, 4]);
  });
});
