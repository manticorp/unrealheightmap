import {
  MeshInput,
  MeshOptions,
  buildMesh,
  defaultMeshOptions,
  downsampleHeights,
  estimateFileBytes,
  meshGridSize,
  meshToGlb,
  meshToObj,
  meshToStl,
  triangleCount,
} from '../src/mesh';

const grid = (width: number, height: number, fn: (x: number, y: number) => number): MeshInput => {
  const heights = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      heights[y * width + x] = fn(x, y);
    }
  }
  return {heights, width, height, physWidth: 1000, physHeight: 500};
};

const hill = grid(9, 7, (x, y) => 100 + 50 * Math.exp(-((x - 4) ** 2 + (y - 3) ** 2) / 6));
const opts = (o: Partial<MeshOptions> = {}): MeshOptions => ({...defaultMeshOptions, ...o});

/** Every edge must be used exactly twice, once in each direction (vertices matched by position). */
const isWatertight = (positions: Float32Array, indices: Uint32Array): boolean => {
  const key = (v: number) => `${positions[v * 3].toFixed(5)},${positions[v * 3 + 1].toFixed(5)},${positions[v * 3 + 2].toFixed(5)}`;
  const edges = new Map<string, number>();
  for (let i = 0; i < indices.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = key(indices[i + k]);
      const b = key(indices[i + (k + 1) % 3]);
      edges.set(`${a}>${b}`, (edges.get(`${a}>${b}`) ?? 0) + 1);
    }
  }
  for (const [edge, count] of Array.from(edges.entries())) {
    const [a, b] = edge.split('>');
    if (count !== 1 || edges.get(`${b}>${a}`) !== 1) return false;
  }
  return true;
};

/** Positive when faces point outwards (divergence theorem). */
const signedVolume = (p: Float32Array, idx: Uint32Array) => {
  let v = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, c] = [idx[i], idx[i + 1], idx[i + 2]];
    v += (p[a * 3] * (p[b * 3 + 1] * p[c * 3 + 2] - p[b * 3 + 2] * p[c * 3 + 1])
      - p[a * 3 + 1] * (p[b * 3] * p[c * 3 + 2] - p[b * 3 + 2] * p[c * 3])
      + p[a * 3 + 2] * (p[b * 3] * p[c * 3 + 1] - p[b * 3 + 1] * p[c * 3])) / 6;
  }
  return v;
};

describe('mesh', () => {
  test('grid size is capped by resolution and keeps the aspect ratio', () => {
    expect(meshGridSize(4033, 2017, 512)).toEqual({width: 512, height: 256});
    expect(meshGridSize(100, 50, 512)).toEqual({width: 100, height: 50});
  });

  test('downsampling averages blocks', () => {
    const src = new Float32Array([1, 3, 5, 7, 1, 3, 5, 7]);
    expect(Array.from(downsampleHeights(src, 4, 2, 2, 1))).toEqual([2, 6]);
  });

  test('top surface only: one sheet, faces up, lowest point at 0', () => {
    const mesh = buildMesh(hill, opts({solid: false, scale: 'real'}));
    expect(mesh.indices.length / 3).toBe(triangleCount(9, 7, false));
    let minZ = Infinity;
    for (let v = 0; v < mesh.positions.length / 3; v++) minZ = Math.min(minZ, mesh.positions[v * 3 + 2]);
    expect(minZ).toBeCloseTo(0);
    // projected area of the sheet is positive => upward facing
    let area = 0;
    const p = mesh.positions, idx = mesh.indices;
    for (let i = 0; i < idx.length; i += 3) {
      const [a, b, c] = [idx[i], idx[i + 1], idx[i + 2]];
      area += ((p[b * 3] - p[a * 3]) * (p[c * 3 + 1] - p[a * 3 + 1]) - (p[c * 3] - p[a * 3]) * (p[b * 3 + 1] - p[a * 3 + 1])) / 2;
    }
    expect(area).toBeCloseTo(1000 * 500, 0);
  });

  test('solid with base is watertight with outward faces', () => {
    const mesh = buildMesh(hill, opts({solid: true, scale: 'real', baseThickness: 20}));
    expect(mesh.indices.length / 3).toBe(triangleCount(9, 7, true));
    expect(isWatertight(mesh.positions, mesh.indices)).toBe(true);
    expect(signedVolume(mesh.positions, mesh.indices)).toBeGreaterThan(0);
  });

  test('print scale fits the longer side to the print width, heights scale with it', () => {
    const mesh = buildMesh(hill, opts({solid: true, scale: 'print', printWidth: 100, baseThickness: 3, exaggeration: 2}));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxZ = -Infinity, minZ = Infinity;
    for (let v = 0; v < mesh.positions.length / 3; v++) {
      minX = Math.min(minX, mesh.positions[v * 3]); maxX = Math.max(maxX, mesh.positions[v * 3]);
      minY = Math.min(minY, mesh.positions[v * 3 + 1]); maxY = Math.max(maxY, mesh.positions[v * 3 + 1]);
      minZ = Math.min(minZ, mesh.positions[v * 3 + 2]); maxZ = Math.max(maxZ, mesh.positions[v * 3 + 2]);
    }
    expect(mesh.units).toBe('mm');
    expect(maxX - minX).toBeCloseTo(100);
    expect(maxY - minY).toBeCloseTo(50);
    expect(minZ).toBeCloseTo(0);
    // 0.1 mm per metre, relief ~50 m, x2 exaggeration, plus 3 mm base
    const relief = Math.max(...Array.from(hill.heights)) - Math.min(...Array.from(hill.heights));
    expect(maxZ).toBeCloseTo(3 + relief * 0.1 * 2, 3);
  });

  test('STL is binary with the right triangle count and size', () => {
    const mesh = buildMesh(hill, opts({solid: true}));
    const stl = meshToStl(mesh);
    const tris = mesh.indices.length / 3;
    expect(new DataView(stl).getUint32(80, true)).toBe(tris);
    expect(stl.byteLength).toBe(84 + tris * 50);
    expect(stl.byteLength).toBe(estimateFileBytes('stl', 9, 7, true));
  });

  test('OBJ has a vertex, uv and face line for everything, Y up', () => {
    const mesh = buildMesh(hill, opts({solid: false, scale: 'real'}));
    const obj = meshToObj(mesh, 'hill');
    const lines = obj.split('\n');
    expect(lines.filter(l => l.startsWith('v ')).length).toBe(9 * 7);
    expect(lines.filter(l => l.startsWith('vt ')).length).toBe(9 * 7);
    expect(lines.filter(l => l.startsWith('f ')).length).toBe(triangleCount(9, 7, false));
    expect(lines).toContain('o hill');
    // Highest vertex of the hill should be highest in Y, not Z
    const ys = lines.filter(l => l.startsWith('v ')).map(l => parseFloat(l.split(' ')[2]));
    expect(Math.max(...ys)).toBeGreaterThan(40);
  });

  test('GLB has a valid header, JSON chunk and matching accessors', () => {
    const mesh = buildMesh(hill, opts({solid: true, scale: 'print'}));
    const glb = meshToGlb(mesh, 'hill');
    const dv = new DataView(glb);
    expect(dv.getUint32(0, true)).toBe(0x46546C67);
    expect(dv.getUint32(4, true)).toBe(2);
    expect(dv.getUint32(8, true)).toBe(glb.byteLength);
    const jsonLength = dv.getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(glb, 20, jsonLength)));
    expect(json.accessors[0].count).toBe(mesh.positions.length / 3);
    expect(json.accessors[3].count).toBe(mesh.indices.length);
    // print models are written in mm and scaled to metres on the node
    expect(json.nodes[0].scale).toEqual([0.001, 0.001, 0.001]);
    const binHeader = 20 + jsonLength;
    expect(dv.getUint32(binHeader + 4, true)).toBe(0x004E4942);
    expect(dv.getUint32(binHeader, true)).toBe(json.buffers[0].byteLength);
  });
});
