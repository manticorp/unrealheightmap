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
  /** Where each sea colour sits, from 0 to 1, as for `landAt`. */
  seaAt?: number[];
  /** Colours from sea level (or the lowest height) up to the highest. */
  land: string[];
  /**
   * Where each land colour sits, from 0 to 1, rising (evenly spaced when left out).
   * Two stops at the same place make a hard edge, as in "Coldest" and "Hottest".
   */
  landAt?: number[];
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
  {id: 'greyinv', label: 'Greyscale (inverted)',
    land: ['#ffffff', '#101010']},
  // Thermal-camera styles
  {id: 'ironbow', label: 'Ironbow',
    land: ['#000000', '#1b0c5c', '#6a1590', '#b8287a', '#e8501e', '#f99a1c', '#fde26a', '#ffffff']},
  {id: 'rainbow', label: 'Rainbow',
    land: ['#1a1a8c', '#2060ff', '#00c8ff', '#2ed85a', '#f5ee20', '#ff8a00', '#e8102a']},
  {id: 'contrast', label: 'Contrast',
    land: ['#0a0010', '#5a0a8c', '#d02ad8', '#1fb5e0', '#30d050', '#f2f030', '#d23a10', '#6e0a0a']},
  {id: 'arctic', label: 'Arctic',
    land: ['#08062e', '#10208c', '#1f5ce8', '#4fd8f5', '#f08a1a', '#f8b030', '#fff07a']},
  {id: 'lava', label: 'Lava',
    land: ['#05051a', '#23207a', '#1e88b8', '#7a3a6a', '#e83a12', '#ff8c1a', '#ffe680']},
  {id: 'coldest', label: 'Coldest (lowest in blue)',
    land: ['#1030ff', '#4a7bff', '#2a2a2a', '#f4f4f4'], landAt: [0, 0.1, 0.1, 1]},
  {id: 'hottest', label: 'Hottest (highest in red)',
    land: ['#1a1a1a', '#d8d8d8', '#ff5a3a', '#e8101a'], landAt: [0, 0.9, 0.9, 1]},
  {id: 'lowhigh', label: 'Lowest and highest',
    land: ['#1030ff', '#4a7bff', '#2a2a2a', '#d8d8d8', '#ff5a3a', '#e8101a'], landAt: [0, 0.1, 0.1, 0.9, 0.9, 1]},
  // Other scales
  {id: 'redwhitegreen', label: 'Red-White-Green',
    land: ['#c8102e', '#f08080', '#ffffff', '#86d07a', '#1a8a2e']},
  {id: 'mocha', label: 'Mocha',
    land: ['#2b1a12', '#5c3a24', '#8f6442', '#c49a6c', '#e8d4bc', '#ffffff']},
  {id: 'snow', label: 'Snow',
    land: ['#0b1e4a', '#24508f', '#5f96cf', '#a8cde8', '#e2f0fa', '#ffffff']},
  {id: 'neon', label: 'Neon',
    land: ['#0d0221', '#7b00ff', '#ff00d4', '#00e5ff', '#39ff14', '#fff700']},
  {id: 'nighttime', label: 'Nighttime',
    land: ['#05050f', '#141a40', '#33507a', '#8f9468', '#c8ad8c', '#f2d2d2']},
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

/**
 * Colour at position t (0 to 1) along hex stops, blended in Oklab. Stops are
 * evenly spaced unless `at` gives each one's position.
 */
export const rampColour = (stops: string[], t: number, at?: number[]): RGB => {
  if (stops.length === 1) return hexToRgb(stops[0]);
  const u = Math.max(0, Math.min(1, t));
  let i: number, f: number;
  if (at && at.length === stops.length) {
    // The last segment that starts at or before u, so a hard edge belongs to the colour above it
    i = 0;
    while (i < stops.length - 2 && at[i + 1] <= u) i++;
    const span = at[i + 1] - at[i];
    f = span > 0 ? Math.max(0, Math.min(1, (u - at[i]) / span)) : 1;
  } else {
    const x = u * (stops.length - 1);
    i = Math.min(stops.length - 2, Math.floor(x));
    f = x - i;
  }
  const a = rgbToOklab(hexToRgb(stops[i])), b = rgbToOklab(hexToRgb(stops[i + 1]));
  return oklabToRgb([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
};

/** How many bands the "bands" mode splits each ramp into. */
export const BAND_COUNT = 10;

/** Colour for a height. `bands` snaps it to the middle of one of BAND_COUNT zones per ramp. */
export const tintColour = (palette: Palette, height: number, min: number, max: number, bands: boolean): RGB => {
  const snap = (t: number) => bands ? (Math.min(BAND_COUNT - 1, Math.floor(t * BAND_COUNT)) + 0.5) / BAND_COUNT : t;
  if (palette.sea && height < 0 && min < 0) {
    return rampColour(palette.sea, snap((height - min) / (0 - min)), palette.seaAt);
  }
  const lo = palette.sea && min < 0 ? 0 : min;
  return rampColour(palette.land, snap((height - lo) / ((max - lo) || 1)), palette.landAt);
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

export const rgbToHex = ([r, g, b]: RGB): string =>
  '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/** One colour of a ramp and where it sits along it, from 0 to 1. */
export type ColourStop = {colour: string, at: number};

/** A ramp's colours as stops, evenly spaced unless `at` places them. */
export const toStops = (colours: string[], at?: number[]): ColourStop[] =>
  colours.map((colour, i) => ({colour, at: at && at.length === colours.length ? at[i] : colours.length > 1 ? i / (colours.length - 1) : 0}));

/** Positions are kept to 0.1% (what a link can carry). */
const roundAt = (t: number) => Math.round(Math.max(0, Math.min(1, t)) * 1000) / 1000;

/**
 * Stops back to a ramp: sorted by position (stops at the same place keep their order, making a hard edge),
 * with `at` left out when they are evenly spaced.
 */
export const fromStops = (stops: ColourStop[]): {colours: string[], at?: number[]} => {
  const sorted = stops.map((s, i) => ({...s, i})).sort((x, y) => x.at - y.at || x.i - y.i);
  const colours = sorted.map(s => s.colour.toLowerCase());
  const at = sorted.map(s => roundAt(s.at));
  const n = at.length;
  const even = n < 2 || at.every((t, i) => Math.abs(t - i / (n - 1)) < 0.0006);
  return even ? {colours} : {colours, at};
};

/** The colour a ramp of stops has at t, as hex: what a new stop dropped there starts as. */
export const stopsColour = (stops: ColourStop[], t: number): string => {
  const {colours, at} = fromStops(stops);
  return rgbToHex(rampColour(colours, t, at ?? toStops(colours).map(s => s.at)));
};

export const CUSTOM_ID = 'custom';

const STOP = /^([0-9a-f]{6})(?:@(\d{1,3}(?:\.\d)?))?$/i;

/**
 * A custom palette as it is stored and shared: "sea_land", each a list of hex colours without # joined by "-",
 * lowest first. A colour can carry its position as a percentage ("ff0000@12.5"); without them the colours are evenly spaced.
 */
export const encodeCustomPalette = (p: {sea?: string[], seaAt?: number[], land: string[], landAt?: number[]}): string => {
  const part = (list: string[], at?: number[]) => {
    const placed = at && at.length === list.length ? fromStops(toStops(list, at)) : {colours: list.map(c => c.toLowerCase())};
    return placed.colours.map((c, i) => c.replace('#', '') + (placed.at ? '@' + +(placed.at[i] * 100).toFixed(1) : '')).join('-');
  };
  return `${part(p.sea ?? [], p.seaAt)}_${part(p.land, p.landAt)}`;
};

/** Read a stored custom palette. Anything invalid, or without land colours, gives undefined. */
export const decodeCustomPalette = (text: string): Palette | undefined => {
  const [seaText, landText, ...rest] = text.split('_');
  if (rest.length || landText === undefined) return undefined;
  const parse = (part: string): {colours: string[], at?: number[]} | undefined => {
    if (part === '') return {colours: []};
    const items = part.split('-').map(item => STOP.exec(item));
    if (items.some(m => !m)) return undefined;
    const colours = items.map(m => '#' + m![1].toLowerCase());
    const placed = items.filter(m => m![2] !== undefined).length;
    if (placed === 0) return {colours};
    if (placed !== items.length) return undefined;
    const at = items.map(m => parseFloat(m![2]) / 100);
    if (at.some((t, i) => t > 1 || (i > 0 && t < at[i - 1]))) return undefined;
    return fromStops(toStops(colours, at));
  };
  const sea = parse(seaText), land = parse(landText);
  if (!sea || !land || !land.colours.length) return undefined;
  return {
    id: CUSTOM_ID, label: 'Custom',
    sea: sea.colours.length ? sea.colours : undefined, seaAt: sea.colours.length ? sea.at : undefined,
    land: land.colours, landAt: land.at,
  };
};

/** What "Custom" starts as: a copy of Globe. */
export const defaultCustomPalette = (): Palette => {
  const globe = getPalette('globe');
  return {id: CUSTOM_ID, label: 'Custom', sea: [...globe.sea!], land: [...globe.land]};
};

/**
 * The palette with its colours the other way up. Sea and land are each reversed in place,
 * so the sea ramp still covers the sea floor and the switch stays at 0 m.
 */
export const invertPalette = (palette: Palette): Palette => ({
  ...palette,
  sea: palette.sea ? [...palette.sea].reverse() : undefined,
  seaAt: palette.seaAt ? palette.seaAt.map(t => 1 - t).reverse() : undefined,
  land: [...palette.land].reverse(),
  landAt: palette.landAt ? palette.landAt.map(t => 1 - t).reverse() : undefined,
});

/** A built-in palette as a Custom one, for the "Edit" button: the same colours in the same places. */
export const editablePalette = (palette: Palette): Palette => ({
  id: CUSTOM_ID, label: 'Custom',
  sea: palette.sea ? palette.sea.map(c => c.toLowerCase()) : undefined,
  seaAt: palette.sea && palette.seaAt ? [...palette.seaAt] : undefined,
  land: palette.land.map(c => c.toLowerCase()),
  landAt: palette.landAt ? [...palette.landAt] : undefined,
});

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
