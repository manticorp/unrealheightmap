/**
 * Turn a grid of heights (metres) into a triangle mesh, and write it as
 * STL, OBJ or binary glTF (.glb).
 *
 * Internally the mesh is Z-up: +x east, +y north, +z up, centred on the
 * origin in x/y with the lowest point at z = 0 (or on top of the base).
 * OBJ and glTF are written Y-up, which is what Blender, Godot and most
 * engines expect from those formats. STL stays Z-up for slicers.
 */

export type MeshFormat = 'stl' | 'obj' | 'glb';
export type MeshScale = 'real' | 'print';

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
  /** Grid size actually used (after downsampling). */
  gridWidth: number;
  gridHeight: number;
  /** Units per metre of ground (1 for real, mm/m for print). */
  unitsPerMetre: number;
  units: 'm' | 'mm';
  /** Downsampled heights in metres, row-major, for colouring a preview. */
  gridHeights: Float32Array;
};

export const defaultMeshOptions: MeshOptions = {
  resolution: 512,
  solid: true,
  baseThickness: 2,
  scale: 'print',
  printWidth: 150,
  exaggeration: 1,
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

export const triangleCount = (gridWidth: number, gridHeight: number, solid: boolean): number => {
  const top = (gridWidth - 1) * (gridHeight - 1) * 2;
  if (!solid) return top;
  const perimeterEdges = 2 * (gridWidth - 1) + 2 * (gridHeight - 1);
  // two per wall quad, one per bottom fan triangle
  return top + perimeterEdges * 3;
};

/** Rough output size, for warning before a big export. */
export const estimateFileBytes = (format: MeshFormat, gridWidth: number, gridHeight: number, solid: boolean): number => {
  const tris = triangleCount(gridWidth, gridHeight, solid);
  const verts = gridWidth * gridHeight + (solid ? (2 * (gridWidth - 1) + 2 * (gridHeight - 1)) * 4 + 1 : 0);
  if (format === 'stl') return 84 + tris * 50;
  if (format === 'glb') return verts * 32 + tris * 12 + 1024;
  // OBJ text: ~32 bytes per "v", ~20 per "vt", ~24 per "f"
  return verts * 52 + tris * 30;
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

  let minH = Infinity;
  for (let i = 0; i < heights.length; i++) {
    if (heights[i] < minH) minH = heights[i];
  }
  if (!Number.isFinite(minH)) minH = 0;

  const perimeter: number[] = [];
  if (options.solid) {
    // Top-surface vertex indices around the edge, anticlockwise seen from above:
    // south edge west->east, east edge south->north, north edge east->west, west edge north->south.
    for (let x = 0; x < W - 1; x++) perimeter.push((H - 1) * W + x);
    for (let y = H - 1; y > 0; y--) perimeter.push(y * W + (W - 1));
    for (let x = W - 1; x > 0; x--) perimeter.push(x);
    for (let y = 0; y < H - 1; y++) perimeter.push(y * W);
  }

  const topVerts = W * H;
  // Walls get their own vertices (4 per edge) so normals don't smear round the rim
  const wallVerts = perimeter.length * 4;
  const vertexCount = topVerts + wallVerts + (options.solid ? 1 + perimeter.length : 0);
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = new Uint32Array(triangleCount(W, H, options.solid) * 3);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      positions[i * 3] = (x / (W - 1) - 0.5) * sizeX;
      positions[i * 3 + 1] = (0.5 - y / (H - 1)) * sizeY;
      positions[i * 3 + 2] = base + (heights[i] - minH) * unitsPerMetre * exaggeration;
      uvs[i * 2] = x / (W - 1);
      uvs[i * 2 + 1] = 1 - y / (H - 1);
    }
  }

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

  if (options.solid) {
    let v = topVerts;
    const copyVertex = (from: number, z: number) => {
      positions[v * 3] = positions[from * 3];
      positions[v * 3 + 1] = positions[from * 3 + 1];
      positions[v * 3 + 2] = z;
      uvs[v * 2] = uvs[from * 2];
      uvs[v * 2 + 1] = uvs[from * 2 + 1];
      return v++;
    };
    // Walls: for each rim edge p->q, a quad down to z = 0, facing outwards
    for (let e = 0; e < perimeter.length; e++) {
      const p = perimeter[e];
      const q = perimeter[(e + 1) % perimeter.length];
      const pt = copyVertex(p, positions[p * 3 + 2]);
      const qt = copyVertex(q, positions[q * 3 + 2]);
      const pb = copyVertex(p, 0);
      const qb = copyVertex(q, 0);
      indices[t++] = pt; indices[t++] = pb; indices[t++] = qb;
      indices[t++] = pt; indices[t++] = qb; indices[t++] = qt;
    }
    // Bottom: a fan from the centre, so every rim vertex is shared (watertight)
    const centre = v++;
    positions[centre * 3] = 0;
    positions[centre * 3 + 1] = 0;
    positions[centre * 3 + 2] = 0;
    uvs[centre * 2] = 0.5;
    uvs[centre * 2 + 1] = 0.5;
    const bottomStart = v;
    for (const p of perimeter) copyVertex(p, 0);
    for (let e = 0; e < perimeter.length; e++) {
      const a = bottomStart + e;
      const b = bottomStart + (e + 1) % perimeter.length;
      // Clockwise seen from above, so the normal points down
      indices[t++] = centre; indices[t++] = b; indices[t++] = a;
    }
  }

  return {
    positions,
    uvs,
    indices,
    topVertexCount: topVerts,
    gridWidth: W,
    gridHeight: H,
    unitsPerMetre,
    units: options.scale === 'print' ? 'mm' : 'm',
    gridHeights: heights,
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

const fmtNum = (n: number) => {
  const s = n.toFixed(4);
  // trim trailing zeros to keep files smaller
  return s.indexOf('.') >= 0 ? s.replace(/\.?0+$/, '') : s;
};

/** Wavefront OBJ, Y-up, with UVs so the albedo or derived maps can be draped on. */
export const meshToObj = (mesh: Mesh, name: string = 'terrain'): string => {
  const {positions: p, uvs, indices} = mesh;
  const vertexCount = p.length / 3;
  const parts: string[] = [
    `# Heightmap terrain, units: ${mesh.units}, Y up`,
    `o ${name}`,
  ];
  // Build in chunks to avoid one giant string concatenation
  let chunk: string[] = [];
  const flush = () => { parts.push(chunk.join('\n')); chunk = []; };
  for (let v = 0; v < vertexCount; v++) {
    // Z-up (x, y, z) -> Y-up (x, z, -y)
    chunk.push(`v ${fmtNum(p[v * 3])} ${fmtNum(p[v * 3 + 2])} ${fmtNum(-p[v * 3 + 1])}`);
    if (chunk.length >= 65536) flush();
  }
  flush();
  for (let v = 0; v < vertexCount; v++) {
    chunk.push(`vt ${fmtNum(uvs[v * 2])} ${fmtNum(uvs[v * 2 + 1])}`);
    if (chunk.length >= 65536) flush();
  }
  flush();
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] + 1, b = indices[i + 1] + 1, c = indices[i + 2] + 1;
    chunk.push(`f ${a}/${a} ${b}/${b} ${c}/${c}`);
    if (chunk.length >= 65536) flush();
  }
  flush();
  return parts.join('\n') + '\n';
};

/** Binary glTF 2.0 (.glb), Y-up, metres or millimetres as chosen, with normals and UVs. */
export const meshToGlb = (mesh: Mesh, name: string = 'terrain'): ArrayBuffer => {
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

  // glTF positions are in metres; print-scale models are written in mm, so scale the node down
  const nodeScale = mesh.units === 'mm' ? 0.001 : 1;
  const views = [positions, normals, uvs, mesh.indices];
  const offsets: number[] = [];
  let binLength = 0;
  for (const view of views) {
    offsets.push(binLength);
    binLength += view.byteLength; // all 4-byte aligned already
  }
  const gltf = {
    asset: {version: '2.0', generator: 'unrealheightmap'},
    scene: 0,
    scenes: [{nodes: [0]}],
    nodes: [{mesh: 0, name, ...(nodeScale !== 1 ? {scale: [nodeScale, nodeScale, nodeScale]} : {})}],
    meshes: [{name, primitives: [{attributes: {POSITION: 0, NORMAL: 1, TEXCOORD_0: 2}, indices: 3, material: 0}]}],
    materials: [{name: 'terrain', pbrMetallicRoughness: {baseColorFactor: [0.8, 0.8, 0.8, 1], metallicFactor: 0, roughnessFactor: 1}}],
    buffers: [{byteLength: binLength}],
    bufferViews: [
      {buffer: 0, byteOffset: offsets[0], byteLength: positions.byteLength, target: 34962},
      {buffer: 0, byteOffset: offsets[1], byteLength: normals.byteLength, target: 34962},
      {buffer: 0, byteOffset: offsets[2], byteLength: uvs.byteLength, target: 34962},
      {buffer: 0, byteOffset: offsets[3], byteLength: mesh.indices.byteLength, target: 34963},
    ],
    accessors: [
      {bufferView: 0, componentType: 5126, count: vertexCount, type: 'VEC3', min, max},
      {bufferView: 1, componentType: 5126, count: vertexCount, type: 'VEC3'},
      {bufferView: 2, componentType: 5126, count: vertexCount, type: 'VEC2'},
      {bufferView: 3, componentType: 5125, count: mesh.indices.length, type: 'SCALAR'},
    ],
  };
  let json = JSON.stringify(gltf);
  while (json.length % 4 !== 0) json += ' ';
  const jsonBytes = new TextEncoder().encode(json);
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
  for (const view of views) {
    bytes.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength), off);
    off += view.byteLength;
  }
  return out;
};

export const encodeMesh = (mesh: Mesh, format: MeshFormat, name?: string): ArrayBuffer => {
  if (format === 'obj') {
    return new TextEncoder().encode(meshToObj(mesh, name)).buffer as ArrayBuffer;
  }
  if (format === 'glb') {
    return meshToGlb(mesh, name);
  }
  return meshToStl(mesh);
};
