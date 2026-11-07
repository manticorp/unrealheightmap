/**
 * Seamless (tileable) heightmaps from real terrain.
 *
 * Three ways to make the left edge meet the right and the top meet the bottom:
 *
 *  - mirror: the central half of the area, mirrored into a 2 × 2 block. Always
 *    seamless, but every ridge gets a mirror twin.
 *  - smooth: "periodic plus smooth" decomposition (Moisan 2011). The heightmap
 *    is split into a periodic part, which keeps every crag and gully, and a
 *    smooth part that only exists because the edges don't match. Dropping the
 *    smooth part leaves a tile that repeats, with the broad tilt spread out.
 *  - seamcut: like smooth, but the fine detail near the joins comes from a
 *    strip of extra terrain fetched past the right and bottom edges, joined to
 *    the other side along the path where the two differ least (usually a
 *    valley floor), as in texture quilting. The broad shape is then made
 *    periodic as above.
 *
 * Pure functions, so they run in the worker and can be unit tested.
 */

export type SeamlessMode = 'off' | 'smooth' | 'seamcut' | 'mirror';

/**
 * texture:   repeats every N pixels (images, materials, most engines).
 * landscape: repeats every N - 1 pixels, so the last row and column equal the
 *            first, as landscape sections that share edge vertices need.
 */
export type SeamlessPeriod = 'texture' | 'landscape';

export type SeamlessOptions = {
  mode: SeamlessMode;
  period: SeamlessPeriod;
  /** Overlap strip for seam cutting, as a fraction of the shorter side. */
  overlap: number;
};

export const defaultSeamless: SeamlessOptions = {mode: 'off', period: 'texture', overlap: 0.12};

/** Above this many pixels the FFT would need too much memory in the browser. */
export const SEAMLESS_MAX_PIXELS = 4100 * 4100;

/** Extra pixels to fetch past the right and bottom edges for seam cutting. */
export const seamlessMargin = (width: number, height: number, options: SeamlessOptions): number => {
  if (options.mode !== 'seamcut') return 0;
  const overlap = Math.min(0.3, Math.max(0.03, options.overlap || defaultSeamless.overlap));
  return Math.max(8, Math.round(Math.min(width, height) * overlap));
};

/* ------------------------------------------------------------------------ */
/* FFT for any length: radix-2 for powers of two, Bluestein for the rest     */
/* (Unreal sizes such as 1009 and 2017 are odd).                             */
/* ------------------------------------------------------------------------ */

const isPow2 = (n: number) => (n & (n - 1)) === 0;
const nextPow2 = (n: number) => {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
};

/** In-place iterative radix-2 FFT. `inverse` uses +i and does not scale. */
const fftRadix2 = (re: Float64Array, im: Float64Array, inverse: boolean) => {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (inverse ? 2 : -2) * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
};

/** A reusable unscaled DFT of one length (forward: e^{-i...}, inverse: e^{+i...}). */
export class Fft {
  n: number;
  private m = 0;
  private chirpRe?: Float64Array;
  private chirpIm?: Float64Array;
  private kernelRe?: Float64Array;
  private kernelIm?: Float64Array;
  private bufRe?: Float64Array;
  private bufIm?: Float64Array;

  constructor(n: number) {
    this.n = n;
    if (!isPow2(n)) {
      const m = nextPow2(2 * n - 1);
      this.m = m;
      this.chirpRe = new Float64Array(n);
      this.chirpIm = new Float64Array(n);
      for (let k = 0; k < n; k++) {
        // k² mod 2n keeps the angle small, so float error doesn't grow with k
        const angle = Math.PI * ((k * k) % (2 * n)) / n;
        this.chirpRe[k] = Math.cos(angle);
        this.chirpIm[k] = -Math.sin(angle);
      }
      this.kernelRe = new Float64Array(m);
      this.kernelIm = new Float64Array(m);
      for (let k = 0; k < n; k++) {
        this.kernelRe[k] = this.chirpRe[k];
        this.kernelIm[k] = -this.chirpIm[k];
        if (k > 0) {
          this.kernelRe[m - k] = this.chirpRe[k];
          this.kernelIm[m - k] = -this.chirpIm[k];
        }
      }
      fftRadix2(this.kernelRe, this.kernelIm, false);
      this.bufRe = new Float64Array(m);
      this.bufIm = new Float64Array(m);
    }
  }

  transform(re: Float64Array, im: Float64Array, inverse = false) {
    const n = this.n;
    if (n <= 1) return;
    if (isPow2(n)) {
      fftRadix2(re, im, inverse);
      return;
    }
    // Inverse via conjugation: IDFT(x) = conj(DFT(conj(x)))
    if (inverse) {
      for (let i = 0; i < n; i++) im[i] = -im[i];
    }
    const m = this.m;
    const ar = this.bufRe!, ai = this.bufIm!;
    const cr = this.chirpRe!, ci = this.chirpIm!;
    ar.fill(0);
    ai.fill(0);
    for (let k = 0; k < n; k++) {
      ar[k] = re[k] * cr[k] - im[k] * ci[k];
      ai[k] = re[k] * ci[k] + im[k] * cr[k];
    }
    fftRadix2(ar, ai, false);
    const kr = this.kernelRe!, ki = this.kernelIm!;
    for (let k = 0; k < m; k++) {
      const r = ar[k] * kr[k] - ai[k] * ki[k];
      ai[k] = ar[k] * ki[k] + ai[k] * kr[k];
      ar[k] = r;
    }
    fftRadix2(ar, ai, true);
    for (let k = 0; k < n; k++) {
      const r = ar[k] / m, i = ai[k] / m;
      re[k] = r * cr[k] - i * ci[k];
      im[k] = r * ci[k] + i * cr[k];
    }
    if (inverse) {
      for (let i = 0; i < n; i++) im[i] = -im[i];
    }
  }
}

/**
 * The smooth component s of Moisan's periodic + smooth decomposition, so that
 * u - s tiles seamlessly. s solves the discrete Poisson equation driven only
 * by the jumps across opposite edges, and has zero mean.
 */
export const smoothComponent = (u: Float32Array, width: number, height: number): Float32Array => {
  const W = width, H = height;
  const re = new Float32Array(W * H);
  const im = new Float32Array(W * H);
  const rowFft = new Fft(W);
  const colFft = new Fft(H);
  const rr = new Float64Array(W), ri = new Float64Array(W);
  // Boundary image v: the jump into each edge pixel from the opposite edge
  for (let y = 0; y < H; y++) {
    rr.fill(0);
    ri.fill(0);
    if (y === 0 || y === H - 1) {
      const other = y === 0 ? H - 1 : 0;
      for (let x = 0; x < W; x++) rr[x] += u[other * W + x] - u[y * W + x];
    }
    rr[0] += u[y * W + W - 1] - u[y * W];
    rr[W - 1] += u[y * W] - u[y * W + W - 1];
    rowFft.transform(rr, ri, false);
    re.set(rr, y * W);
    im.set(ri, y * W);
  }
  const cr = new Float64Array(H), ci = new Float64Array(H);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      cr[y] = re[y * W + x];
      ci[y] = im[y * W + x];
    }
    colFft.transform(cr, ci, false);
    const cx = 2 * Math.cos(2 * Math.PI * x / W);
    for (let y = 0; y < H; y++) {
      const denom = cx + 2 * Math.cos(2 * Math.PI * y / H) - 4;
      if (x === 0 && y === 0) {
        cr[y] = 0;
        ci[y] = 0;
      } else {
        cr[y] /= denom;
        ci[y] /= denom;
      }
    }
    colFft.transform(cr, ci, true);
    for (let y = 0; y < H; y++) {
      re[y * W + x] = cr[y];
      im[y * W + x] = ci[y];
    }
  }
  const out = new Float32Array(W * H);
  const scale = 1 / (W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      rr[x] = re[y * W + x];
      ri[x] = im[y * W + x];
    }
    rowFft.transform(rr, ri, true);
    for (let x = 0; x < W; x++) out[y * W + x] = rr[x] * scale;
  }
  return out;
};

/** Periodic component: u minus its smooth component. Mean height is unchanged. */
export const periodicComponent = (u: Float32Array, width: number, height: number): {data: Float32Array, maxAdjust: number} => {
  const s = smoothComponent(u, width, height);
  const out = new Float32Array(u.length);
  let maxAdjust = 0;
  for (let i = 0; i < u.length; i++) {
    out[i] = u[i] - s[i];
    const a = Math.abs(s[i]);
    if (a > maxAdjust) maxAdjust = a;
  }
  return {data: out, maxAdjust};
};

/** Three passes of a separable box blur (close to a gaussian), edges clamped. */
export const blurHeights = (src: Float32Array, width: number, height: number, radius: number): Float32Array => {
  const r = Math.max(1, Math.round(radius));
  let a = Float32Array.from(src);
  let b = new Float32Array(src.length);
  const pass = (from: Float32Array, to: Float32Array, n: number, lines: number, stride: number, step: number) => {
    const norm = 1 / (2 * r + 1);
    for (let line = 0; line < lines; line++) {
      const start = line * stride;
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += from[start + Math.min(n - 1, Math.max(0, k)) * step];
      for (let i = 0; i < n; i++) {
        to[start + i * step] = sum * norm;
        sum += from[start + Math.min(n - 1, i + r + 1) * step] - from[start + Math.max(0, i - r) * step];
      }
    }
  };
  for (let iter = 0; iter < 3; iter++) {
    pass(a, b, width, height, width, 1);
    pass(b, a, height, width, 1, width);
  }
  return a;
};

/**
 * Lowest-cost path through a cost grid of `rows` × `cols`, one column per row,
 * moving at most one column between rows (dynamic programming). Columns near
 * the strip's edges cost a little extra, so the seam stays inside it.
 */
export const minCostSeam = (cost: Float64Array, rows: number, cols: number): Int32Array => {
  const acc = new Float64Array(rows * cols);
  const from = new Int8Array(rows * cols);
  const edgePenalty = (c: number) => {
    const d = Math.min(c, cols - 1 - c);
    return d < 2 ? 1e6 : 0;
  };
  for (let c = 0; c < cols; c++) acc[c] = cost[c] + edgePenalty(c);
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let best = acc[(r - 1) * cols + c], step = 0;
      if (c > 0 && acc[(r - 1) * cols + c - 1] < best) { best = acc[(r - 1) * cols + c - 1]; step = -1; }
      if (c < cols - 1 && acc[(r - 1) * cols + c + 1] < best) { best = acc[(r - 1) * cols + c + 1]; step = 1; }
      acc[r * cols + c] = best + cost[r * cols + c] + edgePenalty(c);
      from[r * cols + c] = step;
    }
  }
  const path = new Int32Array(rows);
  let c = 0;
  let best = Infinity;
  for (let k = 0; k < cols; k++) {
    if (acc[(rows - 1) * cols + k] < best) { best = acc[(rows - 1) * cols + k]; c = k; }
  }
  for (let r = rows - 1; r >= 0; r--) {
    path[r] = c;
    c += from[r * cols + c];
  }
  return path;
};

const smoothstep = (t: number) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

/**
 * Join a strip of `band` pixels: inside the strip each pixel either continues
 * the previous tile (`a`, the terrain just past the far edge) or leads into
 * this tile (`b`), switching along the seam with a short feathered blend.
 */
const blendAcrossSeam = (a: number, b: number, offset: number, seam: number, feather: number) => {
  const t = smoothstep((offset - seam + feather) / (2 * feather));
  return a * (1 - t) + b * t;
};

/**
 * High-frequency seam cut. `hi` is (cw + band) × (ch + band); the result is
 * cw × ch and repeats seamlessly in its fine detail.
 */
const seamCutDetail = (hi: Float32Array, sw: number, sh: number, cw: number, ch: number, band: number): Float32Array => {
  const feather = Math.max(1, Math.min(4, Math.floor(band / 6)));
  // Pass 1: the left strip, using columns past the right edge. Keeps all sh rows.
  const mid = new Float32Array(cw * sh);
  const costX = new Float64Array(sh * band);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < band; x++) {
      const d = hi[y * sw + cw + x] - hi[y * sw + x];
      costX[y * band + x] = d * d;
    }
  }
  const seamX = minCostSeam(costX, sh, band);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < cw; x++) {
      if (x < band) {
        mid[y * cw + x] = blendAcrossSeam(hi[y * sw + cw + x], hi[y * sw + x], x, seamX[y], feather);
      } else {
        mid[y * cw + x] = hi[y * sw + x];
      }
    }
  }
  // Pass 2: the top strip, using rows past the bottom edge.
  const out = new Float32Array(cw * ch);
  const costY = new Float64Array(cw * band);
  for (let x = 0; x < cw; x++) {
    for (let y = 0; y < band; y++) {
      const d = mid[(ch + y) * cw + x] - mid[y * cw + x];
      costY[x * band + y] = d * d;
    }
  }
  const seamY = minCostSeam(costY, cw, band);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (y < band) {
        out[y * cw + x] = blendAcrossSeam(mid[(ch + y) * cw + x], mid[y * cw + x], y, seamY[x], feather);
      } else {
        out[y * cw + x] = mid[y * cw + x];
      }
    }
  }
  return out;
};

/** The central half of the area, mirrored into a 2 × 2 block of the same size. */
export const mirrorTile = (src: Float32Array, width: number, height: number): Float32Array => {
  const out = new Float32Array(width * height);
  const ox = Math.floor(width / 4), oy = Math.floor(height / 4);
  const halfW = Math.ceil(width / 2), halfH = Math.ceil(height / 2);
  for (let y = 0; y < height; y++) {
    const sy = oy + (y < halfH ? y : height - 1 - y);
    for (let x = 0; x < width; x++) {
      const sx = ox + (x < halfW ? x : width - 1 - x);
      out[y * width + x] = src[Math.min(height - 1, sy) * width + Math.min(width - 1, sx)];
    }
  }
  return out;
};

/** Copy a cw × ch tile into a (cw + 1) × (ch + 1) grid whose last row and column repeat the first. */
const closeLandscapeTile = (tile: Float32Array, cw: number, ch: number): Float32Array => {
  const W = cw + 1, H = ch + 1;
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const sy = y % ch;
    for (let x = 0; x < W; x++) out[y * W + x] = tile[sy * cw + (x % cw)];
  }
  return out;
};

export type SeamlessResult = {
  data: Float32Array;
  /** Largest height change made to any pixel, metres (smooth and seamcut). */
  maxAdjust: number;
};

/**
 * Make a width × height tile from `src` (srcWidth × srcHeight, which for
 * seamcut includes the extra strip past the right and bottom edges).
 */
export const makeSeamless = (
  src: Float32Array, srcWidth: number, srcHeight: number,
  width: number, height: number, options: SeamlessOptions,
): SeamlessResult => {
  const crop = (w: number, h: number) => {
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) out.set(src.subarray(y * srcWidth, y * srcWidth + w), y * w);
    return out;
  };
  if (options.mode === 'off') return {data: crop(width, height), maxAdjust: 0};
  if (options.mode === 'mirror') {
    const tile = mirrorTile(crop(width, height), width, height);
    return {data: tile, maxAdjust: 0};
  }
  const landscape = options.period === 'landscape';
  const cw = landscape ? width - 1 : width;
  const ch = landscape ? height - 1 : height;
  let tile: Float32Array;
  let maxAdjust = 0;
  const band = Math.min(srcWidth - cw, srcHeight - ch);
  if (options.mode === 'seamcut' && band >= 4) {
    const b = Math.min(band, Math.floor(Math.min(cw, ch) / 2));
    const low = blurHeights(src, srcWidth, srcHeight, Math.max(2, b / 2));
    const hi = new Float32Array(src.length);
    for (let i = 0; i < src.length; i++) hi[i] = src[i] - low[i];
    const detail = seamCutDetail(hi, srcWidth, srcHeight, cw, ch, b);
    const joined = new Float32Array(cw * ch);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const i = y * cw + x;
        joined[i] = low[y * srcWidth + x] + detail[i];
        maxAdjust = Math.max(maxAdjust, Math.abs(joined[i] - src[y * srcWidth + x]));
      }
    }
    const periodic = periodicComponent(joined, cw, ch);
    tile = periodic.data;
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        maxAdjust = Math.max(maxAdjust, Math.abs(tile[y * cw + x] - src[y * srcWidth + x]));
      }
    }
  } else {
    const periodic = periodicComponent(crop(cw, ch), cw, ch);
    tile = periodic.data;
    maxAdjust = periodic.maxAdjust;
  }
  return {data: landscape ? closeLandscapeTile(tile, cw, ch) : tile, maxAdjust};
};

export type EdgeMismatch = {
  /** Mean absolute height difference between the left and right edges, metres. */
  leftRight: number;
  /** Mean absolute height difference between the top and bottom edges, metres. */
  topBottom: number;
  /** Mean height step between neighbouring pixels, for scale. */
  typicalStep: number;
};

/**
 * How badly an area tiles as it is. A big mismatch compared with the typical
 * step means the smooth part has to bend the terrain more.
 */
export const edgeMismatch = (h: Float32Array | ArrayLike<number>, width: number, height: number): EdgeMismatch => {
  let lr = 0, tb = 0, step = 0, steps = 0;
  for (let y = 0; y < height; y++) lr += Math.abs(h[y * width] - h[y * width + width - 1]);
  for (let x = 0; x < width; x++) tb += Math.abs(h[x] - h[(height - 1) * width + x]);
  const stride = Math.max(1, Math.floor(Math.sqrt(width * height / 20000)));
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x + 1 < width; x += stride) {
      step += Math.abs(h[y * width + x + 1] - h[y * width + x]);
      steps++;
    }
  }
  return {
    leftRight: lr / Math.max(1, height),
    topBottom: tb / Math.max(1, width),
    typicalStep: steps ? step / steps : 0,
  };
};

/** A 0–100 score for how well an area tiles before any processing (100 = perfectly). */
export const seamScore = (m: EdgeMismatch, heightRange: number): number => {
  const worst = Math.max(m.leftRight, m.topBottom);
  const range = Math.max(1, heightRange);
  return Math.round(100 * Math.max(0, 1 - worst / (range * 0.5)));
};
