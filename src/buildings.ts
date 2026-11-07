/**
 * 3D buildings from OpenStreetMap footprints: each footprint is extruded to
 * its tagged height (height=*, building:levels=* × 3 m, or a default) and
 * stood on the terrain, sunk slightly so no corner floats on a slope.
 *
 * The geometry is appended to a terrain mesh in the same coordinates, with
 * UVs from the footprint's position, so a satellite texture puts the real
 * roof colours on top.
 */

import {Mesh} from './mesh';
import {OsmFeature, OsmGrid, latLngToPixel} from './osm-layers';
import {sampleBilinear} from './area';

export type BuildingOptions = {
  /** Height for buildings without height or level tags, metres. */
  defaultHeight: number;
  /** Smallest height above the ground on a print, in output units (mm), so roofs survive slicing. */
  minPrintHeight: number;
};

export const defaultBuildingOptions: BuildingOptions = {defaultHeight: 8, minPrintHeight: 0.6};

export type Footprint = {
  /** Outer ring in pixel coordinates (interleaved x, y), counter-clockwise on screen (y down). */
  ring: Float64Array;
  heightMetres: number;
};

const signedArea = (r: Float64Array) => {
  let a = 0;
  const n = r.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) a += r[j * 2] * r[i * 2 + 1] - r[i * 2] * r[j * 2 + 1];
  return a / 2;
};

/** Footprints inside the grid, as pixel rings with duplicate closing points removed. */
export const buildingFootprints = (features: OsmFeature[], grid: OsmGrid, defaultHeight: number): Footprint[] => {
  const out: Footprint[] = [];
  for (const f of features) {
    if (f.layer !== 'buildings' || f.kind !== 'area' || !f.rings || !f.rings.length) continue;
    const outer = f.rings[0];
    const pts: number[] = [];
    for (let i = 0; i < outer.length; i++) {
      const p = latLngToPixel(grid, outer[i][0], outer[i][1]);
      const last = pts.length - 2;
      if (last >= 0 && Math.abs(pts[last] - p[0]) < 1e-6 && Math.abs(pts[last + 1] - p[1]) < 1e-6) continue;
      pts.push(p[0], p[1]);
    }
    if (pts.length >= 4 && Math.abs(pts[0] - pts[pts.length - 2]) < 1e-6 && Math.abs(pts[1] - pts[pts.length - 1]) < 1e-6) {
      pts.length -= 2;
    }
    if (pts.length < 6) continue;
    let inside = false;
    for (let i = 0; i < pts.length; i += 2) {
      if (pts[i] >= 0 && pts[i + 1] >= 0 && pts[i] <= grid.width && pts[i + 1] <= grid.height) { inside = true; break; }
    }
    if (!inside) continue;
    let ring = Float64Array.from(pts);
    if (signedArea(ring) < 0) {
      const rev = new Float64Array(ring.length);
      const n = ring.length / 2;
      for (let i = 0; i < n; i++) { rev[i * 2] = ring[(n - 1 - i) * 2]; rev[i * 2 + 1] = ring[(n - 1 - i) * 2 + 1]; }
      ring = rev;
    }
    if (Math.abs(signedArea(ring)) < 0.02) continue;
    out.push({ring, heightMetres: f.heightMetres ?? defaultHeight});
  }
  return out;
};

/**
 * Ear-clipping triangulation of a simple polygon (positive signed area).
 * Returns index triples into the ring. Falls back to a fan if it gets stuck.
 */
export const triangulate = (ring: Float64Array): number[] => {
  const n = ring.length / 2;
  const idx: number[] = [];
  for (let i = 0; i < n; i++) idx.push(i);
  const tris: number[] = [];
  const x = (i: number) => ring[i * 2], y = (i: number) => ring[i * 2 + 1];
  const cross = (a: number, b: number, c: number) => (x(b) - x(a)) * (y(c) - y(a)) - (y(b) - y(a)) * (x(c) - x(a));
  const inTri = (p: number, a: number, b: number, c: number) =>
    cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0;
  let guard = 0;
  while (idx.length > 3 && guard++ < n * n) {
    let clipped = false;
    for (let k = 0; k < idx.length; k++) {
      const a = idx[(k + idx.length - 1) % idx.length], b = idx[k], c = idx[(k + 1) % idx.length];
      if (cross(a, b, c) <= 1e-12) continue;
      let ear = true;
      for (const p of idx) {
        if (p === a || p === b || p === c) continue;
        if (inTri(p, a, b, c)) { ear = false; break; }
      }
      if (!ear) continue;
      tris.push(a, b, c);
      idx.splice(k, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (idx.length === 3) {
    tris.push(idx[0], idx[1], idx[2]);
  } else if (idx.length > 3) {
    for (let k = 1; k + 1 < idx.length; k++) tris.push(idx[0], idx[k], idx[k + 1]);
  }
  return tris;
};

export type TerrainFrame = {
  /** Heights in metres (full resolution) and their grid size. */
  heights: Float32Array;
  width: number;
  height: number;
  /** Metres covered by the whole grid. */
  physWidth: number;
  physHeight: number;
};

/**
 * Append extruded footprints to a mesh built by buildMesh from `frame`, using
 * the mesh's own scale, exaggeration and height datum. Returns a new mesh.
 */
export const appendBuildings = (
  mesh: Mesh, frame: TerrainFrame, footprints: Footprint[],
  scale: {unitsPerMetre: number, exaggeration: number, base: number, minHeight: number},
  options: BuildingOptions = defaultBuildingOptions,
): {mesh: Mesh, count: number} => {
  if (!footprints.length) return {mesh, count: 0};
  const sizeX = frame.physWidth * scale.unitsPerMetre;
  const sizeY = frame.physHeight * scale.unitsPerMetre;
  const groundZ = (h: number) => scale.base + (h - scale.minHeight) * scale.unitsPerMetre * scale.exaggeration;
  const pos: number[] = [], uv: number[] = [], ind: number[] = [];
  let vbase = mesh.positions.length / 3;
  let count = 0;
  for (const fp of footprints) {
    const n = fp.ring.length / 2;
    let lowest = Infinity;
    const xs: number[] = [], ys: number[] = [], us: number[] = [], vs: number[] = [];
    for (let i = 0; i < n; i++) {
      const px = Math.min(frame.width, Math.max(0, fp.ring[i * 2]));
      const py = Math.min(frame.height, Math.max(0, fp.ring[i * 2 + 1]));
      const u = px / frame.width, v = py / frame.height;
      lowest = Math.min(lowest, sampleBilinear(frame.heights, frame.width, frame.height, px - 0.5, py - 0.5));
      xs.push((u - 0.5) * sizeX);
      ys.push((0.5 - v) * sizeY);
      us.push(u);
      vs.push(1 - v);
    }
    // Sink 1.5 m so slopes and mesh simplification never leave a gap underneath
    const bottom = groundZ(lowest - 1.5);
    const ground = groundZ(lowest);
    const top = Math.max(ground + fp.heightMetres * scale.unitsPerMetre, ground + (scale.unitsPerMetre < 0.5 ? options.minPrintHeight : 0));
    // Roof
    const roofStart = vbase;
    for (let i = 0; i < n; i++) {
      pos.push(xs[i], ys[i], top);
      uv.push(us[i], vs[i]);
    }
    // Triangles are anticlockwise on screen (y down), which faces down once y points north: flip them
    const tris = triangulate(fp.ring);
    for (let k = 0; k < tris.length; k += 3) ind.push(roofStart + tris[k], roofStart + tris[k + 2], roofStart + tris[k + 1]);
    vbase += n;
    // Walls: own vertices per quad so lighting stays crisp, wound to face outwards
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const a = vbase;
      pos.push(xs[i], ys[i], top, xs[j], ys[j], top, xs[i], ys[i], bottom, xs[j], ys[j], bottom);
      uv.push(us[i], vs[i], us[j], vs[j], us[i], vs[i], us[j], vs[j]);
      ind.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      vbase += 4;
    }
    count++;
  }
  const positions = new Float32Array(mesh.positions.length + pos.length);
  positions.set(mesh.positions);
  positions.set(pos, mesh.positions.length);
  const uvs = new Float32Array(mesh.uvs.length + uv.length);
  uvs.set(mesh.uvs);
  uvs.set(uv, mesh.uvs.length);
  const indices = new Uint32Array(mesh.indices.length + ind.length);
  indices.set(mesh.indices);
  indices.set(ind, mesh.indices.length);
  return {mesh: {...mesh, positions, uvs, indices}, count};
};
