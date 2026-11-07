/**
 * Adaptive terrain simplification with a right-triangulated irregular network
 * (RTIN), after Mapbox's "martini", extended to rectangles by tiling.
 *
 * The height grid is resampled (bilinear, corner to corner) onto n x m square
 * tiles of 2^k cells each, so the result covers exactly the input rectangle
 * without padding. Every tile is a binary tree of right triangles. A triangle
 * is kept whole only if every grid point inside it is within `maxError` of its
 * plane, and splits are propagated across shared edges (including tile edges),
 * so the triangulation never has cracks or T-junctions.
 */

export type SimplifiedSurface = {
  /** Per vertex, 0..1 from west to east. */
  u: Float32Array;
  /** Per vertex, 0..1 from north to south (row order). */
  v: Float32Array;
  /** Per vertex, same units as the input heights. */
  heights: Float32Array;
  /** Anticlockwise seen from above (north up). */
  indices: Uint32Array;
  /** Boundary vertices, anticlockwise seen from above, starting at the south-west corner. */
  perimeter: Uint32Array;
  /** The resampled grid the triangulation was built on. */
  gridWidth: number;
  gridHeight: number;
};

export type RtinLayout = {
  /** Cells per tile side (a power of two). */
  tileSize: number;
  tilesX: number;
  tilesY: number;
  gridWidth: number;
  gridHeight: number;
};

/**
 * Pick a tile size that covers the grid with little upsampling and few tiles.
 * Each tile is at least two triangles, so fewer tiles = coarser possible mesh.
 */
export const rtinLayout = (width: number, height: number): RtinLayout => {
  const cw = Math.max(1, width - 1);
  const ch = Math.max(1, height - 1);
  let best: RtinLayout | null = null;
  let bestScore = Infinity;
  for (let k = 0; k <= 12; k++) {
    const tileSize = 1 << k;
    const tilesX = Math.ceil(cw / tileSize);
    const tilesY = Math.ceil(ch / tileSize);
    const upsampling = (tilesX * tileSize * tilesY * tileSize) / (cw * ch);
    const score = upsampling * (1 + 0.02 * tilesX * tilesY);
    if (score < bestScore) {
      bestScore = score;
      best = {tileSize, tilesX, tilesY, gridWidth: tilesX * tileSize + 1, gridHeight: tilesY * tileSize + 1};
    }
  }
  return best!;
};

/** Bilinear resample, mapping corner samples to corner samples. */
export const resampleGrid = (src: Float32Array, width: number, height: number, outW: number, outH: number): Float32Array => {
  if (outW === width && outH === height) return src;
  const out = new Float32Array(outW * outH);
  const sx = (width - 1) / Math.max(1, outW - 1);
  const sy = (height - 1) / Math.max(1, outH - 1);
  for (let j = 0; j < outH; j++) {
    const fy = j * sy;
    const y0 = Math.min(height - 1, Math.floor(fy));
    const y1 = Math.min(height - 1, y0 + 1);
    const ty = fy - y0;
    for (let i = 0; i < outW; i++) {
      const fx = i * sx;
      const x0 = Math.min(width - 1, Math.floor(fx));
      const x1 = Math.min(width - 1, x0 + 1);
      const tx = fx - x0;
      const top = src[y0 * width + x0] * (1 - tx) + src[y0 * width + x1] * tx;
      const bottom = src[y1 * width + x0] * (1 - tx) + src[y1 * width + x1] * tx;
      out[j * outW + i] = top * (1 - ty) + bottom * ty;
    }
  }
  return out;
};

class GrowableUint32 {
  data = new Uint32Array(1024);
  length = 0;
  push(value: number) {
    if (this.length === this.data.length) {
      const next = new Uint32Array(this.data.length * 2);
      next.set(this.data);
      this.data = next;
    }
    this.data[this.length++] = value;
  }
  toArray() {
    return this.data.slice(0, this.length);
  }
}

// Row extent of a triangle, clipped edge by edge (integer maths, so exact)
let rowLo = 0;
let rowHi = 0;
const clipRow = (px: number, py: number, qx: number, qy: number, y: number, s: number) => {
  const A = s * (qy - py);
  const B = s * (qx - px) * (y - py);
  if (A > 0) {
    const x = px + Math.floor(B / A);
    if (x < rowHi) rowHi = x;
  } else if (A < 0) {
    const x = px + Math.ceil(B / A);
    if (x > rowLo) rowLo = x;
  } else if (B < 0) {
    rowLo = 1;
    rowHi = 0;
  }
};

/** Largest distance of a grid point inside triangle abc from its plane, stopping early past `limit`. */
const triangleError = (h: Float32Array, gw: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, limit: number): number => {
  const ha = h[ay * gw + ax];
  const ux = bx - ax, uy = by - ay, vx = cx - ax, vy = cy - ay;
  const det = ux * vy - uy * vx;
  const dzb = h[by * gw + bx] - ha, dzc = h[cy * gw + cx] - ha;
  const gx = (dzb * vy - dzc * uy) / det;
  const gy = (ux * dzc - vx * dzb) / det;
  const s = det > 0 ? 1 : -1;
  const minX = Math.min(ax, bx, cx), maxX = Math.max(ax, bx, cx);
  const maxY = Math.max(ay, by, cy);
  let worst = 0;
  for (let y = Math.min(ay, by, cy); y <= maxY; y++) {
    rowLo = minX;
    rowHi = maxX;
    clipRow(ax, ay, bx, by, y, s);
    clipRow(bx, by, cx, cy, y, s);
    clipRow(cx, cy, ax, ay, y, s);
    const row = y * gw;
    const base = ha + gy * (y - ay) - gx * ax;
    for (let x = rowLo; x <= rowHi; x++) {
      const d = Math.abs(h[row + x] - (base + gx * x));
      if (d > worst) {
        worst = d;
        if (worst > limit) return worst;
      }
    }
  }
  return worst;
};

/**
 * Error per hypotenuse midpoint: an upper bound on how far grid points inside
 * the triangles split there are from those triangles' planes, or Infinity if
 * a finer split depends on it. Split where error > maxError.
 *
 * A triangle's error is at most its children's plus the midpoint's offset from
 * the hypotenuse, so most triangles never need scanning; only when that bound
 * is over the tolerance is the triangle checked point by point.
 *
 * Levels are visited finest first, so a midpoint is final before any larger
 * triangle reads it. For each square size L: "diamond" triangles (hypotenuse
 * = a square's edge, apex = its centre), then "square" triangles (the square
 * halved along the diagonal that points at its parent square's centre).
 */
const computeErrors = (h: Float32Array, layout: RtinLayout, maxError: number): Float32Array => {
  const {tileSize, gridWidth: gw, gridHeight: gh} = layout;
  const errors = new Float32Array(gw * gh);
  let finest = true;
  const visit = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
    const mi = ((ay + by) >> 1) * gw + ((ax + bx) >> 1);
    if (errors[mi] > maxError) return;
    let error = Math.abs(h[mi] - (h[ay * gw + ax] + h[by * gw + bx]) / 2);
    if (!finest) {
      const left = errors[((ay + cy) >> 1) * gw + ((ax + cx) >> 1)];
      const right = errors[((by + cy) >> 1) * gw + ((bx + cx) >> 1)];
      if (left > maxError || right > maxError) {
        error = Infinity;
      } else {
        error += Math.max(left, right);
        if (error > maxError) error = triangleError(h, gw, ax, ay, bx, by, cx, cy, maxError);
      }
    }
    if (error > errors[mi]) errors[mi] = error;
  };

  for (let L = 2; L <= tileSize; L *= 2) {
    const s = L >> 1;
    finest = L === 2;
    for (let y = 0; y < gh; y += L) {
      for (let x = s; x < gw; x += L) {
        if (y > 0) visit(x - s, y, x + s, y, x, y - s);
        if (y < gh - 1) visit(x - s, y, x + s, y, x, y + s);
      }
    }
    for (let y = s; y < gh; y += L) {
      for (let x = 0; x < gw; x += L) {
        if (x > 0) visit(x, y - s, x, y + s, x - s, y);
        if (x < gw - 1) visit(x, y - s, x, y + s, x + s, y);
      }
    }
    finest = false;
    for (let y0 = 0; y0 < gh - 1; y0 += L) {
      const y1 = y0 + L;
      for (let x0 = 0; x0 < gw - 1; x0 += L) {
        const x1 = x0 + L;
        let ax = x0, ay = y0;
        if (L < tileSize) {
          // the corner at the parent square's centre sits on odd multiples of L
          if (!((x0 / L) & 1)) ax = x1;
          if (!((y0 / L) & 1)) ay = y1;
        }
        const bx = x0 + x1 - ax, by = y0 + y1 - ay;
        visit(ax, ay, bx, by, ax, by);
        visit(ax, ay, bx, by, bx, ay);
      }
    }
  }
  return errors;
};

/**
 * Triangulate a height grid so that every grid sample is within `maxError`
 * (same units as the heights) of the surface. maxError = 0 still merges
 * exactly planar areas.
 */
export const simplifyGrid = (heights: Float32Array, width: number, height: number, maxError: number): SimplifiedSurface => {
  const layout = rtinLayout(width, height);
  const {tileSize, tilesX, tilesY, gridWidth: gw, gridHeight: gh} = layout;
  const h = resampleGrid(heights, width, height, gw, gh);
  const tolerance = Math.max(0, maxError);
  const errors = computeErrors(h, layout, tolerance);

  const vertexIds = new Uint32Array(gw * gh); // index + 1, 0 = unused
  const cells = new GrowableUint32();
  const tris = new GrowableUint32();
  const vertex = (x: number, y: number) => {
    const k = y * gw + x;
    if (!vertexIds[k]) {
      cells.push(k);
      vertexIds[k] = cells.length;
    }
    return vertexIds[k] - 1;
  };
  const walk = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
    if (Math.abs(ax - cx) + Math.abs(ay - cy) > 1) {
      const mx = (ax + bx) >> 1;
      const my = (ay + by) >> 1;
      if (errors[my * gw + mx] > tolerance) {
        walk(cx, cy, ax, ay, mx, my);
        walk(bx, by, cx, cy, mx, my);
        return;
      }
    }
    // Rows run north to south, so clockwise in grid coordinates is anticlockwise from above
    tris.push(vertex(ax, ay));
    tris.push(vertex(bx, by));
    tris.push(vertex(cx, cy));
  };
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const x0 = tx * tileSize, y0 = ty * tileSize, x1 = x0 + tileSize, y1 = y0 + tileSize;
      walk(x0, y0, x1, y1, x1, y0);
      walk(x1, y1, x0, y0, x0, y1);
    }
  }

  const count = cells.length;
  const u = new Float32Array(count);
  const v = new Float32Array(count);
  const outHeights = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const k = cells.data[i];
    const x = k % gw;
    const y = (k - x) / gw;
    u[i] = x / (gw - 1);
    v[i] = y / (gh - 1);
    outHeights[i] = h[k];
  }

  // Same order as the full grid: south edge west->east, east edge south->north,
  // north edge east->west, west edge north->south
  const perimeter = new GrowableUint32();
  const take = (x: number, y: number) => {
    const id = vertexIds[y * gw + x];
    if (id) perimeter.push(id - 1);
  };
  for (let x = 0; x < gw - 1; x++) take(x, gh - 1);
  for (let y = gh - 1; y > 0; y--) take(gw - 1, y);
  for (let x = gw - 1; x > 0; x--) take(x, 0);
  for (let y = 0; y < gh - 1; y++) take(0, y);

  return {
    u,
    v,
    heights: outHeights,
    indices: tris.toArray(),
    perimeter: perimeter.toArray(),
    gridWidth: gw,
    gridHeight: gh,
  };
};
