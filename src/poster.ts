/**
 * Shaded-relief posters: the map is rendered here (pure, in the worker) from
 * heights - multi-directional hillshade, a colour ramp by height, water and
 * contour lines - and the page with its title, scale bar and north arrow is
 * laid out on a canvas in the app.
 */

import qrcode from 'qrcode-generator';
import {sampleBilinear} from './area';

export type PosterStyle = 'classic' | 'swiss' | 'dark' | 'blueprint' | 'vintage' | 'mars';

export type PosterTheme = {
  label: string;
  paper: string;
  ink: string;
  muted: string;
  /** Height ramp, low to high: [position 0–1, colour]. */
  ramp: [number, string][];
  water: [string, string];
  shadow: string;
  /** How strongly the hillshade darkens (0–1). */
  shade: number;
  contour: string;
  contourAlpha: number;
  font: string;
};

export const POSTER_THEMES: Record<PosterStyle, PosterTheme> = {
  classic: {
    label: 'Classic relief', paper: '#f6f2e8', ink: '#2a2a28', muted: '#6b665c',
    ramp: [[0, '#6f9a5b'], [0.2, '#a8bd76'], [0.42, '#e3d79c'], [0.65, '#c49c6c'], [0.85, '#a59a92'], [1, '#ffffff']],
    water: ['#bcd8e8', '#7aa7c7'], shadow: '#2e3440', shade: 0.6, contour: '#5b4a35', contourAlpha: 0.35,
    font: 'Georgia, "Times New Roman", serif',
  },
  swiss: {
    label: 'Swiss style', paper: '#f4f4f1', ink: '#202428', muted: '#5f6670',
    ramp: [[0, '#dfe7d6'], [0.5, '#efeadb'], [0.8, '#f3efe6'], [1, '#ffffff']],
    water: ['#d4e6f1', '#9cc3dd'], shadow: '#3c4b66', shade: 0.75, contour: '#6c6050', contourAlpha: 0.25,
    font: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  dark: {
    label: 'Night', paper: '#111214', ink: '#f1efe9', muted: '#a09c92',
    ramp: [[0, '#1b1d22'], [0.6, '#3a3d45'], [1, '#c9c6bd']],
    water: ['#0c1a2a', '#08121e'], shadow: '#000000', shade: 0.8, contour: '#d8b26a', contourAlpha: 0.55,
    font: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  blueprint: {
    label: 'Blueprint', paper: '#1e4d8c', ink: '#ffffff', muted: '#c7d6ec',
    ramp: [[0, '#21569b'], [1, '#3a72bb']],
    water: ['#1a447d', '#163b6d'], shadow: '#0d2547', shade: 0.55, contour: '#ffffff', contourAlpha: 0.7,
    font: '"Courier New", Courier, monospace',
  },
  vintage: {
    label: 'Vintage', paper: '#efe3c6', ink: '#3b2a1a', muted: '#7a5f43',
    ramp: [[0, '#d9c9a1'], [0.5, '#e6d6ad'], [1, '#f4ead0']],
    water: ['#bfc9b8', '#9fae9c'], shadow: '#4a2f1b', shade: 0.6, contour: '#6b4423', contourAlpha: 0.55,
    font: 'Georgia, "Times New Roman", serif',
  },
  mars: {
    label: 'Red planet', paper: '#1d1310', ink: '#f3e2d2', muted: '#c49a80',
    ramp: [[0, '#5a2a1a'], [0.4, '#a2512d'], [0.75, '#d08a52'], [1, '#f1c89a']],
    water: ['#3a2a40', '#2a1d30'], shadow: '#140806', shade: 0.7, contour: '#f1c89a', contourAlpha: 0.35,
    font: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
};

export type PosterMapOptions = {
  style: PosterStyle;
  /** Output size of the map frame in pixels. */
  width: number;
  height: number;
  /** Metres per pixel of the heights grid. */
  mpp: {x: number, y: number};
  /** Vertical exaggeration of the shading. */
  zFactor: number;
  /** Contour spacing in metres; 0 for none. Every 5th line is bolder. */
  contourInterval: number;
  /** Heights at or below this are water (null: none). */
  waterLevel: number | null;
};

const hexRgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const rampAt = (ramp: [number, [number, number, number]][], t: number): [number, number, number] => {
  if (t <= ramp[0][0]) return ramp[0][1];
  for (let i = 1; i < ramp.length; i++) {
    if (t <= ramp[i][0]) {
      const [p0, c0] = ramp[i - 1], [p1, c1] = ramp[i];
      const f = (t - p0) / (p1 - p0 || 1);
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
    }
  }
  return ramp[ramp.length - 1][1];
};

/** RGBA map image for the poster frame. */
export const renderPosterMap = (heights: Float32Array, hw: number, hh: number, options: PosterMapOptions): Uint8ClampedArray => {
  const theme = POSTER_THEMES[options.style] ?? POSTER_THEMES.classic;
  const W = Math.round(options.width), H = Math.round(options.height);
  const out = new Uint8ClampedArray(W * H * 4);
  let min = Infinity, max = -Infinity;
  const water = options.waterLevel;
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i];
    if (water !== null && h <= water) continue;
    if (h < min) min = h;
    if (h > max) max = h;
  }
  if (!Number.isFinite(min)) { min = 0; max = 1; }
  let deepest = water ?? 0;
  for (let i = 0; i < heights.length; i++) if (heights[i] < deepest) deepest = heights[i];
  const range = Math.max(1e-3, max - min);
  const ramp = theme.ramp.map(([p, c]) => [p, hexRgb(c)] as [number, [number, number, number]]);
  const shallow = hexRgb(theme.water[0]), deep = hexRgb(theme.water[1]);
  const shadow = hexRgb(theme.shadow);
  const contour = hexRgb(theme.contour);
  // Hillshade lights: the classic north-west light with gentle fill from the west and north
  const lights = [[315, 45, 0.55], [270, 50, 0.2], [0, 50, 0.15], [225, 55, 0.1]].map(([az, alt, w]) => {
    const a = az * Math.PI / 180, e = alt * Math.PI / 180;
    return [Math.cos(e) * Math.sin(a), Math.cos(e) * Math.cos(a), Math.sin(e), w];
  });
  const sx = hw / W, sy = hh / H;
  // One output pixel's footprint in metres, for gradients
  const stepX = options.mpp.x * sx, stepY = options.mpp.y * sy;
  const z = Math.max(0.1, options.zFactor);
  const interval = options.contourInterval > 0 ? options.contourInterval : 0;
  const at = (x: number, y: number) => sampleBilinear(heights, hw, hh, (x + 0.5) * sx - 0.5, (y + 0.5) * sy - 0.5);
  let prevRow = new Float32Array(W + 2), row = new Float32Array(W + 2), nextRow = new Float32Array(W + 2);
  const fill = (target: Float32Array, y: number) => {
    const yy = Math.min(H - 1, Math.max(0, y));
    for (let x = -1; x <= W; x++) target[x + 1] = at(Math.min(W - 1, Math.max(0, x)), yy);
  };
  fill(prevRow, -1);
  fill(row, 0);
  for (let y = 0; y < H; y++) {
    fill(nextRow, y + 1);
    for (let x = 0; x < W; x++) {
      const h = row[x + 1];
      const dEast = (row[x + 2] - row[x]) / (2 * stepX) * z;
      const dNorth = (prevRow[x + 1] - nextRow[x + 1]) / (2 * stepY) * z;
      const len = Math.hypot(dEast, dNorth, 1);
      const nx = -dEast / len, ny = -dNorth / len, nz = 1 / len;
      let light = 0;
      for (const [lx, ly, lz, w] of lights) light += Math.max(0, nx * lx + ny * ly + nz * lz) * w;
      // Flat ground lights to ~0.7: rescale so it reads neutral
      const shade = Math.min(1.2, light / 0.7);
      let base: [number, number, number];
      const isWater = water !== null && h <= water;
      if (isWater) {
        const t = Math.min(1, (water - h) / Math.max(1, water - deepest));
        base = [shallow[0] + (deep[0] - shallow[0]) * t, shallow[1] + (deep[1] - shallow[1]) * t, shallow[2] + (deep[2] - shallow[2]) * t];
      } else {
        base = rampAt(ramp, (h - min) / range);
      }
      const k = isWater ? 0.15 : theme.shade;
      const dark = Math.max(0, 1 - shade) * k;
      const lift = Math.max(0, shade - 1) * 0.5;
      let r = base[0] * (1 - dark) + shadow[0] * dark, g = base[1] * (1 - dark) + shadow[1] * dark, b = base[2] * (1 - dark) + shadow[2] * dark;
      r += (255 - r) * lift; g += (255 - g) * lift; b += (255 - b) * lift;
      if (interval && !isWater) {
        const band = Math.floor(h / interval);
        const right = Math.floor(row[x + 2] / interval), down = Math.floor(nextRow[x + 1] / interval);
        if (band !== right || band !== down) {
          const level = Math.max(band, right, down);
          const alpha = theme.contourAlpha * (level % 5 === 0 ? 1.6 : 1);
          const a = Math.min(1, alpha);
          r = r * (1 - a) + contour[0] * a; g = g * (1 - a) + contour[1] * a; b = b * (1 - a) + contour[2] * a;
        }
      }
      const o = (y * W + x) * 4;
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 255;
    }
    const t = prevRow; prevRow = row; row = nextRow; nextRow = t;
  }
  return out;
};

export type PaperSize = 'a4' | 'a3' | 'a2' | 'a1' | 'square' | 'screen' | 'custom';

/** Width × height in millimetres, portrait (screen is a 16:9 wallpaper in px at 150 dpi-equivalent). */
export const PAPER_MM: Record<PaperSize, [number, number]> = {
  a4: [210, 297], a3: [297, 420], a2: [420, 594], a1: [594, 841], square: [300, 300], screen: [338.7, 190.5], custom: [300, 400],
};

export type LengthUnit = 'mm' | 'cm' | 'in';

export const MM_PER_UNIT: Record<LengthUnit, number> = {mm: 1, cm: 10, in: 25.4};

/** Largest poster side and area a browser canvas reliably handles. */
export const POSTER_MAX_SIDE = 16000;
export const POSTER_MAX_PIXELS = 180e6;

/**
 * Page size in pixels: portrait or landscape to suit the map. A custom size
 * (width × height in mm) is used exactly as given.
 */
export const pagePixels = (paper: PaperSize, dpi: number, mapAspect: number, customMm?: [number, number]): {width: number, height: number} => {
  let [w, h] = paper === 'custom' && customMm ? customMm : PAPER_MM[paper];
  if (paper !== 'screen' && paper !== 'square' && paper !== 'custom' && mapAspect > 1.15) [w, h] = [h, w];
  return {width: Math.max(1, Math.round(w / 25.4 * dpi)), height: Math.max(1, Math.round(h / 25.4 * dpi))};
};

/** Tracked link printed as a QR code on posters that carry the credit. */
export const POSTER_CREDIT_URL = 'https://links.ikibiko.com/y6mKuO';

/**
 * Link for the poster's QR code: the tracked link with UTM tags, plus the
 * page's settings hash so scanning it reopens the same area and options.
 */
export const posterQrUrl = (hash: string, content: string): string => {
  const query = new URLSearchParams({utm_source: 'poster', utm_medium: 'qr', utm_content: content}).toString();
  const h = hash && !hash.startsWith('#') ? `#${hash}` : hash;
  return `${POSTER_CREDIT_URL}?${query}${h}`;
};

const luminance = (hex: string) => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

/**
 * QR colours from a poster theme. Scanners expect dark modules on a light
 * background, so the darker of ink and paper draws the modules and the lighter
 * one fills the square (on dark styles that is an ink-coloured tile).
 */
export const qrColours = (theme: {ink: string, paper: string}): {dark: string, light: string, onPaper: boolean} => {
  const inkDarker = luminance(theme.ink) < luminance(theme.paper);
  return inkDarker ? {dark: theme.ink, light: theme.paper, onPaper: true} : {dark: theme.paper, light: theme.ink, onPaper: false};
};

/** QR code modules for `text` (true = dark), medium error correction. */
export const qrModules = (text: string): boolean[][] => {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const out: boolean[][] = [];
  for (let r = 0; r < n; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < n; c++) row.push(qr.isDark(r, c));
    out.push(row);
  }
  return out;
};

/** A round scale-bar length (1, 2 or 5 × 10^n metres) close to `target` metres. */
export const niceDistance = (target: number): number => {
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(1e-6, target))));
  const n = target / mag;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
};
