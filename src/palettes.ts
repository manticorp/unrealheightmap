/**
 * Hypsometric colour palettes and the maths to colour a height with one.
 *
 * A palette is a ramp of colours for the land and, optionally, a second ramp
 * for below sea level. Colours are blended in Oklab so ramps stay smooth and
 * evenly bright instead of going muddy in the middle like plain RGB blends.
 */

export type RGB = [number, number, number];

export type Palette = {
  id: string;
  label: string;
  /** Colours from the sea floor up to sea level. Without it the land ramp spans the whole range. */
  sea?: string[];
  /** Colours from sea level (or the lowest height) up to the highest. */
  land: string[];
};

export type TintMode = 'hillshade' | 'continuous' | 'bands';

export const TINT_MODES: TintMode[] = ['hillshade', 'continuous', 'bands'];

export const PALETTES: Palette[] = [
  {id: 'globe', label: 'Globe',
    sea: ['#0a1f4d', '#1d5aa6', '#6bb4dc', '#c9e8f5'],
    land: ['#4f8f4a', '#9bbf6a', '#e3d58c', '#c99a62', '#8a6a52', '#f4f1ec']},
  {id: 'earth', label: 'Earth',
    sea: ['#10265c', '#2a6db0', '#8cc7e6'],
    land: ['#2f7d3c', '#8ab35a', '#d8c97a', '#b4825a', '#7d6350', '#ffffff']},
  {id: 'naturalearth', label: 'Natural Earth',
    sea: ['#3e6fa3', '#8fb8d8', '#d3e6f0'],
    land: ['#c9dba0', '#e6e0a6', '#e9c98e', '#d9a877', '#c8b3a0', '#f2eee9']},
  {id: 'topo', label: 'Topo',
    sea: ['#13306b', '#4a86c4', '#bfe0f0'],
    land: ['#a9d18e', '#f0e68c', '#d9a25f', '#a8683c', '#7b4a2e', '#fafafa']},
  {id: 'highland', label: 'Highland',
    sea: ['#16335e', '#5f95bf'],
    land: ['#47663b', '#7f9a55', '#c4b46f', '#9b7d5a', '#6d5f58', '#e8e8ea']},
  {id: 'desert', label: 'Desert',
    sea: ['#1c3b57', '#6d99ad'],
    land: ['#e9d9a6', '#e1b872', '#c8864e', '#a35a34', '#6f3b27']},
  {id: 'dune', label: 'Dune',
    land: ['#2b1d2d', '#6b3a3a', '#b5653a', '#e6a35f', '#f8dca0']},
  {id: 'pastel', label: 'Pastel',
    sea: ['#8fb4e8', '#c6dcf5'],
    land: ['#c6e6c1', '#f3eeb2', '#f2cfa9', '#e0b8c4', '#f6f1f7']},
  {id: 'viridis', label: 'Viridis',
    land: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725']},
  {id: 'grey', label: 'Greyscale',
    land: ['#101010', '#ffffff']},
];

export const DEFAULT_PALETTE = 'globe';

export const getPalette = (id: string): Palette => PALETTES.find(p => p.id === id) ?? PALETTES[0];

export const hexToRgb = (hex: string): RGB => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const fromLinear = (v: number) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
};

export const rgbToOklab = ([r, g, b]: RGB): RGB => {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

export const oklabToRgb = ([L, a, b]: RGB): RGB => {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
};

/** Colour at position t (0 to 1) along evenly spaced hex stops, blended in Oklab. */
export const rampColour = (stops: string[], t: number): RGB => {
  if (stops.length === 1) return hexToRgb(stops[0]);
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = rgbToOklab(hexToRgb(stops[i])), b = rgbToOklab(hexToRgb(stops[i + 1]));
  return oklabToRgb([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
};

/** How many bands the "bands" mode splits each ramp into. */
export const BAND_COUNT = 10;

/** Colour for a height. `bands` snaps it to the middle of one of BAND_COUNT zones per ramp. */
export const tintColour = (palette: Palette, height: number, min: number, max: number, bands: boolean): RGB => {
  const snap = (t: number) => bands ? (Math.min(BAND_COUNT - 1, Math.floor(t * BAND_COUNT)) + 0.5) / BAND_COUNT : t;
  if (palette.sea && height < 0 && min < 0) {
    return rampColour(palette.sea, snap((height - min) / (0 - min)));
  }
  const lo = palette.sea && min < 0 ? 0 : min;
  return rampColour(palette.land, snap((height - lo) / ((max - lo) || 1)));
};

export const LUT_SIZE = 1024;

/** A lookup table of LUT_SIZE colours across [min, max], so drawing a tile is a table read per pixel. */
export const buildTintLut = (palette: Palette, min: number, max: number, bands: boolean): Uint8ClampedArray => {
  const lut = new Uint8ClampedArray(LUT_SIZE * 3);
  const span = (max - min) || 1;
  for (let i = 0; i < LUT_SIZE; i++) {
    const c = tintColour(palette, min + span * i / (LUT_SIZE - 1), min, max, bands);
    lut[i * 3] = c[0];
    lut[i * 3 + 1] = c[1];
    lut[i * 3 + 2] = c[2];
  }
  return lut;
};

export const CUSTOM_ID = 'custom';

const HEX = /^[0-9a-f]{6}$/i;

/** A custom palette as it is stored and shared: "sea colours_land colours", hex without #, joined by "-". */
export const encodeCustomPalette = (p: {sea?: string[], land: string[]}): string => {
  const strip = (list: string[]) => list.map(c => c.replace('#', '').toLowerCase()).join('-');
  return `${strip(p.sea ?? [])}_${strip(p.land)}`;
};

/** Read a stored custom palette. Anything invalid, or without land colours, gives undefined. */
export const decodeCustomPalette = (text: string): Palette | undefined => {
  const [seaText, landText, ...rest] = text.split('_');
  if (rest.length || landText === undefined) return undefined;
  const parse = (part: string) => part === '' ? [] : part.split('-');
  const sea = parse(seaText), land = parse(landText);
  if (!land.length || ![...sea, ...land].every(c => HEX.test(c))) return undefined;
  return {id: CUSTOM_ID, label: 'Custom', sea: sea.length ? sea.map(c => '#' + c.toLowerCase()) : undefined, land: land.map(c => '#' + c.toLowerCase())};
};

/** What "Custom" starts as: a copy of Globe. */
export const defaultCustomPalette = (): Palette => {
  const globe = getPalette('globe');
  return {id: CUSTOM_ID, label: 'Custom', sea: [...globe.sea!], land: [...globe.land]};
};

export type TintKeyTick = {value: number, fraction: number, label: string};

/**
 * Heights to label under the palette preview: the ends, quarter points, and
 * sea level when the palette switches there (unless it would crowd a neighbour).
 */
export const tintKeyTicks = (palette: Palette, min: number, max: number): TintKeyTick[] => {
  const span = (max - min) || 1;
  const fmt = (v: number) => `${Math.round(v).toLocaleString('en-US')} m`;
  let fractions = [0, 0.25, 0.5, 0.75, 1];
  if (palette.sea && min < 0 && max > 0) {
    // Sea level replaces any quarter point it would crowd; the ends always stay
    const f = -min / span;
    fractions = fractions.filter(x => x === 0 || x === 1 || Math.abs(x - f) > 0.09);
    if (!fractions.some(x => Math.abs(x - f) < 1e-9)) fractions.push(f);
  }
  return fractions.sort((a, b) => a - b).map(fraction => {
    const value = min + span * fraction;
    return {value, fraction, label: fmt(value)};
  });
};
