/**
 * Turn a grid of heights (metres) into a triangle mesh, and write it as
 * STL, OBJ or binary glTF (.glb).
 *
 * Internally the mesh is Z-up: +x east, +y north, +z up, centred on the
 * origin in x/y with the lowest point at z = 0 (or on top of the base).
 * OBJ and glTF are written Y-up, which is what Blender, Godot and most
 * engines expect from those formats. STL stays Z-up for slicers.
 */

import {simplifyGrid} from './mesh-simplify';

export type MeshFormat = 'stl' | 'obj' | 'glb' | '3mf';
export type MeshScale = 'real' | 'print';
export type SimplifyPreset = 'off' | 'low' | 'medium' | 'high';

export type MeshOptions = {
  /** Most vertices along the longer side; larger grids are averaged down. */
  resolution: number;
  /** Add side walls and a flat bottom, making a closed (printable) solid. */
  solid: boolean;
  /** Base thickness under the lowest point, in output units (mm or m). */
  baseThickness: number;
  /** 'real' = metres, 1:1. 'print' = millimetres, longer side = printWidth. */
  scale: MeshScale;
  printWidth: number;
  /** Multiplies heights only. */
  exaggeration: number;
  /**
   * Largest allowed vertical error of the top surface, in metres of real
   * height (before exaggeration). 0 = full regular grid. See simplifyErrorForPreset.
   */
  simplify?: number;
  /** Height (metres) that sits on top of the base; defaults to the lowest point. */
  datum?: number;
  /** Z of the walls' bottom edge and the floor, in output units; defaults to 0. */
  floorZ?: number;
};

export type MeshInput = {
  heights: Float32Array;
  width: number;
  height: number;
  /** Ground size of the whole grid in metres. */
  physWidth: number;
  physHeight: number;
};

export type Mesh = {
  positions: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  /** Vertices before this index belong to the top surface. */
  topVertexCount: number;
  /** Height in metres of each top vertex (index < topVertexCount), for colouring. */
  vertexHeights: Float32Array;
  /** Grid size actually used (after downsampling). */
  gridWidth: number;
  gridHeight: number;
  /** Units per metre of ground (1 for real, mm/m for print). */
  unitsPerMetre: number;
  units: 'm' | 'mm';
  /** Downsampled heights in metres, row-major. Not per vertex once simplified. */
  gridHeights: Float32Array;
  /** Vertical tolerance used, metres; 0 = full grid. */
  simplifyError: number;
};

/** Optional image draped over the top surface (UV 0-1 across the area, north at the top). */
export type MeshTexture = {
  mimeType: 'image/jpeg' | 'image/png';
  data: Uint8Array;
};

export const defaultMeshOptions: MeshOptions = {
  resolution: 512,
  solid: true,
  baseThickness: 2,
  scale: 'print',
  printWidth: 150,
  exaggeration: 1,
  simplify: 0,
};

/**
 * Vertical tolerance (metres) for a friendly preset. It is the smaller of a
 * fraction of the grid spacing and a fraction of the area's relief, so steep
 * mountains don't keep every vertex and gentle areas keep their detail:
 *   low    min(0.1 x spacing, 0.2% of relief)   - visually lossless
 *   medium min(0.25 x spacing, 0.5% of relief)  - hard to tell apart
 *   high   min(0.5 x spacing, 1% of relief)     - smallest files, fine details soften
 * A tiny floor stops float noise in flat areas defeating the simplifier.
 */
export const simplifyErrorForPreset = (preset: SimplifyPreset, metresPerVertex: number, heightRange: number): number => {
  const factors: Record<SimplifyPreset, [number, number]> = {
    off: [0, 0],
    low: [0.1, 0.002],
    medium: [0.25, 0.005],
    high: [0.5, 0.01],
  };
  const [spacing, relief] = factors[preset] ?? factors.off;
  if (!spacing) return 0;
  const spacingTerm = Math.max(0, metresPerVertex || 0) * spacing;
  const reliefTerm = Math.max(0, heightRange || 0) * relief;
  return Math.max(0.001, Math.min(spacingTerm, reliefTerm));
};

/** Grid size after downsampling to `resolution` on the longer side. */
export const meshGridSize = (width: number, height: number, resolution: number) => {
  const target = Math.max(2, Math.floor(resolution));
  const factor = Math.max(1, Math.max(width, height) / target);
  return {
    width: Math.max(2, Math.round(width / factor)),
    height: Math.max(2, Math.round(height / factor)),
  };
};

/** Triangles in a full-grid (unsimplified) mesh. */
export const triangleCount = (gridWidth: number, gridHeight: number, solid: boolean): number => {
  const top = (gridWidth - 1) * (gridHeight - 1) * 2;
  if (!solid) return top;
  const perimeterEdges = 2 * (gridWidth - 1) + 2 * (gridHeight - 1);
  // two per wall quad, one per bottom fan triangle
  return top + perimeterEdges * 3;
};

/**
 * Very rough triangle count for a simplified mesh before building it, from
 * typical fractions measured on DEMs and fractal terrain at 250-2050 px
 * (low 25-33%, medium 5-10%, high 0.6-4.5% of the full grid). Real counts
 * depend on the terrain, so show the built mesh's count once there is one.
 */
export const estimateSimplifiedTriangles = (gridWidth: number, gridHeight: number, solid: boolean, preset: SimplifyPreset): number => {
  const full = triangleCount(gridWidth, gridHeight, solid);
  const fraction: Record<SimplifyPreset, number> = {off: 1, low: 0.3, medium: 0.08, high: 0.025};
  return Math.min(full, Math.round(full * (fraction[preset] ?? 1)));
};

/**
 * Rough output size, for warning before a big export. Pass the counts of a
 * built mesh (indices.length / 3, positions.length / 3) for a close figure;
 * without them it assumes the full grid.
 */
export const estimateFileBytes = (
  format: MeshFormat,
  gridWidth: number,
  gridHeight: number,
  solid: boolean,
  counts?: {triangles: number; vertices: number},
): number => {
  const tris = counts ? counts.triangles : triangleCount(gridWidth, gridHeight, solid);
  const verts = counts ? counts.vertices : gridWidth * gridHeight + (solid ? (2 * (gridWidth - 1) + 2 * (gridHeight - 1)) * 4 + 1 : 0);
  if (format === 'stl') return 84 + tris * 50;
  // 3MF is zipped XML: roughly 60 bytes per vertex and 45 per triangle before compression, ~25% after
  if (format === '3mf') return Math.round((verts * 60 + tris * 45) * 0.25);
  if (format === 'glb') return verts * 32 + tris * 3 * (verts <= 65535 ? 2 : 4) + 1024;
  // OBJ text: ~26 bytes per "v", ~16 per "vt", "f a/a b/b c/c" by index width
  const digits = String(Math.max(1, verts)).length;
  return verts * 42 + tris * (3 + 3 * (2 * digits + 2));
};

/** Average blocks of the source grid down to the target size. */
export const downsampleHeights = (src: Float32Array, width: number, height: number, outW: number, outH: number): Float32Array => {
  if (outW === width && outH === height) {
    return src.slice(0);
  }
  const out = new Float32Array(outW * outH);
  const fx = width / outW;
  const fy = height / outH;
  for (let y = 0; y < outH; y++) {
    const y0 = Math.floor(y * fy);
    const y1 = Math.max(y0 + 1, Math.min(height, Math.floor((y + 1) * fy)));
    for (let x = 0; x < outW; x++) {
      const x0 = Math.floor(x * fx);
      const x1 = Math.max(x0 + 1, Math.min(width, Math.floor((x + 1) * fx)));
      let sum = 0;
      let n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          sum += src[sy * width + sx];
          n++;
        }
      }
      out[y * outW + x] = sum / n;
    }
  }
  return out;
};

type TopSurface = {
  /** 0..1 west to east, 0..1 north to south. */
  u: Float32Array;
  v: Float32Array;
  heights: Float32Array;
  indices: Uint32Array;
  /** Rim vertices, anticlockwise from above. */
  perimeter: ArrayLike<number>;
};

const gridSurface = (heights: Float32Array, W: number, H: number): TopSurface => {
  const u = new Float32Array(W * H);
  const v = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      u[y * W + x] = x / (W - 1);
      v[y * W + x] = y / (H - 1);
    }
  }
  const indices = new Uint32Array((W - 1) * (H - 1) * 6);
  let t = 0;
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W - 1; x++) {
      const nw = y * W + x;
      const ne = nw + 1;
      const sw = nw + W;
      const se = sw + 1;
      // Anticlockwise seen from above, so normals point up
      indices[t++] = sw; indices[t++] = se; indices[t++] = ne;
      indices[t++] = sw; indices[t++] = ne; indices[t++] = nw;
    }
  }
  // South edge west->east, east edge south->north, north edge east->west, west edge north->south
  const perimeter: number[] = [];
  for (let x = 0; x < W - 1; x++) perimeter.push((H - 1) * W + x);
  for (let y = H - 1; y > 0; y--) perimeter.push(y * W + (W - 1));
  for (let x = W - 1; x > 0; x--) perimeter.push(x);
  for (let y = 0; y < H - 1; y++) perimeter.push(y * W);
  return {u, v, heights: heights.slice(0), indices, perimeter};
};

export const buildMesh = (input: MeshInput, options: MeshOptions): Mesh => {
  const grid = meshGridSize(input.width, input.height, options.resolution);
  const W = grid.width;
  const H = grid.height;
  const heights = downsampleHeights(input.heights, input.width, input.height, W, H);

  const longest = Math.max(input.physWidth, input.physHeight) || 1;
  const unitsPerMetre = options.scale === 'print' ? Math.max(1e-6, options.printWidth) / longest : 1;
  const sizeX = input.physWidth * unitsPerMetre;
  const sizeY = input.physHeight * unitsPerMetre;
  const exaggeration = Number.isFinite(options.exaggeration) && options.exaggeration > 0 ? options.exaggeration : 1;
  const base = options.solid ? Math.max(0, options.baseThickness || 0) : 0;
  const simplifyError = Number.isFinite(options.simplify) && options.simplify! > 0 ? options.simplify! : 0;

  let minH = Infinity;
  for (let i = 0; i < heights.length; i++) {
    if (heights[i] < minH) minH = heights[i];
  }
  if (!Number.isFinite(minH)) minH = 0;
  if (options.datum !== undefined && Number.isFinite(options.datum)) minH = options.datum;
  const floorZ = options.floorZ !== undefined && Number.isFinite(options.floorZ) ? options.floorZ : 0;

  const top: TopSurface = simplifyError > 0 ? simplifyGrid(heights, W, H, simplifyError) : gridSurface(heights, W, H);
  const perimeter = options.solid ? top.perimeter : [];
  const P = perimeter.length;
  const topVerts = top.u.length;
  // Walls get their own vertices (4 per edge) so normals don't smear round the rim
  const vertexCount = topVerts + P * 4 + (options.solid ? 1 + P : 0);
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = new Uint32Array(top.indices.length + P * 9);

  for (let i = 0; i < topVerts; i++) {
    positions[i * 3] = (top.u[i] - 0.5) * sizeX;
    positions[i * 3 + 1] = (0.5 - top.v[i]) * sizeY;
    positions[i * 3 + 2] = base + (top.heights[i] - minH) * unitsPerMetre * exaggeration;
    uvs[i * 2] = top.u[i];
    uvs[i * 2 + 1] = 1 - top.v[i];
  }
  indices.set(top.indices);
  let t = top.indices.length;

  if (options.solid) {
    let v = topVerts;
    // Wall and bottom vertices copy the rim's UVs, so sides show the edge texels stretched down
    const copyVertex = (from: number, z: number) => {
      positions[v * 3] = positions[from * 3];
      positions[v * 3 + 1] = positions[from * 3 + 1];
      positions[v * 3 + 2] = z;
      uvs[v * 2] = uvs[from * 2];
      uvs[v * 2 + 1] = uvs[from * 2 + 1];
      return v++;
    };
    // Walls: for each rim edge p->q, a quad down to z = 0, facing outwards
    for (let e = 0; e < P; e++) {
      const p = perimeter[e];
      const q = perimeter[(e + 1) % P];
      const pt = copyVertex(p, positions[p * 3 + 2]);
      const qt = copyVertex(q, positions[q * 3 + 2]);
      const pb = copyVertex(p, floorZ);
      const qb = copyVertex(q, floorZ);
      indices[t++] = pt; indices[t++] = pb; indices[t++] = qb;
      indices[t++] = pt; indices[t++] = qb; indices[t++] = qt;
    }
    // Bottom: a fan from the centre, so every rim vertex is shared (watertight)
    const centre = v++;
    positions[centre * 3] = 0;
    positions[centre * 3 + 1] = 0;
    positions[centre * 3 + 2] = floorZ;
    uvs[centre * 2] = 0.5;
    uvs[centre * 2 + 1] = 0.5;
    const bottomStart = v;
    for (let e = 0; e < P; e++) copyVertex(perimeter[e], floorZ);
    for (let e = 0; e < P; e++) {
      const a = bottomStart + e;
      const b = bottomStart + (e + 1) % P;
      // Clockwise seen from above, so the normal points down
      indices[t++] = centre; indices[t++] = b; indices[t++] = a;
    }
  }

  return {
    positions,
    uvs,
    indices,
    topVertexCount: topVerts,
    vertexHeights: top.heights,
    gridWidth: W,
    gridHeight: H,
    unitsPerMetre,
    units: options.scale === 'print' ? 'mm' : 'm',
    gridHeights: heights,
    simplifyError,
  };
};


const faceNormal = (p: Float32Array, a: number, b: number, c: number): [number, number, number] => {
  const ux = p[b * 3] - p[a * 3], uy = p[b * 3 + 1] - p[a * 3 + 1], uz = p[b * 3 + 2] - p[a * 3 + 2];
  const vx = p[c * 3] - p[a * 3], vy = p[c * 3 + 1] - p[a * 3 + 1], vz = p[c * 3 + 2] - p[a * 3 + 2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  return [nx / len, ny / len, nz / len];
};

/** Smooth per-vertex normals (area weighted), Z-up. */
export const computeVertexNormals = (mesh: Mesh): Float32Array => {
  const {positions: p, indices} = mesh;
  const normals = new Float32Array(p.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    const ux = p[b * 3] - p[a * 3], uy = p[b * 3 + 1] - p[a * 3 + 1], uz = p[b * 3 + 2] - p[a * 3 + 2];
    const vx = p[c * 3] - p[a * 3], vy = p[c * 3 + 1] - p[a * 3 + 1], vz = p[c * 3 + 2] - p[a * 3 + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      normals[v * 3] += nx;
      normals[v * 3 + 1] += ny;
      normals[v * 3 + 2] += nz;
    }
  }
  for (let v = 0; v < normals.length; v += 3) {
    const len = Math.sqrt(normals[v] ** 2 + normals[v + 1] ** 2 + normals[v + 2] ** 2) || 1;
    normals[v] /= len;
    normals[v + 1] /= len;
    normals[v + 2] /= len;
  }
  return normals;
};

/** Binary STL, Z-up, in the mesh's units. */
export const meshToStl = (mesh: Mesh): ArrayBuffer => {
  const {positions: p, indices} = mesh;
  const tris = indices.length / 3;
  const buffer = new ArrayBuffer(84 + tris * 50);
  const view = new DataView(buffer);
  const header = `heightmap terrain, units: ${mesh.units}`;
  for (let i = 0; i < Math.min(80, header.length); i++) view.setUint8(i, header.charCodeAt(i));
  view.setUint32(80, tris, true);
  let off = 84;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    const n = faceNormal(p, a, b, c);
    view.setFloat32(off, n[0], true);
    view.setFloat32(off + 4, n[1], true);
    view.setFloat32(off + 8, n[2], true);
    off += 12;
    for (const v of [a, b, c]) {
      view.setFloat32(off, p[v * 3], true);
      view.setFloat32(off + 4, p[v * 3 + 1], true);
      view.setFloat32(off + 8, p[v * 3 + 2], true);
      off += 12;
    }
    view.setUint16(off, 0, true);
    off += 2;
  }
  return buffer;
};

const fmtNum = (n: number, decimals: number) => {
  const s = n.toFixed(decimals);
  // trim trailing zeros to keep files smaller
  return s.indexOf('.') >= 0 ? s.replace(/\.?0+$/, '').replace(/^-0$/, '0') : s;
};

const objText = (mesh: Mesh, name: string, header: string[], material?: string): string => {
  const {positions: p, uvs, indices} = mesh;
  const vertexCount = p.length / 3;
  // 1 µm for print models, 1 cm for real-world ones
  const decimals = mesh.units === 'mm' ? 3 : 2;
  const parts: string[] = [
    `# Heightmap terrain, units: ${mesh.units}, Y up`,
    ...header,
    `o ${name}`,
  ];
  // Build in chunks to avoid one giant string concatenation
  let chunk: string[] = [];
  const flush = () => { parts.push(chunk.join('\n')); chunk = []; };
  for (let v = 0; v < vertexCount; v++) {
    // Z-up (x, y, z) -> Y-up (x, z, -y)
    chunk.push(`v ${fmtNum(p[v * 3], decimals)} ${fmtNum(p[v * 3 + 2], decimals)} ${fmtNum(-p[v * 3 + 1], decimals)}`);
    if (chunk.length >= 65536) flush();
  }
  flush();
  for (let v = 0; v < vertexCount; v++) {
    chunk.push(`vt ${fmtNum(uvs[v * 2], 5)} ${fmtNum(uvs[v * 2 + 1], 5)}`);
    if (chunk.length >= 65536) flush();
  }
  flush();
  if (material) parts.push(`usemtl ${material}`);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] + 1, b = indices[i + 1] + 1, c = indices[i + 2] + 1;
    chunk.push(`f ${a}/${a} ${b}/${b} ${c}/${c}`);
    if (chunk.length >= 65536) flush();
  }
  flush();
  return parts.join('\n') + '\n';
};

/** Wavefront OBJ, Y-up, with UVs so the albedo or derived maps can be draped on. */
export const meshToObj = (mesh: Mesh, name: string = 'terrain'): string => objText(mesh, name, []);

/**
 * OBJ plus a material library that drapes `textureFilename` over the top
 * surface. Ship all three files side by side (mtllib and map_Kd are relative).
 */
export const meshToObjWithMaterial = (
  mesh: Mesh,
  name: string,
  textureFilename: string,
  mtlFilename: string = `${name}.mtl`,
): {obj: string; mtl: string} => {
  const material = name.replace(/\s+/g, '_') || 'terrain';
  const obj = objText(mesh, name, [`mtllib ${mtlFilename}`], material);
  const mtl = [
    `# Heightmap terrain material`,
    `newmtl ${material}`,
    'Ka 1 1 1',
    'Kd 1 1 1',
    'Ks 0 0 0',
    'd 1',
    'illum 1',
    `map_Kd ${textureFilename}`,
    '',
  ].join('\n');
  return {obj, mtl};
};

const align4 = (n: number) => (n + 3) & ~3;

/**
 * Binary glTF 2.0 (.glb), Y-up, metres or millimetres as chosen, with normals
 * and UVs. Indices are 16-bit when the mesh is small enough. An optional
 * texture is embedded and used as the base colour.
 */
export const meshToGlb = (mesh: Mesh, name: string = 'terrain', texture?: MeshTexture): ArrayBuffer => {
  const vertexCount = mesh.positions.length / 3;
  const zNormals = computeVertexNormals(mesh);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < vertexCount; v++) {
    const x = mesh.positions[v * 3], y = mesh.positions[v * 3 + 1], z = mesh.positions[v * 3 + 2];
    const out = [x, z, -y];
    for (let k = 0; k < 3; k++) {
      positions[v * 3 + k] = out[k];
      if (out[k] < min[k]) min[k] = out[k];
      if (out[k] > max[k]) max[k] = out[k];
    }
    normals[v * 3] = zNormals[v * 3];
    normals[v * 3 + 1] = zNormals[v * 3 + 2];
    normals[v * 3 + 2] = -zNormals[v * 3 + 1];
  }
  // glTF UV origin is top-left
  const uvs = new Float32Array(vertexCount * 2);
  for (let v = 0; v < vertexCount; v++) {
    uvs[v * 2] = mesh.uvs[v * 2];
    uvs[v * 2 + 1] = 1 - mesh.uvs[v * 2 + 1];
  }
  // 65535 is reserved (primitive restart), so 16-bit only below it
  const shortIndices = vertexCount <= 65535;
  const indices = shortIndices ? Uint16Array.from(mesh.indices) : mesh.indices;

  // glTF positions are in metres; print-scale models are written in mm, so scale the node down
  const nodeScale = mesh.units === 'mm' ? 0.001 : 1;
  const views: ArrayBufferView[] = [positions, normals, uvs, indices];
  if (texture) views.push(texture.data);
  const offsets: number[] = [];
  let binLength = 0;
  for (const view of views) {
    offsets.push(binLength);
    binLength = align4(binLength + view.byteLength);
  }
  const bufferViews: object[] = [
    {buffer: 0, byteOffset: offsets[0], byteLength: positions.byteLength, target: 34962},
    {buffer: 0, byteOffset: offsets[1], byteLength: normals.byteLength, target: 34962},
    {buffer: 0, byteOffset: offsets[2], byteLength: uvs.byteLength, target: 34962},
    {buffer: 0, byteOffset: offsets[3], byteLength: indices.byteLength, target: 34963},
  ];
  const pbr = {metallicFactor: 0, roughnessFactor: 1};
  const textured = texture ? {
    images: [{bufferView: 4, mimeType: texture.mimeType}],
    // linear filtering with mipmaps, clamped so the edges don't bleed
    samplers: [{magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071}],
    textures: [{sampler: 0, source: 0}],
  } : {};
  if (texture) bufferViews.push({buffer: 0, byteOffset: offsets[4], byteLength: texture.data.byteLength});
  const gltf = {
    asset: {version: '2.0', generator: 'unrealheightmap'},
    scene: 0,
    scenes: [{nodes: [0]}],
    nodes: [{mesh: 0, name, ...(nodeScale !== 1 ? {scale: [nodeScale, nodeScale, nodeScale]} : {})}],
    meshes: [{name, primitives: [{attributes: {POSITION: 0, NORMAL: 1, TEXCOORD_0: 2}, indices: 3, material: 0}]}],
    materials: [{
      name: 'terrain',
      pbrMetallicRoughness: texture
        ? {baseColorTexture: {index: 0}, ...pbr}
        : {baseColorFactor: [0.8, 0.8, 0.8, 1], ...pbr},
    }],
    ...textured,
    buffers: [{byteLength: binLength}],
    bufferViews,
    accessors: [
      {bufferView: 0, componentType: 5126, count: vertexCount, type: 'VEC3', min, max},
      {bufferView: 1, componentType: 5126, count: vertexCount, type: 'VEC3'},
      {bufferView: 2, componentType: 5126, count: vertexCount, type: 'VEC2'},
      {bufferView: 3, componentType: shortIndices ? 5123 : 5125, count: indices.length, type: 'SCALAR'},
    ],
  };
  const rawJson = new TextEncoder().encode(JSON.stringify(gltf));
  // Chunks must be 4-byte aligned; JSON pads with spaces, BIN with zeros
  const jsonBytes = new Uint8Array(align4(rawJson.byteLength)).fill(0x20);
  jsonBytes.set(rawJson);
  const total = 12 + 8 + jsonBytes.byteLength + 8 + binLength;
  const out = new ArrayBuffer(total);
  const dv = new DataView(out);
  const bytes = new Uint8Array(out);
  dv.setUint32(0, 0x46546C67, true); // "glTF"
  dv.setUint32(4, 2, true);
  dv.setUint32(8, total, true);
  dv.setUint32(12, jsonBytes.byteLength, true);
  dv.setUint32(16, 0x4E4F534A, true); // "JSON"
  bytes.set(jsonBytes, 20);
  let off = 20 + jsonBytes.byteLength;
  dv.setUint32(off, binLength, true);
  dv.setUint32(off + 4, 0x004E4942, true); // "BIN\0"
  off += 8;
  views.forEach((view, i) => {
    bytes.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength), off + offsets[i]);
  });
  return out;
};

/** STL ignores the texture; OBJ ignores it too (use meshToObjWithMaterial for a textured OBJ). */
export const encodeMesh = (mesh: Mesh, format: Exclude<MeshFormat, '3mf'>, name?: string, texture?: MeshTexture): ArrayBuffer => {
  if (format === 'obj') {
    return new TextEncoder().encode(meshToObj(mesh, name)).buffer as ArrayBuffer;
  }
  if (format === 'glb') {
    return meshToGlb(mesh, name, texture);
  }
  return meshToStl(mesh);
};
