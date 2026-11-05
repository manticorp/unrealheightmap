import {
  MeshInput,
  MeshOptions,
  buildMesh,
  defaultMeshOptions,
  downsampleHeights,
  estimateFileBytes,
  meshGridSize,
  encodeMesh,
  estimateSimplifiedTriangles,
  meshToGlb,
  meshToObj,
  meshToObjWithMaterial,
  meshToStl,
  simplifyErrorForPreset,
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

  test('full grid keeps per-vertex heights for colouring', () => {
    const mesh = buildMesh(hill, opts({solid: true}));
    expect(mesh.simplifyError).toBe(0);
    expect(Array.from(mesh.vertexHeights)).toEqual(Array.from(mesh.gridHeights));
    expect(mesh.vertexHeights.buffer).not.toBe(mesh.gridHeights.buffer);
  });
});

const parseGlb = (glb: ArrayBuffer) => {
  const dv = new DataView(glb);
  const jsonLength = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(glb, 20, jsonLength)));
  const binHeader = 20 + jsonLength;
  return {dv, json, jsonLength, binStart: binHeader + 8, binLength: dv.getUint32(binHeader, true)};
};

const ridges = (width: number, height: number, physWidth: number, physHeight: number): MeshInput => {
  const heights = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      heights[y * width + x] = 300 + 120 * Math.sin(x / 37) * Math.cos(y / 23) + 40 * Math.sin((x + 2 * y) / 40) + 0.5 * Math.sin(x * 1.3) * Math.sin(y * 0.7);
    }
  }
  return {heights, width, height, physWidth, physHeight};
};

describe('simplified meshes', () => {
  test('flat terrain is two triangles plus walls and a bottom, and watertight', () => {
    const flat: MeshInput = {heights: new Float32Array(513 * 513).fill(10), width: 513, height: 513, physWidth: 5000, physHeight: 5000};
    const mesh = buildMesh(flat, opts({solid: true, scale: 'real', resolution: 513, simplify: 0.5, baseThickness: 5}));
    expect(mesh.topVertexCount).toBe(4);
    // 2 on top, 4 rim edges x (2 wall + 1 bottom)
    expect(mesh.indices.length / 3).toBe(14);
    expect(isWatertight(mesh.positions, mesh.indices)).toBe(true);
    expect(signedVolume(mesh.positions, mesh.indices)).toBeCloseTo(5000 * 5000 * 5, -3);
  });

  test('non-square solid: exact footprint, planar UVs, watertight, much smaller', () => {
    const input = ridges(1009, 505, 30270, 15150);
    const full = buildMesh(input, opts({solid: true, scale: 'real', resolution: 1009}));
    const mesh = buildMesh(input, opts({solid: true, scale: 'real', resolution: 1009, simplify: 2}));
    expect(mesh.simplifyError).toBe(2);
    expect(mesh.gridWidth).toBe(1009);
    expect(mesh.gridHeight).toBe(505);
    expect(mesh.indices.length).toBeLessThan(full.indices.length / 5);
    expect(isWatertight(mesh.positions, mesh.indices)).toBe(true);
    expect(signedVolume(mesh.positions, mesh.indices)).toBeGreaterThan(0);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let v = 0; v < mesh.topVertexCount; v++) {
      const x = mesh.positions[v * 3], y = mesh.positions[v * 3 + 1];
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      expect(mesh.uvs[v * 2]).toBeCloseTo(x / 30270 + 0.5, 5);
      expect(mesh.uvs[v * 2 + 1]).toBeCloseTo(y / 15150 + 0.5, 5);
    }
    expect([minX, maxX, minY, maxY]).toEqual([-15135, 15135, -7575, 7575]);
  });

  test('vertex heights are in metres and match the top surface', () => {
    const input = ridges(200, 120, 2000, 1200);
    const mesh = buildMesh(input, opts({solid: false, scale: 'print', printWidth: 100, exaggeration: 3, simplify: 1}));
    expect(mesh.vertexHeights.length).toBe(mesh.topVertexCount);
    let minGrid = Infinity;
    for (const h of Array.from(mesh.gridHeights)) minGrid = Math.min(minGrid, h);
    for (let v = 0; v < mesh.topVertexCount; v += 17) {
      expect(mesh.positions[v * 3 + 2]).toBeCloseTo((mesh.vertexHeights[v] - minGrid) * mesh.unitsPerMetre * 3, 3);
    }
  });

  test('estimates use the real counts when given', () => {
    const mesh = buildMesh(ridges(150, 100, 1500, 1000), opts({solid: true, simplify: 1}));
    const counts = {triangles: mesh.indices.length / 3, vertices: mesh.positions.length / 3};
    expect(estimateFileBytes('stl', 150, 100, true, counts)).toBe(meshToStl(mesh).byteLength);
    const glb = meshToGlb(mesh).byteLength;
    const estimate = estimateFileBytes('glb', 150, 100, true, counts);
    expect(estimate).toBeGreaterThan(glb * 0.9);
    expect(estimate).toBeLessThan(glb * 1.2);
    expect(estimateSimplifiedTriangles(150, 100, true, 'off')).toBe(triangleCount(150, 100, true));
    expect(estimateSimplifiedTriangles(150, 100, true, 'high')).toBeLessThan(estimateSimplifiedTriangles(150, 100, true, 'low'));
  });

  test('presets scale with grid spacing and relief', () => {
    expect(simplifyErrorForPreset('off', 30, 1000)).toBe(0);
    // mountains: spacing-limited
    expect(simplifyErrorForPreset('low', 30, 2000)).toBeCloseTo(3);
    expect(simplifyErrorForPreset('medium', 30, 2000)).toBeCloseTo(7.5);
    expect(simplifyErrorForPreset('high', 30, 2000)).toBeCloseTo(15);
    // gentle ground: relief-limited
    expect(simplifyErrorForPreset('medium', 2, 20)).toBeCloseTo(0.1);
    expect(simplifyErrorForPreset('high', 0, 0)).toBeGreaterThan(0);
  });
});

describe('mesh encoding', () => {
  test('GLB uses 16-bit indices for small meshes and 32-bit for big ones', () => {
    const small = buildMesh(hill, opts());
    const {json: smallJson} = parseGlb(meshToGlb(small));
    expect(smallJson.accessors[3].componentType).toBe(5123);
    const bigInput = ridges(300, 300, 3000, 3000);
    const big = buildMesh(bigInput, opts({solid: false, resolution: 300}));
    expect(big.positions.length / 3).toBeGreaterThan(65535);
    const {json: bigJson} = parseGlb(meshToGlb(big));
    expect(bigJson.accessors[3].componentType).toBe(5125);
  });

  test('GLB indices survive the 16-bit conversion', () => {
    const mesh = buildMesh(hill, opts({solid: true}));
    const glb = meshToGlb(mesh);
    const {json, binStart} = parseGlb(glb);
    const view = json.bufferViews[3];
    const indices = new Uint16Array(glb.slice(binStart + view.byteOffset, binStart + view.byteOffset + view.byteLength));
    expect(Array.from(indices)).toEqual(Array.from(mesh.indices));
  });

  test('GLB embeds a texture with aligned buffer views', () => {
    const mesh = buildMesh(hill, opts({solid: true}));
    // odd sizes on purpose: index view (hill solid) and image both need padding
    const image = new Uint8Array([0xFF, 0xD8, 0xFF, 1, 2, 3, 4]);
    const glb = meshToGlb(mesh, 'hill', {mimeType: 'image/jpeg', data: image});
    const {dv, json, jsonLength, binStart, binLength} = parseGlb(glb);
    expect(dv.getUint32(8, true)).toBe(glb.byteLength);
    expect(jsonLength % 4).toBe(0);
    expect(binLength % 4).toBe(0);
    expect(glb.byteLength).toBe(20 + jsonLength + 8 + binLength);
    expect(json.buffers[0].byteLength).toBe(binLength);
    for (const view of json.bufferViews) {
      expect(view.byteOffset % 4).toBe(0);
      expect(view.byteOffset + view.byteLength).toBeLessThanOrEqual(binLength);
    }
    expect(json.images).toEqual([{bufferView: 4, mimeType: 'image/jpeg'}]);
    expect(json.textures).toEqual([{sampler: 0, source: 0}]);
    expect(json.samplers).toHaveLength(1);
    const material = json.materials[0].pbrMetallicRoughness;
    expect(material.baseColorTexture).toEqual({index: 0});
    expect(material.metallicFactor).toBe(0);
    expect(material.roughnessFactor).toBe(1);
    expect(json.extensionsUsed).toBeUndefined();
    const imageView = json.bufferViews[4];
    expect(imageView.byteLength).toBe(image.length);
    expect(imageView.target).toBeUndefined();
    expect(Array.from(new Uint8Array(glb, binStart + imageView.byteOffset, image.length))).toEqual(Array.from(image));
    // passed through encodeMesh too
    expect(parseGlb(encodeMesh(mesh, 'glb', 'hill', {mimeType: 'image/png', data: image})).json.images[0].mimeType).toBe('image/png');
  });

  test('textured OBJ references its material library and texture', () => {
    const mesh = buildMesh(hill, opts({solid: false, scale: 'print'}));
    const {obj, mtl} = meshToObjWithMaterial(mesh, 'hill', 'hill_texture.jpg');
    const lines = obj.split('\n');
    expect(lines).toContain('mtllib hill.mtl');
    expect(lines).toContain('usemtl hill');
    expect(lines.indexOf('usemtl hill')).toBeLessThan(lines.findIndex(l => l.startsWith('f ')));
    expect(mtl).toContain('newmtl hill');
    expect(mtl).toContain('map_Kd hill_texture.jpg');
    // print models: at most 3 decimals (1 µm)
    for (const l of lines.filter(l => l.startsWith('v '))) {
      for (const n of l.split(' ').slice(1)) expect((n.split('.')[1] ?? '').length).toBeLessThanOrEqual(3);
    }
  });

  test('real-scale OBJ uses centimetre precision', () => {
    const obj = meshToObj(buildMesh(hill, opts({solid: false, scale: 'real'})));
    for (const l of obj.split('\n').filter(l => l.startsWith('v '))) {
      for (const n of l.split(' ').slice(1)) expect((n.split('.')[1] ?? '').length).toBeLessThanOrEqual(2);
    }
  });
});
