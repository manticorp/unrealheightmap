/**
 * Contour lines from a heights grid (metres, row-major, row 0 = north) and
 * writers for SVG (printing / laser cutting) and DXF (CAD).
 *
 * Coordinates are in pixel space: x in 0..width-1, y in 0..height-1 with y
 * pointing south, i.e. sample (x, y) sits at exactly (x, y).
 *
 * Everything here is pure so it can run in the worker and be unit tested.
 */

export type ContourRing = {
  /** Interleaved x0,y0,x1,y1... in pixel coordinates. Closed rings do not repeat the first point. */
  points: Float32Array;
  closed: boolean;
};

export type Contour = {
  level: number;
  rings: ContourRing[];
};

export type TraceOptions = {
  /**
   * false: ordinary isolines that stay open where they leave the grid.
   * true: the outline of the region h >= level, closed along the raster border
   * (as if the grid were surrounded by a bottomless moat). Outer rings have a
   * positive signed area in pixel coordinates, holes a negative one.
   */
  closed: boolean;
};

/** Multiples of `interval` (offset by `base`) strictly above `min` and at or below `max`. */
export const contourLevels = (min: number, max: number, interval: number, base = 0): number[] => {
  if (!(interval > 0) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return [];
  }
  const levels: number[] = [];
  let k = Math.floor((min - base) / interval) + 1;
  // Hard cap so a tiny interval cannot hang the worker
  for (let n = 0; n < 10000; n++, k++) {
    // Rounding keeps 0.1 * 3 printing as 0.3 rather than 0.30000000000000004
    const level = Math.round((base + k * interval) * 1e9) / 1e9;
    if (level > max) {
      break;
    }
    if (level > min) {
      levels.push(level);
    }
  }
  return levels;
};

/**
 * A few passes of a separable [1 2 1] / 4 blur (approaching a gaussian) to
 * knock DEM noise and stair-stepping out of contours. Edges are clamped.
 */
export const smoothHeights = (heights: Float32Array, width: number, height: number, passes: number): Float32Array => {
  let src = new Float32Array(heights);
  if (passes <= 0 || width < 2 || height < 2) {
    return src;
  }
  let dst = new Float32Array(src.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const l = src[row + Math.max(0, x - 1)];
        const r = src[row + Math.min(width - 1, x + 1)];
        dst[row + x] = (l + 2 * src[row + x] + r) * 0.25;
      }
    }
    for (let y = 0; y < height; y++) {
      const up = Math.max(0, y - 1) * width;
      const down = Math.min(height - 1, y + 1) * width;
      const row = y * width;
      for (let x = 0; x < width; x++) {
        src[row + x] = (dst[up + x] + 2 * dst[row + x] + dst[down + x]) * 0.25;
      }
    }
  }
  return src;
};

/**
 * Marching squares segment table. Cell corners clockwise on screen are
 * tl=0, tr=1, br=2, bl=3 (inside bits 1, 2, 4, 8); edge k runs from corner k
 * to corner k+1 (top, right, bottom, left). Segments go from an edge where a
 * clockwise walk leaves the region to one where it re-enters, which keeps the
 * region on the right of travel (y down) and therefore outer rings clockwise
 * on screen. Saddles pair with the next (centre inside) or previous (centre
 * outside) crossing.
 */
const SEGMENTS: number[][] = (() => {
  const table: number[][] = [];
  for (let centreIn = 0; centreIn < 2; centreIn++) {
    for (let mask = 0; mask < 16; mask++) {
      const inside = (c: number) => (mask >> (c & 3)) & 1;
      const exits: number[] = [];
      const enters: number[] = [];
      for (let k = 0; k < 4; k++) {
        if (inside(k) && !inside(k + 1)) exits.push(k);
        if (!inside(k) && inside(k + 1)) enters.push(k);
      }
      const segs: number[] = [];
      for (const e of exits) {
        let to = enters[0];
        if (enters.length > 1) {
          to = centreIn ? (e + 1) & 3 : (e + 3) & 3;
        }
        segs.push(e, to);
      }
      table[centreIn * 16 + mask] = segs;
    }
  }
  return table;
})();

// Far below any real terrain but finite, so interpolation never divides infinities
const MOAT = -1e30;

const pad = (heights: Float32Array, width: number, height: number): Float32Array => {
  const pw = width + 2;
  const out = new Float32Array(pw * (height + 2)).fill(MOAT);
  for (let y = 0; y < height; y++) {
    const src = y * width;
    const dst = (y + 1) * pw + 1;
    for (let x = 0; x < width; x++) {
      const v = heights[src + x];
      out[dst + x] = v === v ? v : MOAT;
    }
  }
  return out;
};

/**
 * Trace iso-contours for each level. Runs in O(cells) per level: segments are
 * linked by the grid edge they cross (each crossing edge has exactly one
 * segment arriving and one leaving), so stitching needs no hashing or search.
 */
export const traceContours = (
  heights: Float32Array,
  width: number,
  height: number,
  levels: number[],
  options: TraceOptions,
): Contour[] => {
  const closed = options.closed;
  const grid = closed ? pad(heights, width, height) : heights;
  const W = closed ? width + 2 : width;
  const H = closed ? height + 2 : height;
  const shift = closed ? 1 : 0;
  if (W < 2 || H < 2) {
    return levels.map(level => ({level, rings: []}));
  }

  // Horizontal edges first (between (x,y) and (x+1,y)), then vertical (between (x,y) and (x,y+1))
  const hCount = H * (W - 1);
  const edgeCount = hCount + (H - 1) * W;
  const next = new Int32Array(edgeCount).fill(-1);
  const hasPrev = new Uint8Array(edgeCount);
  const starts: number[] = [];

  const edgeOf = (cellX: number, cellY: number, k: number): number => {
    switch (k) {
      case 0: return cellY * (W - 1) + cellX;
      case 1: return hCount + cellY * W + cellX + 1;
      case 2: return (cellY + 1) * (W - 1) + cellX;
      default: return hCount + cellY * W + cellX;
    }
  };

  const pointOf = (edge: number, level: number, out: number[]): void => {
    let x: number, y: number, a: number, b: number;
    if (edge < hCount) {
      y = Math.floor(edge / (W - 1));
      x = edge - y * (W - 1);
      a = grid[y * W + x];
      b = grid[y * W + x + 1];
      out.push(x + (level - a) / (b - a) - shift, y - shift);
    } else {
      const e = edge - hCount;
      y = Math.floor(e / W);
      x = e - y * W;
      a = grid[y * W + x];
      b = grid[(y + 1) * W + x];
      out.push(x - shift, y + (level - a) / (b - a) - shift);
    }
  };

  const contours: Contour[] = [];
  for (const level of levels) {
    starts.length = 0;
    for (let y = 0; y < H - 1; y++) {
      const row = y * W;
      for (let x = 0; x < W - 1; x++) {
        const tl = grid[row + x];
        const tr = grid[row + x + 1];
        const br = grid[row + W + x + 1];
        const bl = grid[row + W + x];
        const mask = (tl >= level ? 1 : 0) | (tr >= level ? 2 : 0) | (br >= level ? 4 : 0) | (bl >= level ? 8 : 0);
        if (mask === 0 || mask === 15) {
          continue;
        }
        let centreIn = 0;
        if (mask === 5 || mask === 10) {
          centreIn = (tl + tr + br + bl) * 0.25 >= level ? 1 : 0;
        }
        const segs = SEGMENTS[centreIn * 16 + mask];
        for (let i = 0; i < segs.length; i += 2) {
          const from = edgeOf(x, y, segs[i]);
          const to = edgeOf(x, y, segs[i + 1]);
          next[from] = to;
          hasPrev[to] = 1;
          starts.push(from);
        }
      }
    }

    const rings: ContourRing[] = [];
    const trace = (start: number, isLoop: boolean) => {
      const pts: number[] = [];
      let e = start;
      while (true) {
        pointOf(e, level, pts);
        const n = next[e];
        next[e] = -1;
        if (n < 0 || (isLoop && n === start)) {
          break;
        }
        e = n;
      }
      rings.push({points: dedupe(pts, isLoop), closed: isLoop});
    };
    // Open chains begin where nothing arrives (only possible at the grid edge)
    for (const s of starts) {
      if (next[s] >= 0 && !hasPrev[s]) {
        trace(s, false);
      }
    }
    for (const s of starts) {
      if (next[s] >= 0) {
        trace(s, true);
      }
    }
    // Chain ends never appear in `starts`, so clear the whole flag array
    hasPrev.fill(0);
    contours.push({level, rings: rings.filter(r => r.points.length >= (r.closed ? 6 : 4))});
  }
  return contours;
};

/** Drop consecutive duplicates (from samples exactly on a level, or the moat). */
const dedupe = (pts: number[], closed: boolean): Float32Array => {
  const out: number[] = [];
  for (let i = 0; i < pts.length; i += 2) {
    const n = out.length;
    if (n >= 2 && Math.abs(out[n - 2] - pts[i]) < 1e-6 && Math.abs(out[n - 1] - pts[i + 1]) < 1e-6) {
      continue;
    }
    out.push(pts[i], pts[i + 1]);
  }
  if (closed && out.length >= 4) {
    const n = out.length;
    if (Math.abs(out[0] - out[n - 2]) < 1e-6 && Math.abs(out[1] - out[n - 1]) < 1e-6) {
      out.length = n - 2;
    }
  }
  return new Float32Array(out);
};

/** Shoelace area in pixel coordinates; positive for outer rings from closed tracing. */
export const ringSignedArea = (points: Float32Array): number => {
  let sum = 0;
  const n = points.length;
  for (let i = 0; i < n; i += 2) {
    const j = (i + 2) % n;
    sum += points[i] * points[j + 1] - points[j] * points[i + 1];
  }
  return sum / 2;
};

/**
 * Douglas–Peucker with an explicit stack (long contours on big grids would
 * overflow recursion). Endpoints are kept; closed rings are split at their
 * first point and the point farthest from it so both halves have fixed ends.
 */
export const simplifyPolyline = (points: Float32Array, closed: boolean, tolerance: number): Float32Array => {
  const n = points.length / 2;
  if (n < 3 || !(tolerance > 0)) {
    return points;
  }
  const keep = new Uint8Array(n + 1);
  // For closed rings, index n is the first point again
  const px = (i: number) => points[(i % n) * 2];
  const py = (i: number) => points[(i % n) * 2 + 1];
  const last = closed ? n : n - 1;
  keep[0] = 1;
  keep[last] = 1;
  const stack: number[] = [];
  if (closed) {
    let far = 1;
    let best = -1;
    for (let i = 1; i < n; i++) {
      const d = (px(i) - px(0)) ** 2 + (py(i) - py(0)) ** 2;
      if (d > best) {
        best = d;
        far = i;
      }
    }
    keep[far] = 1;
    stack.push(0, far, far, n);
  } else {
    stack.push(0, last);
  }
  const tol2 = tolerance * tolerance;
  while (stack.length) {
    const b = stack.pop();
    const a = stack.pop();
    if (b - a < 2) {
      continue;
    }
    const ax = px(a), ay = py(a);
    const dx = px(b) - ax, dy = py(b) - ay;
    const len2 = dx * dx + dy * dy;
    let worst = -1;
    let worstD = -1;
    for (let i = a + 1; i < b; i++) {
      const ex = px(i) - ax, ey = py(i) - ay;
      let d: number;
      if (len2 === 0) {
        d = ex * ex + ey * ey;
      } else {
        const cross = ex * dy - ey * dx;
        d = cross * cross / len2;
      }
      if (d > worstD) {
        worstD = d;
        worst = i;
      }
    }
    if (worstD > tol2) {
      keep[worst] = 1;
      stack.push(a, worst, worst, b);
    }
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    if (keep[i]) {
      out.push(points[i * 2], points[i * 2 + 1]);
    }
  }
  return new Float32Array(out);
};

/** Simplify every ring, dropping ones that collapse to nothing. */
export const simplifyContours = (contours: Contour[], tolerance = 0.25): Contour[] =>
  contours.map(c => ({
    level: c.level,
    rings: c.rings
      .map(r => ({closed: r.closed, points: simplifyPolyline(r.points, r.closed, tolerance)}))
      .filter(r => r.points.length >= (r.closed ? 6 : 4)),
  }));

// --- Writers ---------------------------------------------------------------

/** Major (index) contours sit on multiples of interval * majorEvery, the usual map convention. */
const isMajor = (level: number, interval: number, majorEvery: number): boolean => {
  if (!(majorEvery > 1) || !(interval > 0)) {
    return false;
  }
  const q = level / (interval * majorEvery);
  return Math.abs(q - Math.round(q)) < 1e-6;
};

/** Smallest gap between consecutive levels, used when the caller does not say. */
const inferInterval = (contours: Contour[]): number => {
  let best = Infinity;
  for (let i = 1; i < contours.length; i++) {
    const gap = Math.abs(contours[i].level - contours[i - 1].level);
    if (gap > 1e-9 && gap < best) {
      best = gap;
    }
  }
  return Number.isFinite(best) ? best : 0;
};

const fmt = (v: number, decimals: number): string => {
  const s = v.toFixed(decimals).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
};

const levelLabel = (level: number): string => fmt(level, 3);

const levelId = (level: number): string => 'level_' + levelLabel(level).replace('-', 'minus').replace('.', '_') + 'm';

const escapeXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

type SheetSize = {scale: number, widthMm: number, heightMm: number};

const sheetSize = (width: number, height: number, outputWidthMm: number): SheetSize => {
  const scale = outputWidthMm / Math.max(1, width - 1);
  return {scale, widthMm: outputWidthMm, heightMm: Math.max(1, height - 1) * scale};
};

const ringsToPathData = (rings: ContourRing[], scale: number): string => {
  const parts: string[] = [];
  for (const ring of rings) {
    const p = ring.points;
    let d = 'M' + fmt(p[0] * scale, 3) + ' ' + fmt(p[1] * scale, 3);
    for (let i = 2; i < p.length; i += 2) {
      d += 'L' + fmt(p[i] * scale, 3) + ' ' + fmt(p[i + 1] * scale, 3);
    }
    parts.push(ring.closed ? d + 'Z' : d);
  }
  return parts.join('');
};

const svgOpen = (size: SheetSize, title?: string): string =>
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"' +
  ` version="1.1" width="${fmt(size.widthMm, 3)}mm" height="${fmt(size.heightMm, 3)}mm"` +
  ` viewBox="0 0 ${fmt(size.widthMm, 3)} ${fmt(size.heightMm, 3)}">\n` +
  (title ? `<title>${escapeXml(title)}</title>\n` : '');

// Laser cutter conventions: red hairline cuts, blue lines are engraved / scored
const CUT = 'fill="none" fill-rule="evenodd" stroke="#ff0000" stroke-width="0.01"';
const ENGRAVE = 'fill="none" stroke="#0000ff" stroke-width="0.01"';

export type SvgOptions = {
  /** Grid size in pixels, as passed to traceContours. */
  width: number;
  height: number;
  /** Physical width of the drawing; height follows the grid's aspect ratio. */
  outputWidthMm: number;
  /** 'lines' for a printable topo map, 'layers' for cut outlines of each level. */
  mode: 'lines' | 'layers';
  /** Every Nth multiple of the interval is drawn thicker (lines mode). Default 5; 0 disables. */
  majorEvery?: number;
  /** Contour spacing in metres; inferred from the levels when omitted. */
  interval?: number;
  /** Minor contour stroke width in mm (lines mode). Default 0.15. */
  strokeMm?: number;
  title?: string;
};

/** One SVG with an Inkscape layer per level. */
export const contoursToSvg = (contours: Contour[], options: SvgOptions): string => {
  const size = sheetSize(options.width, options.height, options.outputWidthMm);
  const stroke = options.strokeMm > 0 ? options.strokeMm : 0.15;
  const majorEvery = options.majorEvery === undefined ? 5 : options.majorEvery;
  const interval = options.interval > 0 ? options.interval : inferInterval(contours);
  let out = svgOpen(size, options.title);
  for (const c of contours) {
    const label = levelLabel(c.level);
    out += `<g id="${levelId(c.level)}" inkscape:groupmode="layer" inkscape:label="${label} m">`;
    if (c.rings.length) {
      const d = ringsToPathData(c.rings, size.scale);
      if (options.mode === 'layers') {
        out += `<path d="${d}" ${CUT}/>`;
      } else {
        const w = isMajor(c.level, interval, majorEvery) ? stroke * 2.5 : stroke;
        out += `<path d="${d}" fill="none" stroke="#000000" stroke-width="${fmt(w, 3)}"` +
          ' stroke-linejoin="round" stroke-linecap="round"/>';
      }
    }
    out += '</g>\n';
  }
  return out + '</svg>\n';
};

export type LayerSheetOptions = {
  width: number;
  height: number;
  outputWidthMm: number;
  /** Engrave small crosses in two opposite corners of every sheet so the stack lines up. Default true. */
  registrationMarks?: boolean;
  /** Engrave the outline of the next level up as a gluing guide. Default true. */
  engraveNextLevel?: boolean;
  title?: string;
};

/**
 * One SVG per level for laser cutting: the cut outline of the region at or
 * above that level. Pass contours traced with {closed: true}. Empty levels are
 * skipped.
 */
export const contourLayerSvgs = (contours: Contour[], options: LayerSheetOptions): {name: string, svg: string}[] => {
  const size = sheetSize(options.width, options.height, options.outputWidthMm);
  const marks = options.registrationMarks !== false;
  const guide = options.engraveNextLevel !== false;
  const arm = Math.min(3, size.widthMm / 20, size.heightMm / 20);
  const cross = (x: number, y: number) =>
    `M${fmt(x - arm, 3)} ${fmt(y, 3)}L${fmt(x + arm, 3)} ${fmt(y, 3)}M${fmt(x, 3)} ${fmt(y - arm, 3)}L${fmt(x, 3)} ${fmt(y + arm, 3)}`;
  const markPath = cross(arm * 1.5, arm * 1.5) + cross(size.widthMm - arm * 1.5, size.heightMm - arm * 1.5);

  const sheets: {name: string, svg: string}[] = [];
  const nonEmpty = contours.filter(c => c.rings.length > 0);
  const digits = Math.max(2, String(nonEmpty.length).length);
  nonEmpty.forEach((c, i) => {
    const label = levelLabel(c.level);
    const title = (options.title ? options.title + ' – ' : '') + `${label} m`;
    let svg = svgOpen(size, title);
    svg += `<g id="${levelId(c.level)}" inkscape:groupmode="layer" inkscape:label="${label} m">`;
    svg += `<path id="cut" d="${ringsToPathData(c.rings, size.scale)}" ${CUT}/>`;
    const above = nonEmpty[i + 1];
    if (guide && above) {
      svg += `<path id="next_level" d="${ringsToPathData(above.rings, size.scale)}" ${ENGRAVE}/>`;
    }
    if (marks) {
      svg += `<path id="registration" d="${markPath}" ${ENGRAVE}/>`;
    }
    svg += '</g>\n</svg>\n';
    const index = String(i + 1);
    const name = 'layer_' + '0'.repeat(Math.max(0, digits - index.length)) + index + '_' +
      label.replace('-', 'minus').replace('.', '_') + 'm.svg';
    sheets.push({name, svg});
  });
  return sheets;
};

export type DxfOptions = {
  width: number;
  height: number;
  /** Ground size of the whole grid in metres. */
  physWidth: number;
  physHeight: number;
  /** Every Nth multiple of the interval goes on a red index colour. Default 5; 0 disables. */
  majorEvery?: number;
  interval?: number;
};

/** "CONTOUR_0123", "CONTOUR_M0012" for -12 m, "CONTOUR_0012_5" for 12.5 m. */
export const dxfLayerName = (level: number): string => {
  const label = levelLabel(Math.abs(level));
  const [whole, frac] = label.split('.');
  const padded = '0'.repeat(Math.max(0, 4 - whole.length)) + whole;
  return 'CONTOUR_' + (level < 0 ? 'M' : '') + padded + (frac ? '_' + frac : '');
};

/**
 * AutoCAD R12 ASCII DXF (the most widely readable flavour) with one
 * POLYLINE per ring at its contour elevation. Metres, origin at the
 * south-west corner, +y north.
 */
export const contoursToDxf = (contours: Contour[], options: DxfOptions): string => {
  const sx = options.physWidth / Math.max(1, options.width - 1);
  const sy = options.physHeight / Math.max(1, options.height - 1);
  const top = options.height - 1;
  const majorEvery = options.majorEvery === undefined ? 5 : options.majorEvery;
  const interval = options.interval > 0 ? options.interval : inferInterval(contours);
  const lines: string[] = [];
  const pair = (code: number, value: string | number) => {
    lines.push(String(code), String(value));
  };
  const num = (v: number) => fmt(v, 4);

  const zs = contours.map(c => c.level);
  const zMin = zs.length ? Math.min(...zs) : 0;
  const zMax = zs.length ? Math.max(...zs) : 0;

  pair(0, 'SECTION'); pair(2, 'HEADER');
  pair(9, '$ACADVER'); pair(1, 'AC1009');
  pair(9, '$INSUNITS'); pair(70, 6);
  pair(9, '$EXTMIN'); pair(10, 0); pair(20, 0); pair(30, num(zMin));
  pair(9, '$EXTMAX'); pair(10, num(options.physWidth)); pair(20, num(options.physHeight)); pair(30, num(zMax));
  pair(0, 'ENDSEC');

  pair(0, 'SECTION'); pair(2, 'TABLES');
  pair(0, 'TABLE'); pair(2, 'LTYPE'); pair(70, 1);
  pair(0, 'LTYPE'); pair(2, 'CONTINUOUS'); pair(70, 0); pair(3, 'Solid line'); pair(72, 65); pair(73, 0); pair(40, 0);
  pair(0, 'ENDTAB');
  pair(0, 'TABLE'); pair(2, 'LAYER'); pair(70, contours.length + 1);
  pair(0, 'LAYER'); pair(2, '0'); pair(70, 0); pair(62, 7); pair(6, 'CONTINUOUS');
  for (const c of contours) {
    pair(0, 'LAYER'); pair(2, dxfLayerName(c.level)); pair(70, 0);
    // 1 = red for index contours, 8 = grey for the rest
    pair(62, isMajor(c.level, interval, majorEvery) ? 1 : 8); pair(6, 'CONTINUOUS');
  }
  pair(0, 'ENDTAB');
  pair(0, 'ENDSEC');

  pair(0, 'SECTION'); pair(2, 'ENTITIES');
  for (const c of contours) {
    const layer = dxfLayerName(c.level);
    const z = num(c.level);
    for (const ring of c.rings) {
      pair(0, 'POLYLINE'); pair(8, layer); pair(66, 1);
      pair(10, 0); pair(20, 0); pair(30, z);
      pair(70, ring.closed ? 1 : 0);
      const p = ring.points;
      for (let i = 0; i < p.length; i += 2) {
        pair(0, 'VERTEX'); pair(8, layer);
        pair(10, num(p[i] * sx)); pair(20, num((top - p[i + 1]) * sy)); pair(30, z);
      }
      pair(0, 'SEQEND'); pair(8, layer);
    }
  }
  pair(0, 'ENDSEC');
  pair(0, 'EOF');
  return lines.join('\n') + '\n';
};
