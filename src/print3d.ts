/**
 * Extras for 3D printing:
 *  - colour bands: the solid split into stacked parts by height, written as a
 *    multi-part 3MF so a multi-colour printer (or filament swaps) can give
 *    lowlands, slopes and peaks their own colours
 *  - a raised label on a plinth in front of the model (name, coordinates, scale)
 *  - lithophanes: a thin plate whose thickness follows the hillshade, so the
 *    terrain appears when it's held up to the light
 */

import {Mesh, MeshInput, MeshOptions, buildMesh} from './mesh';

/* ------------------------------ mesh helpers ------------------------------ */

/** Join meshes into one (metadata from the first). */
export const mergeMeshes = (meshes: Mesh[]): Mesh => {
  const first = meshes[0];
  let vCount = 0, iCount = 0;
  for (const m of meshes) { vCount += m.positions.length; iCount += m.indices.length; }
  const positions = new Float32Array(vCount);
  const uvs = new Float32Array(vCount / 3 * 2);
  const indices = new Uint32Array(iCount);
  let vo = 0, io = 0;
  for (const m of meshes) {
    positions.set(m.positions, vo);
    uvs.set(m.uvs, vo / 3 * 2);
    const base = vo / 3;
    for (let k = 0; k < m.indices.length; k++) indices[io + k] = m.indices[k] + base;
    vo += m.positions.length;
    io += m.indices.length;
  }
  return {...first, positions, uvs, indices};
};

/**
 * Merge vertices at the same position (walls and floors have their own copies
 * for crisp shading), so the mesh is one connected, manifold surface: what 3MF
 * and slicers expect. Degenerate triangles are dropped.
 */
export const weldMesh = (mesh: Mesh, tolerance = 1e-4): Mesh => {
  const p = mesh.positions;
  const map = new Map<string, number>();
  const remap = new Uint32Array(p.length / 3);
  const positions: number[] = [];
  const inv = 1 / tolerance;
  // buildMesh solids end with: 4 wall vertices per rim vertex, the floor's centre, then the floor rim.
  // Keep the floor centre apart, so it can't fuse with a terrain vertex sitting on the floor.
  const n = p.length / 3;
  const rim = mesh.topVertexCount > 0 ? (n - mesh.topVertexCount - 1) / 5 : -1;
  const centre = Number.isInteger(rim) && rim > 0 ? mesh.topVertexCount + rim * 4 : -1;
  for (let v = 0; v < n; v++) {
    const key = v === centre ? 'centre' : `${Math.round(p[v * 3] * inv)},${Math.round(p[v * 3 + 1] * inv)},${Math.round(p[v * 3 + 2] * inv)}`;
    let index = map.get(key);
    if (index === undefined) {
      index = positions.length / 3;
      positions.push(p[v * 3], p[v * 3 + 1], p[v * 3 + 2]);
      map.set(key, index);
    }
    remap[v] = index;
  }
  const indices: number[] = [];
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const a = remap[mesh.indices[t]], b = remap[mesh.indices[t + 1]], c = remap[mesh.indices[t + 2]];
    if (a !== b && b !== c && a !== c) indices.push(a, b, c);
  }
  return {...mesh, positions: Float32Array.from(positions), uvs: new Float32Array(positions.length / 3 * 2), indices: Uint32Array.from(indices)};
};

/** Closed boxes [x0, y0, z0, x1, y1, z1] as one mesh (Z-up, outward normals). */
export const boxesMesh = (boxes: number[][], template: Mesh): Mesh => {
  const positions = new Float32Array(boxes.length * 8 * 3);
  const indices = new Uint32Array(boxes.length * 36);
  const faces = [
    [0, 2, 1], [0, 3, 2], // bottom (z0), facing down
    [4, 5, 6], [4, 6, 7], // top
    [0, 1, 5], [0, 5, 4], // y0 side
    [2, 3, 7], [2, 7, 6], // y1 side
    [1, 2, 6], [1, 6, 5], // x1 side
    [3, 0, 4], [3, 4, 7], // x0 side
  ];
  boxes.forEach(([x0, y0, z0, x1, y1, z1], b) => {
    const corners = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    corners.forEach((c, k) => positions.set(c, (b * 8 + k) * 3));
    faces.forEach((f, k) => indices.set(f.map(v => v + b * 8), b * 36 + k * 3));
  });
  return {...template, positions, uvs: new Float32Array(boxes.length * 8 * 2), indices, topVertexCount: 0, vertexHeights: new Float32Array(0)};
};

/* ------------------------------- colour bands ------------------------------ */

/** Heights splitting the range into `count` equal bands. */
export const autoBandLevels = (min: number, max: number, count: number): number[] => {
  const out: number[] = [];
  for (let k = 1; k < count; k++) out.push(min + (max - min) * k / count);
  return out;
};

export type Band = {mesh: Mesh, from: number, to: number, floorZ: number};

/**
 * Stacked solids, one per band: band k is the terrain solid clamped between
 * levels[k-1] and levels[k], sitting exactly on top of the band below.
 */
export const bandMeshes = (input: MeshInput, options: MeshOptions, levels: number[]): Band[] => {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < input.heights.length; i++) {
    const h = input.heights[i];
    if (h < min) min = h;
    if (h > max) max = h;
  }
  const sorted = levels.filter(l => l > min && l < max).sort((a, b) => a - b);
  const edges = [min, ...sorted, max];
  const probe = buildMesh({...input, heights: new Float32Array([0, 0, 0, 0]), width: 2, height: 2}, {...options, resolution: 2, simplify: 0});
  const upm = probe.unitsPerMetre;
  const exag = options.exaggeration > 0 ? options.exaggeration : 1;
  const base = options.solid ? Math.max(0, options.baseThickness || 0) : 0;
  const bands: Band[] = [];
  for (let k = 0; k + 1 < edges.length; k++) {
    const lo = edges[k], hi = edges[k + 1];
    const clamped = new Float32Array(input.heights.length);
    for (let i = 0; i < clamped.length; i++) clamped[i] = Math.min(hi, Math.max(lo, input.heights[i]));
    const floorZ = k === 0 ? 0 : base + (lo - min) * upm * exag;
    const mesh = buildMesh({...input, heights: clamped}, {...options, solid: true, datum: min, floorZ});
    bands.push({mesh, from: lo, to: hi, floorZ});
  }
  return bands;
};

/* ------------------------------- 3MF writer ------------------------------- */

export type ThreeMfObject = {name: string, color: string, mesh: Mesh, /** Merge duplicate vertices (default true). */ weld?: boolean};

const fmt = (n: number) => (Math.round(n * 1000) / 1000).toString();

/** The 3D model XML: one multi-part object (one part per colour), in millimetres. */
export const threeMfModel = (objects: ThreeMfObject[], title: string): string => {
  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>\n');
  parts.push('<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n');
  parts.push(`<metadata name="Title">${title.replace(/[<&>"]/g, '')}</metadata>\n`);
  parts.push('<metadata name="Application">Heightmap Generator (manticorp.github.io/unrealheightmap)</metadata>\n');
  parts.push('<resources>\n<basematerials id="1">\n');
  for (const o of objects) parts.push(`<base name="${o.name.replace(/[<&>"]/g, '')}" displaycolor="${o.color.toUpperCase()}FF"/>\n`);
  parts.push('</basematerials>\n');
  objects = objects.map(o => o.weld === false ? o : {...o, mesh: weldMesh(o.mesh)});
  objects.forEach((o, k) => {
    const id = k + 2;
    parts.push(`<object id="${id}" type="model" name="${o.name.replace(/[<&>"]/g, '')}" pid="1" pindex="${k}"><mesh><vertices>\n`);
    const p = o.mesh.positions;
    const chunk: string[] = [];
    for (let v = 0; v < p.length; v += 3) {
      chunk.push(`<vertex x="${fmt(p[v])}" y="${fmt(p[v + 1])}" z="${fmt(p[v + 2])}"/>`);
      if (chunk.length >= 5000) { parts.push(chunk.join('\n') + '\n'); chunk.length = 0; }
    }
    if (chunk.length) parts.push(chunk.join('\n') + '\n');
    chunk.length = 0;
    parts.push('</vertices><triangles>\n');
    const idx = o.mesh.indices;
    for (let t = 0; t < idx.length; t += 3) {
      chunk.push(`<triangle v1="${idx[t]}" v2="${idx[t + 1]}" v3="${idx[t + 2]}"/>`);
      if (chunk.length >= 5000) { parts.push(chunk.join('\n') + '\n'); chunk.length = 0; }
    }
    if (chunk.length) parts.push(chunk.join('\n') + '\n');
    parts.push('</triangles></mesh></object>\n');
  });
  const assembly = objects.length + 2;
  parts.push(`<object id="${assembly}" type="model" name="${title.replace(/[<&>"]/g, '')}"><components>\n`);
  objects.forEach((_, k) => parts.push(`<component objectid="${k + 2}"/>\n`));
  parts.push('</components></object>\n</resources>\n');
  parts.push(`<build><item objectid="${assembly}"/></build>\n</model>\n`);
  return parts.join('');
};

export const THREEMF_CONTENT_TYPES = '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>\n';
export const THREEMF_RELS = '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>\n';

/* --------------------------------- label ---------------------------------- */

/** 5 × 7 pixel font, one 5-bit row each (bit 4 = left). */
const FONT: {[ch: string]: number[]} = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14],
  D: [28, 18, 17, 17, 17, 18, 28], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 2, 4, 8, 31],
  '3': [31, 2, 4, 2, 1, 17, 14], '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8], '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 2, 12],
  '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8], '-': [0, 0, 0, 31, 0, 0, 0],
  '°': [12, 18, 18, 12, 0, 0, 0], "'": [12, 4, 8, 0, 0, 0, 0], ':': [0, 12, 12, 0, 12, 12, 0],
  '/': [0, 1, 2, 4, 8, 16, 0], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8],
  '&': [12, 18, 20, 8, 21, 18, 13], '+': [0, 4, 4, 31, 4, 4, 0], ' ': [0, 0, 0, 0, 0, 0, 0],
};

/** Text the font can draw: upper case, accents removed, unknown characters dropped. */
export const labelText = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  .split('').filter(c => FONT[c]).join('');

export type LabelOptions = {
  lines: string[];
  /** Model footprint the plinth sits in front of (mm, centred on the origin). */
  sizeX: number;
  sizeY: number;
  /** Depth of the plinth (mm) and its height (mm). */
  depth: number;
  height: number;
  /** How far the letters stand up (mm). */
  relief: number;
};

/** A plinth along the south edge with raised pixel-font text, as boxes. */
export const labelBoxes = (o: LabelOptions): number[][] => {
  const lines = o.lines.map(labelText).filter(l => l.length);
  const y1 = -o.sizeY / 2, y0 = y1 - o.depth;
  const boxes: number[][] = [[-o.sizeX / 2, y0, 0, o.sizeX / 2, y1 + 0.01, o.height]];
  if (!lines.length) return boxes;
  const longest = Math.max(...lines.map(l => l.length));
  const rowsTotal = lines.length * 7 + (lines.length - 1) * 3;
  const pixel = Math.min(o.depth * 0.8 / rowsTotal, o.sizeX * 0.92 / Math.max(1, longest * 6 - 1));
  const top = o.height, z1 = o.height + o.relief;
  let rowY = (y0 + y1) / 2 + rowsTotal * pixel / 2;
  for (const line of lines) {
    const lineWidth = (line.length * 6 - 1) * pixel;
    let x = -lineWidth / 2;
    for (const ch of line) {
      const rows = FONT[ch];
      rows.forEach((bits, r) => {
        // Merge each run of lit pixels into one box
        let c = 0;
        while (c < 5) {
          if (bits & (16 >> c)) {
            let end = c;
            while (end + 1 < 5 && bits & (16 >> (end + 1))) end++;
            const yTop = rowY - r * pixel;
            boxes.push([x + c * pixel, yTop - pixel, top - 0.01, x + (end + 1) * pixel, yTop, z1]);
            c = end + 1;
          } else {
            c++;
          }
        }
      });
      x += 6 * pixel;
    }
    rowY -= 10 * pixel;
  }
  return boxes;
};

/* ------------------------------- lithophane ------------------------------- */

/**
 * Plate thickness (mm) per pixel from a hillshade of the terrain: bright,
 * sunlit slopes thin (more light through), shadowed slopes thick.
 */
export const lithophaneThickness = (
  heights: Float32Array, width: number, height: number, mpp: {x: number, y: number},
  minMm: number, maxMm: number, zFactor = 2,
): Float32Array => {
  const out = new Float32Array(width * height);
  const a = 315 * Math.PI / 180, e = 40 * Math.PI / 180;
  const lx = Math.cos(e) * Math.sin(a), ly = Math.cos(e) * Math.cos(a), lz = Math.sin(e);
  for (let y = 0; y < height; y++) {
    const ya = Math.max(0, y - 1), yb = Math.min(height - 1, y + 1);
    for (let x = 0; x < width; x++) {
      const xa = Math.max(0, x - 1), xb = Math.min(width - 1, x + 1);
      const dEast = (heights[y * width + xb] - heights[y * width + xa]) / ((xb - xa || 1) * mpp.x) * zFactor;
      const dNorth = -(heights[yb * width + x] - heights[ya * width + x]) / ((yb - ya || 1) * mpp.y) * zFactor;
      const len = Math.hypot(dEast, dNorth, 1);
      const shade = Math.max(0, (-dEast * lx - dNorth * ly + lz) / len);
      // Flat ground (shade = sin 40°) sits in the middle of the range
      const t = Math.min(1, Math.max(0, shade / (lz * 1.5)));
      out[y * width + x] = maxMm - (maxMm - minMm) * t;
    }
  }
  return out;
};
