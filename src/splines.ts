/**
 * Roads, railways, paths and rivers from OpenStreetMap as 3D splines, with
 * heights taken from the (carved) heightmap, so they can drive Unreal spline
 * actors, Blender curves, Houdini or anything that reads CSV/GeoJSON.
 *
 * Coordinates:
 *  - pixels: x right, y down, pixel centres at +0.5 (same as the heightmap)
 *  - Blender: metres, centred on the area, +Y north (matches blender_import.py)
 *  - Unreal: relative to the landscape actor, one unit per heightmap vertex,
 *    turned into world space by the script using the landscape's transform;
 *    Z in centimetres above sea level (matches unreal_set_scale.py)
 */

import {OsmFeature, OsmGrid, pixelToLatLng} from './osm-layers';
import {densify} from './carve';
import {sampleBilinear} from './area';
import {simplifyPolyline} from './contours';

export type SplineLayer = 'roads' | 'railways' | 'paths' | 'rivers';
export const SPLINE_LAYERS: SplineLayer[] = ['roads', 'railways', 'paths', 'rivers'];

export type Spline = {
  id: number;
  layer: string;
  /** OSM tag value, e.g. "primary" or "stream". */
  kind: string;
  name: string;
  widthMetres: number;
  bridge: boolean;
  /** Interleaved pixel x, pixel y, height (metres). */
  points: Float64Array;
};

export type SplineGrid = {
  width: number;
  height: number;
  metresPerPixelX: number;
  metresPerPixelY: number;
};

/** Split a pixel polyline into the runs that lie inside the image (crossing points included). */
export const clipToImage = (xs: Float64Array, ys: Float64Array, width: number, height: number): {xs: number[], ys: number[]}[] => {
  const runs: {xs: number[], ys: number[]}[] = [];
  let current: {xs: number[], ys: number[]} | null = null;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x <= width && y <= height;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i], y = ys[i];
    if (inside(x, y)) {
      if (!current) {
        current = {xs: [], ys: []};
        runs.push(current);
        if (i > 0) {
          // Enter: add the crossing point, found by bisection (segments are ~1 px)
          current.xs.push((xs[i - 1] + x) / 2);
          current.ys.push((ys[i - 1] + y) / 2);
        }
      }
      current.xs.push(x);
      current.ys.push(y);
    } else if (current) {
      current.xs.push((xs[i - 1] + x) / 2);
      current.ys.push((ys[i - 1] + y) / 2);
      current = null;
    }
  }
  return runs.filter(r => r.xs.length >= 2);
};

/**
 * Splines for the chosen layers, clipped to the image, simplified to within
 * `tolerancePx` and given heights from `heights`. Bridges get a straight deck
 * between their ends instead of following the valley floor.
 */
export const buildSplines = (
  features: OsmFeature[], grid: OsmGrid, heights: Float32Array, layers: string[], tolerancePx = 0.5,
): Spline[] => {
  const {width, height} = grid;
  const out: Spline[] = [];
  const wanted = new Set(layers);
  for (const f of features) {
    if (!wanted.has(f.layer) || f.kind !== 'line' || !f.lines) continue;
    for (const line of f.lines) {
      const dense = densify(grid, line, 1);
      for (const run of clipToImage(dense.xs, dense.ys, width, height)) {
        const flat = new Float32Array(run.xs.length * 2);
        run.xs.forEach((x, i) => { flat[i * 2] = x; flat[i * 2 + 1] = run.ys[i]; });
        const simple = simplifyPolyline(flat, false, tolerancePx);
        const n = simple.length / 2;
        if (n < 2) continue;
        const points = new Float64Array(n * 3);
        for (let i = 0; i < n; i++) {
          const x = simple[i * 2], y = simple[i * 2 + 1];
          points[i * 3] = x;
          points[i * 3 + 1] = y;
          points[i * 3 + 2] = sampleBilinear(heights, width, height, x - 0.5, y - 0.5);
        }
        if (f.bridge) {
          const z0 = points[2], z1 = points[(n - 1) * 3 + 2];
          let total = 0;
          const along = [0];
          for (let i = 1; i < n; i++) {
            total += Math.hypot(points[i * 3] - points[(i - 1) * 3], points[i * 3 + 1] - points[(i - 1) * 3 + 1]);
            along.push(total);
          }
          for (let i = 0; i < n; i++) points[i * 3 + 2] = z0 + (z1 - z0) * (total ? along[i] / total : 0);
        }
        out.push({
          id: out.length,
          layer: f.layer,
          kind: f.value ?? f.layer,
          name: f.name ?? '',
          widthMetres: f.widthMetres ?? 3,
          bridge: !!f.bridge,
          points,
        });
      }
    }
  }
  return out;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Blender coordinates (metres, centred, +Y north) of a pixel position. */
export const toBlender = (g: SplineGrid, px: number, py: number): [number, number] =>
  [(px - g.width / 2) * g.metresPerPixelX, (g.height / 2 - py) * g.metresPerPixelY];

const csvEscape = (s: string) => /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;

export const splinesToCsv = (splines: Spline[], g: SplineGrid): string => {
  const rows = ['spline_id,layer,kind,name,width_m,bridge,point,pixel_x,pixel_y,blender_x_m,blender_y_m,z_m,ue_vertex_x,ue_vertex_y,ue_z_cm'];
  for (const s of splines) {
    const n = s.points.length / 3;
    for (let i = 0; i < n; i++) {
      const px = s.points[i * 3], py = s.points[i * 3 + 1], z = s.points[i * 3 + 2];
      const [bx, by] = toBlender(g, px, py);
      rows.push([s.id, s.layer, s.kind, csvEscape(s.name), s.widthMetres, s.bridge ? 1 : 0, i,
        r2(px), r2(py), r2(bx), r2(by), r2(z), r2(px - 0.5), r2(py - 0.5), Math.round(z * 100)].join(','));
    }
  }
  return rows.join('\n') + '\n';
};

export const splinesToGeoJson = (splines: Spline[], grid: OsmGrid): string => JSON.stringify({
  type: 'FeatureCollection',
  features: splines.map(s => {
    const coords: number[][] = [];
    for (let i = 0; i < s.points.length; i += 3) {
      const [lat, lng] = pixelToLatLng(grid, s.points[i], s.points[i + 1]);
      coords.push([+lng.toFixed(7), +lat.toFixed(7), r2(s.points[i + 2])]);
    }
    return {
      type: 'Feature',
      properties: {id: s.id, layer: s.layer, kind: s.kind, name: s.name || null, width_m: s.widthMetres, bridge: s.bridge},
      geometry: {type: 'LineString', coordinates: coords},
    };
  }),
});

const pyString = (s: string) => JSON.stringify(s);

/** Python list literal of [x, y, z] triples. */
const pyPoints = (pts: [number, number, number][]) => '[' + pts.map(p => `(${p[0]},${p[1]},${p[2]})`).join(',') + ']';

export const splinesBlenderScript = (splines: Spline[], g: SplineGrid, name: string): string => {
  const data = splines.map(s => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < s.points.length; i += 3) {
      const [x, y] = toBlender(g, s.points[i], s.points[i + 1]);
      pts.push([r2(x), r2(y), r2(s.points[i + 2])]);
    }
    return `    (${pyString(s.layer)}, ${pyString(s.kind)}, ${pyString(s.name)}, ${s.widthMetres}, ${pyPoints(pts)}),`;
  }).join('\n');
  return `# Blender: OpenStreetMap splines for ${name}
# Generated by https://manticorp.github.io/unrealheightmap/
#
# Scripting workspace > Text > Open this file > Run Script.
# Makes one curve per road, railway, path or river in a "Splines" collection,
# in metres, centred like blender_import.py builds the terrain (+Y north).
# Each curve gets a bevel as wide as the feature, so they show up in renders;
# set the bevel depth to 0 to keep them as plain paths.

import bpy

SCALE = 1.0   # match the SCALE you used in blender_import.py
Z_OFFSET = 0.3  # lift above the ground (metres) so the curves aren't hidden

SPLINES = [
${data}
]


def collection(name, parent):
    col = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if col.name not in parent.children:
        parent.children.link(col)
    return col


def main():
    root = collection("Splines", bpy.context.scene.collection)
    for layer, kind, label, width, points in SPLINES:
        col = collection("Splines " + layer, root)
        curve = bpy.data.curves.new(label or kind, type="CURVE")
        curve.dimensions = "3D"
        curve.bevel_depth = width * SCALE / 2
        curve.bevel_resolution = 0
        spline = curve.splines.new("POLY")
        spline.points.add(len(points) - 1)
        for p, (x, y, z) in zip(spline.points, points):
            p.co = (x * SCALE, y * SCALE, (z + Z_OFFSET) * SCALE, 1)
        obj = bpy.data.objects.new((label or kind) + " (" + layer + ")", curve)
        obj["osm_kind"] = kind
        obj["width_m"] = width
        col.objects.link(obj)
    print("Added", len(SPLINES), "splines")


main()
`;
};

/** Python helper shared by the Unreal scripts: add a component to an actor in the editor. */
export const UNREAL_ADD_COMPONENT = `
def add_component(actor, component_class):
    """Add a component to a placed actor (UE 5.1+ Subobject Data Subsystem)."""
    subsystem = unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)
    handles = subsystem.k2_gather_subobject_data_for_instance(actor)
    params = unreal.AddNewSubobjectParams(parent_handle=handles[0], new_class=component_class, blueprint_context=None)
    handle, fail_reason = subsystem.add_new_subobject(params)
    if not fail_reason.is_empty():
        raise RuntimeError(str(fail_reason))
    data = unreal.SubobjectDataBlueprintFunctionLibrary.get_data(handle)
    return unreal.SubobjectDataBlueprintFunctionLibrary.get_object(data)


def find_landscape():
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    selected = [a for a in actors.get_selected_level_actors() if isinstance(a, unreal.LandscapeProxy)]
    found = selected or [a for a in actors.get_all_level_actors() if isinstance(a, unreal.LandscapeProxy)]
    return found[0] if found else None


def to_world(landscape, vx, vy, z_cm):
    """Heightmap vertex (vx, vy) to world space, using the landscape's location, rotation and scale."""
    loc = landscape.get_actor_transform().transform_location(unreal.Vector(vx, vy, 0))
    return unreal.Vector(loc.x, loc.y, z_cm + Z_OFFSET_CM)
`;

export const splinesUnrealScript = (splines: Spline[], name: string): string => {
  const data = splines.map(s => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < s.points.length; i += 3) pts.push([r2(s.points[i] - 0.5), r2(s.points[i + 1] - 0.5), Math.round(s.points[i + 2] * 100)]);
    return `    (${pyString(s.layer)}, ${pyString(s.kind)}, ${pyString(s.name)}, ${s.widthMetres}, ${pyPoints(pts)}),`;
  }).join('\n');
  return `# Unreal Engine: OpenStreetMap splines for ${name}
# Generated by https://manticorp.github.io/unrealheightmap/
#
# 1. Import the heightmap as a landscape and run unreal_set_scale.py first,
#    so the landscape is the right size with sea level at Z = 0.
# 2. Select the landscape, then Tools > Execute Python Script... > this file.
#
# Adds one actor per road, railway, path or river with a Spline component
# following it (in an "OSM Splines" folder). Use them with PCG, Spline Mesh
# components or a Blueprint to place road meshes, fences or water.

import unreal

Z_OFFSET_CM = 20  # lift the splines a little above the ground

SPLINES = [
${data}
]
${UNREAL_ADD_COMPONENT}

def main():
    landscape = find_landscape()
    if landscape is None:
        unreal.log_warning("Import the heightmap as a landscape and select it first.")
        return
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    made = 0
    with unreal.ScopedEditorTransaction("Add OSM splines"):
        for layer, kind, label, width, points in SPLINES:
            world = [to_world(landscape, x, y, z) for (x, y, z) in points]
            actor = actors.spawn_actor_from_class(unreal.Actor, world[0])
            actor.set_actor_label((label or kind) + " (" + layer + ")")
            actor.set_folder_path("OSM Splines/" + layer)
            spline = add_component(actor, unreal.SplineComponent)
            spline.set_spline_points(world, unreal.SplineCoordinateSpace.WORLD, True)
            actor.tags = [unreal.Name(layer), unreal.Name(kind), unreal.Name("width_" + str(width))]
            made += 1
    unreal.log("Added " + str(made) + " OSM splines")


main()
`;
};
