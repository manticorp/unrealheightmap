/**
 * Scatter points for trees, rocks and bushes: positions with a random scale
 * and rotation, placed with a given density wherever a material-painter layer
 * or OpenStreetMap layer says, never closer than a minimum spacing.
 *
 * Output as CSV (any tool), a Blender script (point clouds ready for
 * "Instance on Points") and an Unreal script (instanced static meshes).
 */

import {UNREAL_ADD_COMPONENT, SplineGrid, toBlender} from './splines';
import {sampleBilinear} from './area';

export type ScatterSet = {
  name: string;
  /** "paint:<n>" (n-th painter layer, base last), "osm:<id>" or "all". */
  source: string;
  /** Points per hectare where the source is fully on. */
  density: number;
  /** Minimum distance between points, metres. */
  spacing: number;
  minScale: number;
  maxScale: number;
  /** Skip ground steeper than this, degrees. */
  maxSlope: number;
  /** Unreal mesh to instance (an asset path); a basic shape by default. */
  mesh: string;
};

export const SCATTER_MAX_POINTS = 400000;

export const blankScatter = (name = 'Trees', source = 'osm:forest'): ScatterSet => ({
  name, source, density: 150, spacing: 4, minScale: 0.8, maxScale: 1.3, maxSlope: 35,
  mesh: '/Engine/BasicShapes/Cone.Cone',
});

export const SCATTER_PRESETS: ScatterSet[] = [
  blankScatter('Trees', 'osm:forest'),
  {...blankScatter('Rocks', 'all'), density: 6, spacing: 6, minScale: 0.5, maxScale: 2, maxSlope: 60, mesh: '/Engine/BasicShapes/Sphere.Sphere'},
  {...blankScatter('Bushes', 'osm:scrub'), density: 300, spacing: 2, minScale: 0.4, maxScale: 0.9, mesh: '/Engine/BasicShapes/Sphere.Sphere'},
];

const enc = (s: string) => s.replace(/%/g, '%25').replace(/~/g, '%7E').replace(/\|/g, '%7C');

export const encodeScatter = (sets: ScatterSet[]): string => sets.map(s => [
  enc(s.name), s.source, s.density, s.spacing, s.minScale, s.maxScale, s.maxSlope,
  s.mesh === blankScatter().mesh ? '' : enc(s.mesh),
].join('~')).join('|');

export const decodeScatter = (text: string): ScatterSet[] => {
  if (!text) return [];
  return text.split('|').filter(Boolean).map(part => {
    const f = part.split('~');
    const n = (v: string | undefined, d: number) => {
      const x = parseFloat(v ?? '');
      return Number.isFinite(x) ? x : d;
    };
    const d = blankScatter();
    return {
      name: decodeURIComponent(f[0] || 'Points'),
      source: f[1] || 'all',
      density: n(f[2], d.density), spacing: n(f[3], d.spacing),
      minScale: n(f[4], d.minScale), maxScale: n(f[5], d.maxScale), maxSlope: n(f[6], d.maxSlope),
      mesh: f[7] ? decodeURIComponent(f[7]) : d.mesh,
    };
  });
};

/** Small, fast, seedable PRNG (mulberry32). */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export type ScatterPoints = {
  /** Interleaved: pixel x, pixel y, height m, scale, yaw degrees. */
  data: Float32Array;
  count: number;
  /** True when SCATTER_MAX_POINTS cut it short. */
  capped: boolean;
};

/**
 * Jittered-grid placement: each spacing-sized cell gets enough candidates for
 * the density, each kept with a probability set by the weight there, and
 * dropped if it lands too close to a point already kept.
 */
export const scatterPoints = (
  heights: Float32Array, weights: Float32Array | null, slope: Float32Array,
  width: number, height: number, mpp: {x: number, y: number}, set: ScatterSet, seed = 1,
): ScatterPoints => {
  const random = rng(seed);
  const spacingM = Math.max(0.25, set.spacing);
  const cellX = spacingM / mpp.x, cellY = spacingM / mpp.y;
  const cols = Math.ceil(width / cellX), rows = Math.ceil(height / cellY);
  const cellHa = spacingM * spacingM / 10000;
  const expected = Math.max(0, set.density) * cellHa;
  const candidates = Math.max(1, Math.ceil(expected));
  const keepChance = expected / candidates;
  const minDist2 = (spacingM * 0.8) ** 2;
  const out: number[] = [];
  const grid = new Map<number, number[]>();
  let capped = false;
  for (let row = 0; row < rows && !capped; row++) {
    for (let col = 0; col < cols; col++) {
      for (let c = 0; c < candidates; c++) {
        const px = (col + random()) * cellX, py = (row + random()) * cellY;
        const keep = random();
        if (px >= width || py >= height) continue;
        const w = weights ? sampleBilinear(weights, width, height, px - 0.5, py - 0.5) : 1;
        if (keep >= keepChance * w) continue;
        if (sampleBilinear(slope, width, height, px - 0.5, py - 0.5) > set.maxSlope) continue;
        // Neighbour check in metres against points kept in nearby cells
        let tooClose = false;
        for (let dr = -1; dr <= 1 && !tooClose; dr++) {
          for (let dc = -1; dc <= 1 && !tooClose; dc++) {
            const list = grid.get((row + dr) * 65536 + (col + dc));
            if (!list) continue;
            for (const k of list) {
              const ex = (out[k * 5] - px) * mpp.x, ey = (out[k * 5 + 1] - py) * mpp.y;
              if (ex * ex + ey * ey < minDist2) { tooClose = true; break; }
            }
          }
        }
        if (tooClose) continue;
        const index = out.length / 5;
        const key = row * 65536 + col;
        (grid.get(key) ?? grid.set(key, []).get(key)!).push(index);
        out.push(px, py, sampleBilinear(heights, width, height, px - 0.5, py - 0.5),
          set.minScale + (set.maxScale - set.minScale) * random(), random() * 360);
        if (index + 1 >= SCATTER_MAX_POINTS) { capped = true; break; }
      }
    }
  }
  return {data: Float32Array.from(out), count: out.length / 5, capped};
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export type NamedPoints = {set: ScatterSet, points: ScatterPoints};

export const scatterToCsv = (all: NamedPoints[], g: SplineGrid): string => {
  const rows = ['set,pixel_x,pixel_y,blender_x_m,blender_y_m,z_m,scale,yaw_deg,ue_vertex_x,ue_vertex_y,ue_z_cm'];
  for (const {set, points} of all) {
    const d = points.data;
    for (let i = 0; i < points.count; i++) {
      const px = d[i * 5], py = d[i * 5 + 1];
      const [bx, by] = toBlender(g, px, py);
      rows.push([JSON.stringify(set.name), r2(px), r2(py), r2(bx), r2(by), r2(d[i * 5 + 2]), r2(d[i * 5 + 3]), r2(d[i * 5 + 4]),
        r2(px - 0.5), r2(py - 0.5), Math.round(d[i * 5 + 2] * 100)].join(','));
    }
  }
  return rows.join('\n') + '\n';
};

const pyList = (values: number[]) => '[' + values.join(',') + ']';

export type ScatterScriptOptions = {
  /** Extra lines for the header comment. */
  note?: string;
  /** How many metres a basic Unreal shape becomes at scale 1. */
  meshSize?: number;
};

const noteLines = (note?: string) => note ? note.split('\n').map(l => `# ${l}`.trimEnd()).join('\n') + '\n#\n' : '';

export const scatterBlenderScript = (all: NamedPoints[], g: SplineGrid, name: string, opts: ScatterScriptOptions = {}): string => {
  const sets = all.map(({set, points}) => {
    const d = points.data, xs: number[] = [], ys: number[] = [], zs: number[] = [], sc: number[] = [], yaw: number[] = [];
    for (let i = 0; i < points.count; i++) {
      const [bx, by] = toBlender(g, d[i * 5], d[i * 5 + 1]);
      xs.push(r2(bx)); ys.push(r2(by)); zs.push(r2(d[i * 5 + 2])); sc.push(r2(d[i * 5 + 3])); yaw.push(r2(d[i * 5 + 4]));
    }
    return `    (${JSON.stringify(set.name)}, ${pyList(xs)}, ${pyList(ys)}, ${pyList(zs)}, ${pyList(sc)}, ${pyList(yaw)}),`;
  }).join('\n');
  return `# Blender: scatter points for ${name}
# Generated by https://manticorp.github.io/unrealheightmap/
#
${noteLines(opts.note)}# Scripting workspace > Text > Open this file > Run Script.
# Makes one point-cloud object per set (trees, rocks...) in metres, centred
# like blender_import.py builds the terrain. Each point has "scale" and "yaw"
# (radians) attributes. To place real models: add a Geometry Nodes modifier,
# then Instance on Points with your tree or rock, using "scale" for Scale and
# Combine XYZ (0, 0, yaw) for Rotation.

import bpy, math

SCALE = 1.0   # match the SCALE you used in blender_import.py

SETS = [
${sets}
]


def main():
    col = bpy.data.collections.get("Scatter") or bpy.data.collections.new("Scatter")
    if col.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(col)
    for label, xs, ys, zs, scales, yaws in SETS:
        mesh = bpy.data.meshes.new(label)
        mesh.from_pydata([(x * SCALE, y * SCALE, z * SCALE) for x, y, z in zip(xs, ys, zs)], [], [])
        scale_attr = mesh.attributes.new("scale", "FLOAT", "POINT")
        yaw_attr = mesh.attributes.new("yaw", "FLOAT", "POINT")
        scale_attr.data.foreach_set("value", scales)
        yaw_attr.data.foreach_set("value", [math.radians(a) for a in yaws])
        obj = bpy.data.objects.new(label, mesh)
        col.objects.link(obj)
        print(label, len(xs), "points")


main()
`;
};

export const scatterUnrealScript = (all: NamedPoints[], name: string, opts: ScatterScriptOptions = {}): string => {
  const sets = all.map(({set, points}) => {
    const d = points.data, items: string[] = [];
    for (let i = 0; i < points.count; i++) {
      items.push(`(${r2(d[i * 5] - 0.5)},${r2(d[i * 5 + 1] - 0.5)},${Math.round(d[i * 5 + 2] * 100)},${r2(d[i * 5 + 3])},${Math.round(d[i * 5 + 4])})`);
    }
    return `    (${JSON.stringify(set.name)}, ${JSON.stringify(set.mesh)}, [${items.join(',')}]),`;
  }).join('\n');
  return `# Unreal Engine: scatter points for ${name}
# Generated by https://manticorp.github.io/unrealheightmap/
#
${noteLines(opts.note)}# 1. Import the heightmap as a landscape and run unreal_set_scale.py first.
# 2. Select the landscape, then Tools > Execute Python Script... > this file.
#
# Adds one actor per set with a Hierarchical Instanced Static Mesh component
# (in a "Scatter" folder). They use basic shapes until you pick your own mesh:
# select the actor and change Static Mesh on its component, or edit MESHES.

import unreal

Z_OFFSET_CM = 0
MESH_SIZE = ${(opts.meshSize ?? 4).toFixed(1)}   # basic shapes are 1 m; this makes "scale 1" about ${opts.meshSize ?? 4} m

SETS = [
${sets}
]

MESHES = {}  # e.g. {"Trees": "/Game/Foliage/SM_Pine.SM_Pine"} to override per set
${UNREAL_ADD_COMPONENT}

def main():
    landscape = find_landscape()
    if landscape is None:
        unreal.log_warning("Import the heightmap as a landscape and select it first.")
        return
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    with unreal.ScopedEditorTransaction("Add scatter points"):
        for label, mesh_path, points in SETS:
            if not points:
                continue
            path = MESHES.get(label, mesh_path)
            mesh = unreal.load_asset(path)
            basic = path.startswith("/Engine/BasicShapes/")
            actor = actors.spawn_actor_from_class(unreal.Actor, landscape.get_actor_location())
            actor.set_actor_label("Scatter " + label)
            actor.set_folder_path("Scatter")
            hism = add_component(actor, unreal.HierarchicalInstancedStaticMeshComponent)
            hism.set_editor_property("static_mesh", mesh)
            transforms = []
            for (x, y, z, s, yaw) in points:
                size = s * (MESH_SIZE if basic else 1.0)
                transforms.append(unreal.Transform(to_world(landscape, x, y, z), unreal.Rotator(roll=0, pitch=0, yaw=yaw), unreal.Vector(size, size, size)))
            hism.add_instances(transforms, False, True)
            unreal.log("Scatter " + label + ": " + str(len(points)) + " instances")


main()
`;
};
