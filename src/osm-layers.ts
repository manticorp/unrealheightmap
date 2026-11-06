/**
 * OpenStreetMap layer masks: fetch OSM features for the export area from the
 * Overpass API and rasterise them into per-layer greyscale masks the same size
 * as the heightmap, for landscape layer painting and splatmaps.
 *
 * Everything apart from fetchOsmLayers is pure so it can run in the worker and
 * be unit tested.
 */

import {DerivedMap} from './derived-maps';
import {rotateIn, rotateOut} from './area';

export type LatLng = [number, number];

export type BBox = {south: number, west: number, north: number, east: number};

type TagRule = {
  key: string;
  /** Accepted values, or '*' for any value other than "no". */
  values: string[] | '*';
};

export type OsmLayer = {
  id: string;
  label: string;
  description: string;
  kind: 'line' | 'area';
  tags: TagRule[];
  /** Line widths in metres by tag value; a numeric `width=*` tag on the way wins. */
  widths?: {[value: string]: number};
};

export type OsmFeature = {
  layer: string;
  kind: 'line' | 'area';
  widthMetres?: number;
  /** Tag value that matched, e.g. "motorway" or "stream". */
  value?: string;
  name?: string;
  /** Buildings: height in metres from height=* or building:levels=*. */
  heightMetres?: number;
  /** Lines on a bridge: kept as splines but never carved into the ground. */
  bridge?: boolean;
  /** Area rings, filled together with the even-odd rule so inner rings become holes. */
  rings?: LatLng[][];
  lines?: LatLng[][];
};

/*
 * Line widths are typical full widths (carriageway, track bed, channel) rather
 * than lane counts. Sea is not in OSM as polygons (only natural=coastline
 * lines), so it is left to the height-based water mask.
 */
export const OSM_LAYERS: OsmLayer[] = [
  {
    id: 'roads', label: 'Roads', kind: 'line',
    description: 'Motorways down to residential streets, service roads and tracks.',
    tags: [{key: 'highway', values: [
      'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential',
      'living_street', 'service', 'track', 'road', 'busway',
      'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link',
    ]}],
    widths: {
      motorway: 22, trunk: 18, primary: 14, secondary: 11, tertiary: 9, unclassified: 6,
      residential: 7, living_street: 6, service: 4.5, track: 3, road: 6, busway: 6,
      motorway_link: 8, trunk_link: 7, primary_link: 7, secondary_link: 6, tertiary_link: 6,
    },
  },
  {
    id: 'paths', label: 'Paths', kind: 'line',
    description: 'Footways, paths, cycleways, bridleways, steps and pedestrian streets.',
    tags: [{key: 'highway', values: ['footway', 'path', 'cycleway', 'bridleway', 'steps', 'pedestrian']}],
    widths: {footway: 2, path: 1.5, cycleway: 2.5, bridleway: 2.5, steps: 2, pedestrian: 5},
  },
  {
    id: 'railways', label: 'Railways', kind: 'line',
    description: 'Railway, light rail, narrow gauge and tram tracks (not tunnels).',
    tags: [{key: 'railway', values: ['rail', 'light_rail', 'narrow_gauge', 'tram']}],
    widths: {rail: 4, light_rail: 3, narrow_gauge: 2.5, tram: 3},
  },
  {
    id: 'rivers', label: 'Rivers & streams', kind: 'line',
    description: 'River and canal centre lines plus streams, ditches and drains.',
    tags: [{key: 'waterway', values: ['river', 'canal', 'stream', 'brook', 'ditch', 'drain']}],
    widths: {river: 20, canal: 12, stream: 3, brook: 2, ditch: 1.5, drain: 2},
  },
  {
    id: 'water', label: 'Lakes & water', kind: 'area',
    description: 'Lakes, ponds, reservoirs, basins and river areas. Not the sea.',
    tags: [
      {key: 'natural', values: ['water']},
      {key: 'waterway', values: ['riverbank', 'dock']},
      {key: 'landuse', values: ['reservoir', 'basin']},
    ],
  },
  {
    id: 'forest', label: 'Forest', kind: 'area',
    description: 'Woods and managed forest.',
    tags: [{key: 'landuse', values: ['forest']}, {key: 'natural', values: ['wood']}],
  },
  {
    id: 'grass', label: 'Grass', kind: 'area',
    description: 'Grass, meadows, parks, recreation grounds and grassland.',
    tags: [
      {key: 'landuse', values: ['grass', 'meadow', 'recreation_ground', 'village_green']},
      {key: 'leisure', values: ['park']},
      {key: 'natural', values: ['grassland']},
    ],
  },
  {
    id: 'farmland', label: 'Farmland', kind: 'area',
    description: 'Fields, orchards, vineyards, farmyards and allotments.',
    tags: [{key: 'landuse', values: ['farmland', 'orchard', 'vineyard', 'farmyard', 'allotments']}],
  },
  {
    id: 'scrub', label: 'Scrub & heath', kind: 'area',
    description: 'Scrub and heathland.',
    tags: [{key: 'natural', values: ['scrub', 'heath']}],
  },
  {
    id: 'rock', label: 'Rock & scree', kind: 'area',
    description: 'Bare rock, scree and shingle.',
    tags: [{key: 'natural', values: ['bare_rock', 'scree', 'shingle']}],
  },
  {
    id: 'glacier', label: 'Glacier', kind: 'area',
    description: 'Glaciers and permanent snowfields.',
    tags: [{key: 'natural', values: ['glacier']}],
  },
  {
    id: 'sand', label: 'Sand & beach', kind: 'area',
    description: 'Sand, beaches and dunes.',
    tags: [{key: 'natural', values: ['sand', 'beach', 'dune']}],
  },
  {
    id: 'wetland', label: 'Wetland', kind: 'area',
    description: 'Marsh, bog, swamp and other wetland.',
    tags: [{key: 'natural', values: ['wetland']}],
  },
  {
    id: 'urban', label: 'Urban', kind: 'area',
    description: 'Residential, commercial, industrial and retail land use.',
    tags: [{key: 'landuse', values: ['residential', 'commercial', 'industrial', 'retail']}],
  },
  {
    id: 'buildings', label: 'Buildings', kind: 'area',
    description: 'Building footprints. Dense in cities, so slow for large areas.',
    tags: [{key: 'building', values: '*'}],
  },
];

const layerById = (id: string): OsmLayer | undefined => {
  for (const layer of OSM_LAYERS) {
    if (layer.id === id) return layer;
  }
  return undefined;
};

const selectedLayers = (layerIds: string[]): OsmLayer[] =>
  layerIds.map(layerById).filter((l): l is OsmLayer => !!l);

/** Lowest to highest priority for weightNormalise: later layers paint over earlier ones. */
export const OSM_WEIGHT_ORDER = [
  'grass', 'farmland', 'scrub', 'forest', 'rock', 'glacier', 'sand', 'wetland', 'urban',
  'water', 'rivers', 'buildings', 'railways', 'paths', 'roads',
];

/**
 * Public Overpass instances cap memory and run time per query; beyond roughly
 * 50 x 50 km a query with buildings or roads in a populated region routinely
 * times out or returns hundreds of MB.
 */
export const OSM_MAX_AREA_KM2 = 2500;

export const osmAttribution =
  'Map data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>, ' +
  'available under the <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener">Open Database License (ODbL)</a>';

export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const EARTH_RADIUS_KM = 6371.0088;

export const bboxAreaKm2 = (b: BBox): number => {
  const rad = Math.PI / 180;
  return EARTH_RADIUS_KM * EARTH_RADIUS_KM * Math.abs(b.east - b.west) * rad *
    Math.abs(Math.sin(b.north * rad) - Math.sin(b.south * rad));
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const tagFilter = (key: string, values: string[] | '*'): string => {
  if (values === '*') return `["${key}"]`;
  if (values.length === 1) return `["${key}"="${values[0]}"]`;
  return `["${key}"~"^(${values.map(escapeRegex).join('|')})$"]`;
};

/**
 * One union query for every selected layer. Values are merged per tag key so
 * e.g. all landuse classes cost a single statement; areas also pull in
 * multipolygon relations.
 */
export const buildOverpassQuery = (bbox: BBox, layerIds: string[], timeoutSec = 90): string => {
  const wayValues: {[key: string]: string[] | '*'} = {};
  const relValues: {[key: string]: string[] | '*'} = {};
  const keys: string[] = [];
  const add = (target: {[key: string]: string[] | '*'}, rule: TagRule) => {
    if (keys.indexOf(rule.key) < 0) keys.push(rule.key);
    const existing = target[rule.key];
    if (existing === '*' || rule.values === '*') {
      target[rule.key] = '*';
      return;
    }
    const merged = existing ? existing.slice() : [];
    for (const v of rule.values) {
      if (merged.indexOf(v) < 0) merged.push(v);
    }
    target[rule.key] = merged;
  };
  for (const layer of selectedLayers(layerIds)) {
    for (const rule of layer.tags) {
      add(wayValues, rule);
      if (layer.kind === 'area') add(relValues, rule);
    }
  }
  const statements: string[] = [];
  for (const key of keys) {
    if (wayValues[key]) statements.push(`way${tagFilter(key, wayValues[key])};`);
    if (relValues[key]) statements.push(`rel["type"="multipolygon"]${tagFilter(key, relValues[key])};`);
  }
  const f = (n: number) => n.toFixed(6);
  return `[out:json][timeout:${Math.round(timeoutSec)}][bbox:${f(bbox.south)},${f(bbox.west)},${f(bbox.north)},${f(bbox.east)}];` +
    `(${statements.join('')});out geom;`;
};

type OverpassPoint = {lat: number, lon: number} | null;
type OverpassMember = {type: string, ref: number, role?: string, geometry?: OverpassPoint[]};
type OverpassElement = {
  type: string;
  id: number;
  tags?: {[key: string]: string};
  geometry?: OverpassPoint[];
  members?: OverpassMember[];
};
export type OverpassResponse = {elements?: OverpassElement[], remark?: string};

/** Tag value that matched the layer, or undefined. */
const matchValue = (layer: OsmLayer, tags: {[key: string]: string}): string | undefined => {
  for (const rule of layer.tags) {
    const v = tags[rule.key];
    if (v === undefined) continue;
    if (rule.values === '*' ? v !== 'no' : rule.values.indexOf(v) >= 0) return v;
  }
  return undefined;
};

const HIDDEN_LINES = ['yes', 'culvert', 'building_passage'];

const parseWidth = (text: string | undefined): number | undefined => {
  if (!text) return undefined;
  const m = /^\s*([0-9]+(?:\.[0-9]+)?)\s*(m|metres|meters)?\s*$/.exec(text);
  if (!m) return undefined;
  const w = parseFloat(m[1]);
  return w > 0.3 && w < 500 ? w : undefined;
};

/** Height of a building in metres from height=* or building:levels=*. */
export const buildingHeight = (tags: {[key: string]: string}): number | undefined => {
  const h = /^\s*([0-9]+(?:\.[0-9]+)?)\s*(m)?\s*$/.exec(tags.height || '');
  if (h) {
    const v = parseFloat(h[1]);
    if (v > 0 && v < 1000) return v;
  }
  const levels = parseFloat(tags['building:levels'] || '');
  if (levels > 0 && levels < 200) return levels * 3 + (parseFloat(tags['roof:levels'] || '') > 0 ? 1.5 : 0);
  return undefined;
};

const extraTags = (tags: {[key: string]: string}) => {
  const out: {name?: string, heightMetres?: number} = {};
  if (tags.name) out.name = tags.name;
  if (tags.building) {
    const h = buildingHeight(tags);
    if (h) out.heightMetres = h;
  }
  return out;
};

const toLatLngs = (geometry: OverpassPoint[] | undefined): LatLng[] | undefined => {
  if (!geometry) return undefined;
  const out: LatLng[] = [];
  for (const p of geometry) {
    if (!p) return undefined;
    out.push([p.lat, p.lon]);
  }
  return out;
};

const pointKey = (p: LatLng) => `${p[0].toFixed(7)},${p[1].toFixed(7)}`;

const isClosed = (ring: LatLng[]) => ring.length >= 4 && pointKey(ring[0]) === pointKey(ring[ring.length - 1]);

/**
 * Join way segments end-to-end into closed rings, reversing segments where
 * needed. Chains that never close are dropped since they cannot be filled.
 */
export const joinRings = (segments: LatLng[][]): LatLng[][] => {
  const rings: LatLng[][] = [];
  const open: LatLng[][] = [];
  for (const seg of segments) {
    if (seg.length < 2) continue;
    if (isClosed(seg)) rings.push(seg);
    else open.push(seg);
  }
  const byEnd: {[key: string]: number[]} = {};
  const index = (key: string, i: number) => (byEnd[key] = byEnd[key] || []).push(i);
  open.forEach((seg, i) => {
    index(pointKey(seg[0]), i);
    index(pointKey(seg[seg.length - 1]), i);
  });
  const used: boolean[] = open.map(() => false);
  for (let i = 0; i < open.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const ring = open[i].slice();
    const startKey = pointKey(ring[0]);
    for (;;) {
      const endKey = pointKey(ring[ring.length - 1]);
      if (endKey === startKey) {
        if (ring.length >= 4) rings.push(ring);
        break;
      }
      const candidates = byEnd[endKey] || [];
      let next = -1;
      for (const j of candidates) {
        if (!used[j]) {
          next = j;
          break;
        }
      }
      if (next < 0) break;
      used[next] = true;
      const seg = open[next];
      const ordered = pointKey(seg[0]) === endKey ? seg : seg.slice().reverse();
      for (let k = 1; k < ordered.length; k++) ring.push(ordered[k]);
    }
  }
  return rings;
};

const multipolygonRings = (members: OverpassMember[]): LatLng[][] => {
  const outer: LatLng[][] = [];
  const inner: LatLng[][] = [];
  for (const m of members) {
    if (m.type !== 'way') continue;
    const pts = toLatLngs(m.geometry);
    if (!pts) continue;
    (m.role === 'inner' ? inner : outer).push(pts);
  }
  return joinRings(outer).concat(joinRings(inner));
};

/**
 * Turn an Overpass `out geom` response into features for the requested
 * layers. One element can feed several layers (e.g. natural=water and
 * landuse=reservoir); open ways with area tags are ignored.
 */
export const parseOverpass = (json: OverpassResponse, layerIds: string[]): OsmFeature[] => {
  const layers = selectedLayers(layerIds);
  const features: OsmFeature[] = [];
  for (const el of json.elements || []) {
    const tags = el.tags || {};
    for (const layer of layers) {
      const value = matchValue(layer, tags);
      if (value === undefined) continue;
      if (layer.kind === 'line') {
        if (el.type !== 'way' || tags.area === 'yes') continue;
        if (HIDDEN_LINES.indexOf(tags.tunnel) >= 0 || tags.location === 'underground') continue;
        const line = toLatLngs(el.geometry);
        if (!line || line.length < 2) continue;
        const widthMetres = parseWidth(tags.width) ?? (layer.widths && layer.widths[value]) ?? 3;
        const bridge = !!tags.bridge && tags.bridge !== 'no';
        features.push({layer: layer.id, kind: 'line', widthMetres, lines: [line], value, ...extraTags(tags), ...(bridge ? {bridge} : {})});
      } else if (el.type === 'way') {
        const ring = toLatLngs(el.geometry);
        if (!ring || !isClosed(ring)) continue;
        features.push({layer: layer.id, kind: 'area', rings: [ring], value, ...extraTags(tags)});
      } else if (el.type === 'relation' && tags.type === 'multipolygon' && el.members) {
        const rings = multipolygonRings(el.members);
        if (rings.length) features.push({layer: layer.id, kind: 'area', rings, value, ...extraTags(tags)});
      }
    }
  }
  return features;
};

export type FetchLike = (url: string, init: {
  method: string;
  headers: {[key: string]: string};
  body: string;
  signal?: AbortSignal;
}) => Promise<{ok: boolean, status: number, text(): Promise<string>}>;

const RETRY_STATUSES = [429, 502, 503, 504];

const describeFailure = (status: number, body: string): string => {
  if (status === 429) return 'The OpenStreetMap server is rate limiting requests. Wait a minute and try again.';
  if (/timed out|timeout/i.test(body) || status === 504) {
    return 'The OpenStreetMap query timed out. Try a smaller area or fewer layers (buildings and paths are the heaviest).';
  }
  if (/out of memory/i.test(body)) {
    return 'The OpenStreetMap query ran out of memory. Try a smaller area or fewer layers.';
  }
  return `The OpenStreetMap server returned an error (HTTP ${status}).`;
};

/**
 * Fetch and parse OSM features for the area, trying each Overpass endpoint in
 * turn when one is busy, rate limiting or unreachable.
 */
export const fetchOsmLayers = async (
  bbox: BBox,
  layerIds: string[],
  fetchImpl: FetchLike,
  options: {endpoint?: string, signal?: AbortSignal, timeoutSec?: number} = {},
): Promise<OsmFeature[]> => {
  if (!selectedLayers(layerIds).length) return [];
  const area = bboxAreaKm2(bbox);
  if (area > OSM_MAX_AREA_KM2) {
    throw new Error(`The area is too large for OpenStreetMap layers (${Math.round(area)} km², limit ${OSM_MAX_AREA_KM2} km²). ` +
      'Zoom in or reduce the export size.');
  }
  const query = buildOverpassQuery(bbox, layerIds, options.timeoutSec ?? 90);
  const endpoints = options.endpoint ? [options.endpoint] : OVERPASS_ENDPOINTS;
  let lastError: Error | undefined;
  for (const endpoint of endpoints) {
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'data=' + encodeURIComponent(query),
        signal: options.signal,
      });
    } catch (e) {
      if (options.signal && options.signal.aborted) throw e;
      lastError = new Error('Could not reach the OpenStreetMap server. Check your connection and try again.');
      continue;
    }
    const body = await response.text();
    if (!response.ok) {
      lastError = new Error(describeFailure(response.status, body));
      if (RETRY_STATUSES.indexOf(response.status) >= 0) continue;
      throw lastError;
    }
    let json: OverpassResponse;
    try {
      json = JSON.parse(body);
    } catch (e) {
      lastError = new Error('The OpenStreetMap server sent an unreadable response.');
      continue;
    }
    // Overpass reports timeouts hit while writing output as a 200 with a remark
    if (json.remark && /runtime error/i.test(json.remark)) {
      throw new Error(describeFailure(200, json.remark));
    }
    return parseOverpass(json, layerIds);
  }
  throw lastError || new Error('No OpenStreetMap server available.');
};

/** Pixel grid of the export: fractional slippy-tile position of the top-left corner at `zoom`. */
export type OsmGrid = {
  zoom: number;
  x0: number;
  y0: number;
  width: number;
  height: number;
  /** Fixed ground scale for line widths; omit to use the true scale at each feature's latitude. */
  metresPerPixel?: number;
  /** Degrees clockwise the pixel grid is rotated about its centre. */
  rotation?: number;
};

const TILE_SIZE = 256;

export const latLngToPixel = (grid: OsmGrid, lat: number, lng: number): [number, number] => {
  const n = Math.pow(2, grid.zoom);
  const latRad = lat * Math.PI / 180;
  const tx = (lng + 180) / 360 * n;
  const ty = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  const px = (tx - grid.x0) * TILE_SIZE, py = (ty - grid.y0) * TILE_SIZE;
  if (!grid.rotation) return [px, py];
  const cx = grid.width / 2, cy = grid.height / 2;
  const [u, v] = rotateIn(px - cx, py - cy, grid.rotation);
  return [cx + u, cy + v];
};

export const pixelToLatLng = (grid: OsmGrid, px: number, py: number): LatLng => {
  if (grid.rotation) {
    const cx = grid.width / 2, cy = grid.height / 2;
    const [dx, dy] = rotateOut(px - cx, py - cy, grid.rotation);
    px = cx + dx;
    py = cy + dy;
  }
  const n = Math.pow(2, grid.zoom);
  const tx = grid.x0 + px / TILE_SIZE;
  const ty = grid.y0 + py / TILE_SIZE;
  const m = Math.PI - 2 * Math.PI * ty / n;
  return [180 / Math.PI * Math.atan(0.5 * (Math.exp(m) - Math.exp(-m))), tx / n * 360 - 180];
};

/** Lat/lng box covering the grid, for the Overpass query. */
export const gridBBox = (grid: OsmGrid): BBox => {
  const corners = [[0, 0], [grid.width, 0], [0, grid.height], [grid.width, grid.height]]
    .map(([x, y]) => pixelToLatLng(grid, x, y));
  return {
    south: Math.min(...corners.map(c => c[0])),
    north: Math.max(...corners.map(c => c[0])),
    west: Math.min(...corners.map(c => c[1])),
    east: Math.max(...corners.map(c => c[1])),
  };
};

const groundMetresPerPixel = (zoom: number, lat: number) =>
  156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);

export type RasterizeOptions = {
  /** Vertical samples per pixel row for polygons (horizontal coverage is exact). Default 4. */
  supersample?: 1 | 2 | 4 | 8;
  /** Box-blur radius in pixels applied to each mask after drawing, to soften layer edges. */
  feather?: number;
  /** Thinnest a line may be drawn, in pixels, so small paths survive coarse zooms. Default 1. */
  minLineWidthPx?: number;
  /** Layers to output, in order, including empty ones. Defaults to catalogue order of layers present. */
  layerIds?: string[];
};

/**
 * Even-odd scanline fill of all rings with analytic horizontal coverage and
 * `ss` sampled sub-rows per pixel. Coverage is summed into `acc` (one entry per
 * image pixel) then max-combined into `out` so overlapping features union.
 */
const fillPolygon = (
  rings: Float64Array[], width: number, height: number, ss: number,
  acc: Float32Array, out: Uint8Array,
) => {
  let edgeCount = 0;
  let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
  for (const r of rings) {
    edgeCount += r.length / 2;
    for (let i = 0; i < r.length; i += 2) {
      if (r[i] < minX) minX = r[i];
      if (r[i] > maxX) maxX = r[i];
      if (r[i + 1] < minY) minY = r[i + 1];
      if (r[i + 1] > maxY) maxY = r[i + 1];
    }
  }
  const row0 = Math.max(0, Math.floor(minY));
  const row1 = Math.min(height, Math.ceil(maxY));
  const col0 = Math.max(0, Math.floor(minX));
  const col1 = Math.min(width, Math.ceil(maxX));
  if (row0 >= row1 || col0 >= col1) return;

  // Edges as (xTop, yTop, yBottom, dx/dy), sorted by yTop for an active edge list
  const ex = new Float64Array(edgeCount), ey0 = new Float64Array(edgeCount);
  const ey1 = new Float64Array(edgeCount), eslope = new Float64Array(edgeCount);
  let n = 0;
  for (const r of rings) {
    const count = r.length / 2;
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count;
      let x0 = r[i * 2], y0 = r[i * 2 + 1], x1 = r[j * 2], y1 = r[j * 2 + 1];
      if (y0 === y1) continue;
      if (y0 > y1) {
        let t = x0; x0 = x1; x1 = t;
        t = y0; y0 = y1; y1 = t;
      }
      if (y1 <= row0 || y0 >= row1) continue;
      ex[n] = x0; ey0[n] = y0; ey1[n] = y1; eslope[n] = (x1 - x0) / (y1 - y0);
      n++;
    }
  }
  const order: number[] = [];
  for (let i = 0; i < n; i++) order.push(i);
  order.sort((a, b) => ey0[a] - ey0[b]);

  let active: number[] = [];
  let next = 0;
  const xs: number[] = [];
  const weight = 1 / ss;
  for (let row = row0; row < row1; row++) {
    const base = row * width;
    for (let s = 0; s < ss; s++) {
      const yc = row + (s + 0.5) / ss;
      while (next < n && ey0[order[next]] <= yc) active.push(order[next++]);
      active = active.filter(e => ey1[e] > yc);
      xs.length = 0;
      for (const e of active) {
        if (ey0[e] <= yc) xs.push(ex[e] + (yc - ey0[e]) * eslope[e]);
      }
      if (xs.length < 2) continue;
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(col0, xs[k]);
        const xb = Math.min(col1, xs[k + 1]);
        if (xb <= xa) continue;
        const pa = Math.floor(xa);
        const pb = Math.min(col1 - 1, Math.floor(xb));
        if (pa === pb) {
          acc[base + pa] += (xb - xa) * weight;
          continue;
        }
        acc[base + pa] += (pa + 1 - xa) * weight;
        for (let p = pa + 1; p < pb; p++) acc[base + p] += weight;
        acc[base + pb] += (xb - pb) * weight;
      }
    }
  }
  for (let row = row0; row < row1; row++) {
    const base = row * width;
    for (let p = base + col0; p < base + col1; p++) {
      const v = acc[p];
      if (v > 0) {
        const b = Math.round(Math.min(1, v) * 255);
        if (b > out[p]) out[p] = b;
        acc[p] = 0;
      }
    }
  }
};

/** Intersect [lo, hi] with {x : lo2 <= a*x + b <= hi2}. */
const clampLinear = (range: [number, number], a: number, b: number, lo2: number, hi2: number): boolean => {
  if (Math.abs(a) < 1e-12) return b >= lo2 && b <= hi2;
  let x0 = (lo2 - b) / a, x1 = (hi2 - b) / a;
  if (x0 > x1) {
    const t = x0; x0 = x1; x1 = t;
  }
  range[0] = Math.max(range[0], x0);
  range[1] = Math.min(range[1], x1);
  return range[0] <= range[1];
};

/**
 * Round-capped thick segment with coverage from distance to the centre line
 * (1px linear falloff). Rows only visit the capsule's own x-span, so long
 * diagonal segments cost their area rather than their bounding box.
 */
const drawSegment = (
  ax: number, ay: number, bx: number, by: number, radius: number,
  width: number, height: number, out: Uint8Array,
) => {
  const reach = radius + 0.5;
  const row0 = Math.max(0, Math.floor(Math.min(ay, by) - reach));
  const row1 = Math.min(height - 1, Math.ceil(Math.max(ay, by) + reach));
  if (row0 > row1) return;
  if (Math.max(ax, bx) + reach < 0 || Math.min(ax, bx) - reach > width) return;
  const dx = bx - ax, dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = len > 0 ? dx / len : 1, uy = len > 0 ? dy / len : 0;
  const lenSq = len * len;
  const span: [number, number] = [0, 0];
  for (let row = row0; row <= row1; row++) {
    const yc = row + 0.5;
    let lo = Infinity, hi = -Infinity;
    for (let k = 0; k < 2; k++) {
      const cx = k ? bx : ax, cy = k ? by : ay;
      const d = yc - cy;
      if (Math.abs(d) <= reach) {
        const h = Math.sqrt(reach * reach - d * d);
        lo = Math.min(lo, cx - h);
        hi = Math.max(hi, cx + h);
      }
    }
    if (len > 0) {
      // Body: 0 <= along <= len and |across| <= reach, both linear in x along the row
      span[0] = -Infinity; span[1] = Infinity;
      if (clampLinear(span, ux, (yc - ay) * uy - ax * ux, 0, len) &&
        clampLinear(span, -uy, (yc - ay) * ux + ax * uy, -reach, reach) &&
        isFinite(span[0]) && isFinite(span[1])) {
        lo = Math.min(lo, span[0]);
        hi = Math.max(hi, span[1]);
      }
    }
    if (lo > hi) continue;
    const c0 = Math.max(0, Math.ceil(lo - 0.5));
    const c1 = Math.min(width - 1, Math.floor(hi - 0.5));
    const base = row * width;
    for (let col = c0; col <= c1; col++) {
      const xc = col + 0.5;
      let t = lenSq > 0 ? ((xc - ax) * dx + (yc - ay) * dy) / lenSq : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = xc - ax - t * dx, qy = yc - ay - t * dy;
      const cover = reach - Math.sqrt(qx * qx + qy * qy);
      if (cover <= 0) continue;
      const b = cover >= 1 ? 255 : Math.round(cover * 255);
      if (b > out[base + col]) out[base + col] = b;
    }
  }
};

/** Two passes of a separable box blur (close to a gaussian), in place. */
const featherMask = (data: Uint8Array, width: number, height: number, radius: number) => {
  const r = Math.round(radius);
  if (r < 1) return;
  const tmp = new Float32Array(data.length);
  const src = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) src[i] = data[i];
  const pass = (from: Float32Array, to: Float32Array, n: number, lines: number, stride: number, step: number) => {
    for (let line = 0; line < lines; line++) {
      const start = line * stride;
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += from[start + Math.min(n - 1, Math.max(0, k)) * step];
      for (let i = 0; i < n; i++) {
        to[start + i * step] = sum / (2 * r + 1);
        sum += from[start + Math.min(n - 1, i + r + 1) * step] - from[start + Math.max(0, i - r) * step];
      }
    }
  };
  for (let iter = 0; iter < 2; iter++) {
    pass(src, tmp, width, height, width, 1);
    pass(tmp, src, height, width, 1, width);
  }
  for (let i = 0; i < data.length; i++) data[i] = Math.round(src[i]);
};

const projectPath = (grid: OsmGrid, path: LatLng[]): Float64Array => {
  const out = new Float64Array(path.length * 2);
  for (let i = 0; i < path.length; i++) {
    const p = latLngToPixel(grid, path[i][0], path[i][1]);
    out[i * 2] = p[0];
    out[i * 2 + 1] = p[1];
  }
  return out;
};

/**
 * Rasterise features into one 8-bit mask per layer (`osm_<id>`), 255 = fully
 * covered, anti-aliased. Features extending past the image are clipped.
 */
export const rasterizeLayers = (features: OsmFeature[], grid: OsmGrid, opts: RasterizeOptions = {}): DerivedMap[] => {
  const width = Math.round(grid.width);
  const height = Math.round(grid.height);
  const ss = opts.supersample ?? 4;
  const minLineWidth = opts.minLineWidthPx ?? 1;
  let ids = opts.layerIds;
  if (!ids) {
    ids = OSM_LAYERS.map(l => l.id).filter(id => features.some(f => f.layer === id));
  }
  const masks: {[id: string]: Uint8Array} = {};
  for (const id of ids) masks[id] = new Uint8Array(width * height);
  let acc: Float32Array | undefined;

  for (const feature of features) {
    const out = masks[feature.layer];
    if (!out) continue;
    if (feature.kind === 'area' && feature.rings) {
      acc = acc || new Float32Array(width * height);
      const rings = feature.rings.filter(r => r.length >= 3).map(r => projectPath(grid, r));
      if (rings.length) fillPolygon(rings, width, height, ss, acc, out);
    } else if (feature.kind === 'line' && feature.lines) {
      for (const line of feature.lines) {
        if (line.length < 2) continue;
        const mpp = grid.metresPerPixel ?? groundMetresPerPixel(grid.zoom, line[0][0]);
        const radius = Math.max(minLineWidth, (feature.widthMetres ?? 3) / mpp) / 2;
        const p = projectPath(grid, line);
        for (let i = 0; i + 3 < p.length; i += 2) {
          drawSegment(p[i], p[i + 1], p[i + 2], p[i + 3], radius, width, height, out);
        }
      }
    }
  }
  return ids.map(id => {
    if (opts.feather) featherMask(masks[id], width, height, opts.feather);
    return {name: `osm_${id}`, channels: 1 as const, data: masks[id]};
  });
};

/**
 * Weightmaps that sum to exactly 255 per pixel, for engines whose layers must
 * add up to 1. Each layer takes its coverage share of whatever the layers above
 * it in `layerOrder` (lowest priority first) left over; `osmw_base` gets the rest.
 * Masks not named in `layerOrder` go underneath, in their given order.
 */
export const weightNormalise = (maps: DerivedMap[], layerOrder: string[] = OSM_WEIGHT_ORDER): DerivedMap[] => {
  const idOf = (m: DerivedMap) => m.name.replace(/^osm_/, '');
  const rank = (m: DerivedMap) => {
    const i = layerOrder.indexOf(idOf(m));
    return i < 0 ? -1 : i;
  };
  const ordered = maps.filter(m => m.channels === 1)
    .map((m, i) => ({m, i}))
    .sort((a, b) => rank(a.m) - rank(b.m) || a.i - b.i)
    .map(e => e.m);
  const size = ordered.length ? ordered[0].data.length : 0;
  const weights = ordered.map(() => new Uint8Array(size));
  const base = new Uint8Array(size);
  for (let p = 0; p < size; p++) {
    let remaining = 255;
    for (let k = ordered.length - 1; k >= 0 && remaining > 0; k--) {
      const w = Math.round(ordered[k].data[p] * remaining / 255);
      weights[k][p] = w;
      remaining -= w;
    }
    base[p] = remaining;
  }
  const out: DerivedMap[] = [{name: 'osmw_base', channels: 1, data: base}];
  ordered.forEach((m, k) => out.push({name: `osmw_${idOf(m)}`, channels: 1, data: weights[k]}));
  return out;
};
