import * as Comlink from "comlink";

import {
  TypedArray,
  TileCoords,
  LatLng,
  LatLngZoom,
  ConfigState,
  TileLoadState,
  NormaliseMode
  } from "./helpers";

import PNG from "./png";
import {
  ProcessOptions,
  DerivedMap,
  computeDerivedMaps,
  flattenBelow,
  wantsDerivedMaps,
} from "./derived-maps";
import {autoContourInterval} from "./processor-helpers";
import {OsmFeature, OsmGrid, rasterizeLayers, weightNormalise} from "./osm-layers";
import JSZip from 'jszip';
import {ResampleSpec, applyShapeMask, resampleRotated} from "./area";
import {EdgeMismatch, SeamlessOptions, edgeMismatch, makeSeamless} from "./seamless";
import {CarveOptions, CarveResult, carveTerrain, wantsCarve} from "./carve";
import {PaintSettings, paintTerrain, terrainFields} from "./painter";
import {NamedPoints, ScatterSet, scatterBlenderScript, scatterPoints, scatterToCsv, scatterUnrealScript} from "./scatter";
import {LeafMasks, TREE_STRIDE, TreeRaster, TreeSettings, TreemapResult, buildTreemap, treesToCsv} from "./trees";
import {buildSplines, splinesBlenderScript, splinesToCsv, splinesToGeoJson, splinesUnrealScript, toBlender} from "./splines";
import {annualInsolation, resizeGrid, viewshed as computeViewshed, ViewshedOptions, InsolationOptions} from "./analysis";
import {PosterMapOptions, renderPosterMap} from "./poster";
import {BuildingOptions, appendBuildings, buildingFootprints, defaultBuildingOptions} from "./buildings";
import {THREEMF_CONTENT_TYPES, THREEMF_RELS, ThreeMfObject, autoBandLevels, bandMeshes, boxesMesh, labelBoxes, lithophaneThickness, mergeMeshes, threeMfModel} from "./print3d";
import {
  contourLayerSvgs,
  contourLevels,
  contoursToDxf,
  contoursToSvg,
  simplifyContours,
  smoothHeights,
  traceContours,
} from "./contours";
import {
  Mesh,
  MeshFormat,
  MeshInput,
  MeshOptions,
  MeshTexture,
  SimplifyPreset,
  buildMesh,
  computeVertexNormals,
  encodeMesh,
  meshGridSize,
  meshToObjWithMaterial,
  simplifyErrorForPreset,
} from "./mesh";

/** Turn a friendly simplification preset into a tolerance for this terrain. */
const withSimplify = (input : MeshInput, options : MeshOptions, preset : SimplifyPreset) : MeshOptions => {
  if (preset === 'off') return {...options, simplify: 0};
  const grid = meshGridSize(input.width, input.height, options.resolution);
  const spacing = Math.max(input.physWidth / Math.max(1, grid.width - 1), input.physHeight / Math.max(1, grid.height - 1));
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < input.heights.length; i++) {
    const h = input.heights[i];
    if (h < min) min = h;
    if (h > max) max = h;
  }
  return {...options, simplify: simplifyErrorForPreset(preset, spacing, max - min)};
};

export type NormaliseResult<T> = {
  data: T,
  minBefore: number,
  maxBefore: number,
  minAfter: number,
  maxAfter: number,
  /** Extra maps requested through ProcessOptions.maps, same size as data. */
  maps?: DerivedMap[],
  /** Size of `data` when the area plan changed it (rotation, seamless). */
  width?: number,
  height?: number,
  extras?: PipelineExtras,
};

/** How the stitched tiles become the output grid. */
export type AreaPlan = {
  /** Rotated areas: resample the stitched box into the rotated grid. */
  resample?: ResampleSpec;
  /** Seamless tiling down to the final width × height. */
  seamless?: {options: SeamlessOptions, width: number, height: number};
};

/** Terrain edits and extra outputs that need the whole area at once. */
export type TerrainOps = {
  /** Metres to subtract so the chosen sea level becomes 0 m. */
  seaLevel?: number;
  carve?: CarveOptions;
  /** Custom shape (lat/lng ring); outside it the ground drops to the lowest point inside. */
  shape?: [number, number][];
  /** OpenStreetMap features and the output grid they map onto. */
  features?: OsmFeature[];
  grid?: OsmGrid;
  paint?: PaintSettings;
  scatter?: ScatterSet[];
  /** OSM layers to export as splines. */
  splines?: string[];
  sunlight?: InsolationOptions;
  /** Real treemap from canopy height / tree cover rasters. */
  trees?: {settings: TreeSettings, rasters: TreeRaster[]};
  /** Report how well the area tiles as fetched. */
  edgeStats?: boolean;
  /** Base name for script files. */
  name?: string;
};

export type TreeStats = Pick<TreemapResult, 'cover' | 'conifers' | 'broadleaf' | 'detected' | 'scattered' | 'sources'> & {count: number, capped: boolean};

const treeStats = (r : TreemapResult) : TreeStats => ({
  cover: r.cover, conifers: r.conifers, broadleaf: r.broadleaf, detected: r.detected, scattered: r.scattered,
  sources: r.sources, count: r.points.count, capped: r.points.capped,
});

/** OpenStreetMap forests split by leaf_type, as masks on the grid. */
const leafMasks = (features : OsmFeature[] | undefined, grid : OsmGrid) : LeafMasks => {
  if (!features) return {};
  const groups : Record<keyof LeafMasks, OsmFeature[]> = {conifer: [], broadleaf: [], mixed: []};
  for (const f of features) {
    if (f.layer !== 'forest' || !f.leafType) continue;
    const t = f.leafType.toLowerCase();
    const key = t.startsWith('needle') ? 'conifer' : t.startsWith('broad') ? 'broadleaf' : t === 'mixed' ? 'mixed' : null;
    if (key) groups[key].push({...f, layer: key});
  }
  const out : LeafMasks = {};
  for (const key of Object.keys(groups) as (keyof LeafMasks)[]) {
    if (!groups[key].length) continue;
    const [mask] = rasterizeLayers(groups[key], grid, {layerIds: [key]});
    out[key] = mask.data;
  }
  return out;
};

export type ExtendedProcessOptions = ProcessOptions & {area?: AreaPlan, terrain?: TerrainOps};

export type TextFile = {filename: string, contents: string};

export type PipelineExtras = {
  edges?: EdgeMismatch & {heightRange: number};
  seamAdjust?: number;
  carve?: CarveResult;
  shapeFloor?: number;
  paintCoverage?: {name: string, share: number}[];
  scatterCounts?: {name: string, count: number, capped: boolean}[];
  splineCount?: number;
  sunlight?: {min: number, max: number, mean: number, flat: number};
  trees?: TreeStats;
  files?: TextFile[];
};

export type ProcessorProgressPhase = 'stitch' | 'normalise' | 'maps';

export type ProcessorProgressUpdate = {
  phase: ProcessorProgressPhase;
  completed: number;
  total: number;
};


export type NormRange = {from : number|null|undefined, to : number|null|undefined};
export const normMaxRange : NormRange = {from: -10929, to: 8848};
export const normDefaults : NormRange = {from: null, to: null};

const processor = {
  normaliseTypedArray<T extends TypedArray|number[]>(inp : T, norm: NormRange) : NormaliseResult<T> {
    let bpe = 2;
    if (!Array.isArray(inp)) {
      if (inp instanceof Float32Array) {
        bpe = 2;
      } else {
        bpe = inp.BYTES_PER_ELEMENT;
      }
    }
    // For some reason, typescript does not think the reduce function as
    // used below is compatible with all typedarrays
    //@ts-ignore
    const max = (typeof norm.to === 'number') ? norm.to : inp.reduce((prev : number, cur : number) : number => Math.max(prev, cur), 0);
    //@ts-ignore
    const min = (typeof norm.from === 'number') ? norm.from : inp.reduce((prev : number, cur : number) : number => Math.min(prev, cur), max);
    const newMax = Math.pow(2, bpe * 8);
    const newMin = 0;
    const sub = max - min;
    const nsub = newMax - newMin;
    const factor = newMax/(max - sub);
    inp.forEach((a : number, index : number) => {
      if (a >= max) inp[index] = newMax;
      else if (a <= min) inp[index] = newMin;
      else inp[index] = (((a-min)/sub) * nsub + newMin);
    });
    return {
      data: inp,
      minBefore: min,
      maxBefore: max,
      minAfter: newMin,
      maxAfter: newMax,
    };
  },
  normaliseTypedArraySmart<T extends TypedArray|number[]>(inp : T, norm: NormRange) : NormaliseResult<T> {
    let bpe = 2;
    if (!Array.isArray(inp)) {
      if (inp instanceof Float32Array) {
        bpe = 2;
      } else {
        bpe = inp.BYTES_PER_ELEMENT;
      }
    }
    const n = inp.length

    const numStdDeviations = 10;

    // For some reason, typescript does not think the reduce function as
    // used below is compatible with all typedarrays
    //@ts-ignore
    const mean = inp.reduce((a : number, b : number) => a + b) / n
    //@ts-ignore
    const stddev = Math.sqrt(inp.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
    //@ts-ignore
    const actualMax = inp.reduce((prev : number, cur : number) : number => Math.max(prev, cur), 0);
    const max = (typeof norm.to === 'number') ? norm.to : Math.min(mean+stddev * numStdDeviations, actualMax);
    //@ts-ignore
    const actualMin = inp.reduce((prev : number, cur : number) : number => Math.min(prev, cur), max);
    const min = (typeof norm.from === 'number') ? norm.from : Math.max(mean-stddev * numStdDeviations, actualMin);

    const newMax = Math.pow(2, bpe * 8);
    const newMin = 0;
    const sub = max - min;
    const nsub = newMax - newMin;
    const factor = newMax/(max - sub);
    inp.forEach((a : number, index : number) => {
      if (a >= max) inp[index] = newMax;
      else if (a <= min) inp[index] = newMin;
      else inp[index] = (((a-min)/sub) * nsub + newMin);
    });
    return {
      data: inp,
      minBefore: actualMin,
      maxBefore: actualMax,
      minAfter: newMin,
      maxAfter: newMax,
    };
  },
  normaliseTypedArraySmartWindow<T extends TypedArray>(inp : T, norm: NormRange) : NormaliseResult<T> {
    let bpe = 2;
    if (!Array.isArray(inp)) {
      if (inp instanceof Float32Array) {
        bpe = 2;
      } else {
        bpe = inp.BYTES_PER_ELEMENT;
      }
    }
    const n = inp.length

    const numStdDeviations = 10;

    // For some reason, typescript does not think the reduce function as
    // used below is compatible with all typedarrays
    //@ts-ignore
    const mean = inp.reduce((a : number, b : number) => a + b) / n
    //@ts-ignore
    const stddev = Math.sqrt(inp.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)

    const exclude = 0.0005;
    const copy = inp.slice(0);
    copy.sort();
    const offset = Math.ceil(copy.length * exclude);
    const length = Math.floor(copy.length * (1-exclude*2));
    const windowedCopy = copy.subarray(offset, length);

    //@ts-ignore
    const actualMax = copy[copy.length-1];
    const windowedMax = windowedCopy[windowedCopy.length-1];
    //@ts-ignore
    const actualMin = copy[0];
    const windowedMin = windowedCopy[0];

    const max = (typeof norm.to === 'number') ? norm.to : (windowedMax + stddev) > actualMax ? actualMax : windowedMax;
    const min = (typeof norm.from === 'number') ? norm.from : (windowedMin - stddev) < actualMin ? actualMin : windowedMin;

    const newMax = Math.pow(2, bpe * 8)-1;
    const newMin = 0;
    const sub = max - min;
    const nsub = newMax - newMin;
    const factor = newMax/(max - sub);
    inp.forEach((a : number, index : number) => {
      if (a >= max) inp[index] = newMax;
      else if (a <= min) inp[index] = newMin;
      else inp[index] = (((a-min)/sub) * nsub + newMin);
    });
    return {
      data: inp,
      minBefore: min,
      maxBefore: max,
      minAfter: newMin,
      maxAfter: newMax,
    };
  },
  combineImages(
    states : TileLoadState[],
    normaliseMode : number = NormaliseMode.Regular,
    norm : NormRange = normDefaults,
    progress?: (update: ProcessorProgressUpdate) => void,
    options: ExtendedProcessOptions = {}
  ) : NormaliseResult<Float32Array> {
    const reportProgress = (phase: ProcessorProgressPhase, completed: number, total: number) => {
      if (typeof progress === 'function') {
        progress({phase, completed, total});
      }
    };
    let width = Math.round(states[0].width);
    let height = Math.round(states[0].height);
    let output = this.stitch(states, (done : number, total : number) => reportProgress('stitch', done, total));
    const extras : PipelineExtras = {};
    const area = options.area;
    if (area?.resample) {
      output = resampleRotated(output, width, height, area.resample);
      width = area.resample.gridWidth;
      height = area.resample.gridHeight;
    }
    const terrain = options.terrain ?? {};
    if (terrain.edgeStats) {
      const coreW = area?.seamless?.width ?? width;
      const coreH = area?.seamless?.height ?? height;
      const core = coreW === width ? output : cropGrid(output, width, coreW, coreH);
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < core.length; i++) { if (core[i] < lo) lo = core[i]; if (core[i] > hi) hi = core[i]; }
      extras.edges = {...edgeMismatch(core, coreW, coreH), heightRange: hi - lo};
    }
    if (area?.seamless && area.seamless.options.mode !== 'off') {
      const tiled = makeSeamless(output, width, height, area.seamless.width, area.seamless.height, area.seamless.options);
      output = tiled.data;
      width = area.seamless.width;
      height = area.seamless.height;
      extras.seamAdjust = tiled.maxAdjust;
    } else if (area?.seamless && (width !== area.seamless.width || height !== area.seamless.height)) {
      output = cropGrid(output, width, area.seamless.width, area.seamless.height);
      width = area.seamless.width;
      height = area.seamless.height;
    }
    this.applyTerrainOps(output, width, height, options, extras, reportProgress);

    // Derived maps and the water mask need real heights, so build them
    // before flattening or normalising touches the data.
    let maps : DerivedMap[] = [];
    if (wantsDerivedMaps(options.maps)) {
      reportProgress('maps', 0, 1);
      maps = computeDerivedMaps(
        output,
        width,
        height,
        options.maps,
        options.metresPerPixel ?? {x: 1, y: 1},
        options.water?.level ?? 0
      );
      reportProgress('maps', 1, 1);
    }
    maps.push(...this.terrainOutputs(output, width, height, options, extras, reportProgress));
    if (options.water?.flatten) {
      flattenBelow(output, options.water.level);
    }
    let result : NormaliseResult<Float32Array> = {
      data: output,
      minBefore: Math.pow(2, 32),
      maxBefore: 0,
      minAfter: Math.pow(2, 32),
      maxAfter: 0,
    };
    reportProgress('normalise', 0, 1);
    if (
      normaliseMode == NormaliseMode.Regular ||
      (
        typeof norm.from == 'number' &&
        typeof norm.to == 'number'
      )
    ) {
      result = this.normaliseTypedArray(output, norm);
    } else if (normaliseMode == NormaliseMode.Smart) {
      result = this.normaliseTypedArraySmart(output, norm);
    } else if (normaliseMode == NormaliseMode.SmartWindow) {
      result = this.normaliseTypedArraySmartWindow(output, norm);
    } else {
      result.maxAfter = -Infinity;
      result.minAfter = Infinity;
      for (let i = 0; i < output.length; i++) {
        result.maxAfter = Math.max(output[i], result.maxAfter);
        result.minAfter = Math.min(output[i], result.minAfter);
      }
      result.maxBefore = result.maxAfter;
      result.minBefore = result.minAfter;
    }
    reportProgress('normalise', 1, 1);
    result.width = width;
    result.height = height;
    result.extras = extras;
    if (maps.length) {
      result.maps = maps;
      return Comlink.transfer(result, [result.data.buffer, ...maps.map(m => m.data.buffer)]);
    }
    return Comlink.transfer(result, [result.data.buffer]);
  },
  /** Copy the fetched tiles into one grid covering states[0]'s extent. */
  stitch(states : TileLoadState[], progress? : (done : number, total : number) => void) : Float32Array {
    const width = Math.round(states[0].width);
    const height = Math.round(states[0].height);
    const output = new Float32Array(width * height);
    const tileWidth = 256;
    const map : Record<number, Record<number, TileLoadState>> = {};
    for (let tile of states) {
      if (!map[tile.x]) {
        map[tile.x] = {};
      }
      map[tile.x][tile.y] = tile;
    }
    const left = states[0].exactPos.x - states[0].widthInTiles / 2;
    const top = states[0].exactPos.y - states[0].heightInTiles / 2;
    const n = Math.pow(2, states[0].z);
    const rowInterval = Math.max(1, Math.floor(height / 50));
    for (let row = 0; row < height; row++) {
      // Each output pixel takes the source pixel under its top-left corner, as before
      const y = top + row / tileWidth;
      const ty = Math.floor(y);
      const py = Math.min(tileWidth - 1, Math.floor((y - ty) * tileWidth));
      for (let col = 0; col < width; col++) {
        const x = left + col / tileWidth;
        const fx = Math.floor(x);
        const px = Math.min(tileWidth - 1, Math.floor((x - fx) * tileWidth));
        const tx = ((fx % n) + n) % n;
        const column = map[tx] ?? map[fx];
        const tile = column?.[ty];
        if (!tile) {
          throw new Error(`Tile ${fx}/${ty} was not loaded`);
        }
        output[row * width + col] = tile.heights[py * tileWidth + px];
      }
      if (progress && (row % rowInterval === 0 || row === height - 1)) progress(row + 1, height);
    }
    return output;
  },
  /** Sea level, carving and custom shapes: edits to the heights themselves. */
  applyTerrainOps(heights : Float32Array, width : number, height : number, options : ExtendedProcessOptions, extras : PipelineExtras, progress : (phase : ProcessorProgressPhase, done : number, total : number) => void) {
    const t = options.terrain;
    if (!t) return;
    if (t.seaLevel) {
      for (let i = 0; i < heights.length; i++) heights[i] -= t.seaLevel;
    }
    const mpp = options.metresPerPixel ?? {x: 1, y: 1};
    const grid = t.grid ? {...t.grid, width, height} : undefined;
    if (wantsCarve(t.carve) && t.features && grid) {
      progress('maps', 0, 1);
      extras.carve = carveTerrain(heights, width, height, t.features, grid, t.carve!, (mpp.x + mpp.y) / 2);
    }
    if (t.shape && t.shape.length >= 3 && grid) {
      const [mask] = rasterizeLayers([{layer: 'shape', kind: 'area', rings: [t.shape]}], grid, {layerIds: ['shape']});
      extras.shapeFloor = applyShapeMask(heights, mask.data).floor;
    }
  },
  /** Maps and files built from the finished heights (before flattening and normalising). */
  terrainOutputs(heights : Float32Array, width : number, height : number, options : ExtendedProcessOptions, extras : PipelineExtras, progress : (phase : ProcessorProgressPhase, done : number, total : number) => void) : DerivedMap[] {
    const t = options.terrain;
    if (!t) return [];
    const maps : DerivedMap[] = [];
    const mpp = options.metresPerPixel ?? {x: 1, y: 1};
    const grid = t.grid ? {...t.grid, width, height} : undefined;
    const files : TextFile[] = [];
    const name = t.name ?? 'terrain';
    if (t.shape && t.shape.length >= 3 && grid && options.maps) {
      const [mask] = rasterizeLayers([{layer: 'shape', kind: 'area', rings: [t.shape]}], grid, {layerIds: ['shape']});
      maps.push({name: 'area_mask', channels: 1, data: mask.data});
    }
    let paintWeights : Float32Array[] | null = null;
    let fields : ReturnType<typeof terrainFields> | null = null;
    const wantsPaint = !!t.paint?.enabled && t.paint.rules !== undefined;
    const scatterSets = t.scatter ?? [];
    if (wantsPaint || scatterSets.length) {
      fields = terrainFields(heights, width, height, mpp);
    }
    if (wantsPaint) {
      progress('maps', 0, 1);
      const masks = this.osmMasks(t.features, grid, [...t.paint!.rules.map(r => r.osm), ...scatterSets.map(s => s.source.startsWith('osm:') ? s.source.slice(4) : '')]);
      const painted = paintTerrain(heights, width, height, mpp, t.paint!, masks, fields!);
      maps.push(...painted.maps);
      maps.push({name: 'paint_preview', channels: 3, data: rgbaToRgb(painted.preview)});
      paintWeights = painted.weights;
      extras.paintCoverage = [...t.paint!.rules.map(r => r.name), t.paint!.baseName].map((n, i) => ({name: n, share: painted.coverage[i]}));
    }
    if (scatterSets.length) {
      const masks = this.osmMasks(t.features, grid, scatterSets.map(s => s.source.startsWith('osm:') ? s.source.slice(4) : ''));
      const all : NamedPoints[] = scatterSets.map((set, k) => {
        let weights : Float32Array | null = null;
        if (set.source.startsWith('paint:') && paintWeights) {
          weights = paintWeights[Math.min(paintWeights.length - 1, parseInt(set.source.slice(6), 10) || 0)];
        } else if (set.source.startsWith('osm:')) {
          const mask = masks[set.source.slice(4)];
          weights = new Float32Array(width * height);
          if (mask) for (let i = 0; i < mask.length; i++) weights[i] = mask[i] / 255;
        }
        return {set, points: scatterPoints(heights, weights, fields!.slope, width, height, mpp, set, 1000 + k)};
      });
      const sg = {width, height, metresPerPixelX: mpp.x, metresPerPixelY: mpp.y};
      files.push({filename: `${name}_scatter.csv`, contents: scatterToCsv(all, sg)});
      files.push({filename: `${name}_scatter_blender.py`, contents: scatterBlenderScript(all, sg, name)});
      files.push({filename: `${name}_scatter_unreal.py`, contents: scatterUnrealScript(all, name)});
      extras.scatterCounts = all.map(a => ({name: a.set.name, count: a.points.count, capped: a.points.capped}));
    }
    if (t.splines?.length && t.features && grid) {
      const splines = buildSplines(t.features, grid, heights, t.splines);
      const sg = {width, height, metresPerPixelX: mpp.x, metresPerPixelY: mpp.y};
      files.push({filename: `${name}_splines.csv`, contents: splinesToCsv(splines, sg)});
      files.push({filename: `${name}_splines.geojson`, contents: splinesToGeoJson(splines, grid)});
      files.push({filename: `${name}_splines_blender.py`, contents: splinesBlenderScript(splines, sg, name)});
      files.push({filename: `${name}_splines_unreal.py`, contents: splinesUnrealScript(splines, name)});
      extras.splineCount = splines.length;
    }
    if (t.sunlight) {
      const scale = Math.min(1, 256 / Math.max(width, height));
      const sw = Math.max(2, Math.round(width * scale)), sh = Math.max(2, Math.round(height * scale));
      const small = resizeGrid(heights, width, height, sw, sh);
      const sun = annualInsolation(small, sw, sh, {x: mpp.x * width / sw, y: mpp.y * height / sh}, t.sunlight,
        (d, total) => progress('maps', d, total));
      const full = resizeGrid(sun.data, sw, sh, width, height);
      const data = new Uint8Array(width * height);
      const range = Math.max(1e-6, sun.max);
      for (let i = 0; i < data.length; i++) data[i] = Math.max(0, Math.min(255, Math.round(full[i] / range * 255)));
      maps.push({name: 'sunlight', channels: 1, data});
      extras.sunlight = {min: sun.min, max: sun.max, mean: sun.mean, flat: sun.flatReference};
    }
    if (t.trees && grid) {
      progress('maps', 0, 1);
      const result = buildTreemap(heights, width, height, grid, mpp, t.trees.rasters, leafMasks(t.features, grid), t.trees.settings);
      maps.push(...result.maps);
      const sg = {width, height, metresPerPixelX: mpp.x, metresPerPixelY: mpp.y};
      files.push({filename: `${name}_trees.csv`, contents: treesToCsv(result.points, (x, y) => toBlender(sg, x, y))});
      // One instance set per leaf type; "scale" is the tree's height / 10 m
      const sets : NamedPoints[] = ['Conifers', 'Broadleaf'].map((label, type) => {
        const out : number[] = [];
        const d = result.points.data;
        for (let k = 0; k < d.length; k += TREE_STRIDE) {
          if (d[k + 6] === type) out.push(d[k], d[k + 1], d[k + 2], d[k + 3] / 10, d[k + 5]);
        }
        return {
          set: {name: label, source: 'trees', density: 0, spacing: 0, minScale: 1, maxScale: 1, maxSlope: 90, mesh: '/Engine/BasicShapes/Cone.Cone'},
          points: {data: Float32Array.from(out), count: out.length / 5, capped: false},
        };
      }).filter(s => s.points.count > 0);
      const note = 'Real trees: positions and heights from measured canopy data where available.\n"scale" is each tree\'s real height divided by 10 m: use tree models about\n10 m tall at scale 1 and every tree comes out at its real height.';
      files.push({filename: `${name}_trees_blender.py`, contents: scatterBlenderScript(sets, sg, name, {note})});
      files.push({filename: `${name}_trees_unreal.py`, contents: scatterUnrealScript(sets, name, {note, meshSize: 10})});
      extras.trees = treeStats(result);
    }
    if (files.length) extras.files = files;
    return maps;
  },
  /** Anti-aliased masks (0–255) for the OSM layers named, softened a little for blending. */
  osmMasks(features : OsmFeature[] | undefined, grid : OsmGrid | undefined, ids : string[]) : {[id : string] : Uint8Array} {
    const wanted = Array.from(new Set(ids.filter(Boolean)));
    if (!features || !grid || !wanted.length) return {};
    const out : {[id : string] : Uint8Array} = {};
    for (const map of rasterizeLayers(features, grid, {layerIds: wanted, feather: 1})) {
      out[map.name.replace(/^osm_/, '')] = map.data;
    }
    return out;
  },
  /** OSM features to one mask per layer (or weightmaps summing to 255). */
  rasterizeOsm(features : OsmFeature[], grid : OsmGrid, layerIds : string[], weights : boolean) {
    let maps = rasterizeLayers(features, grid, {layerIds});
    if (weights) {
      maps = weightNormalise(maps);
    }
    return Comlink.transfer(maps, maps.map(m => m.data.buffer));
  },
  /** Contour lines (or laser-cut layers) as SVG/DXF text. */
  buildContours(input : MeshInput, options : ContourJob) : ContourResult {
    const {width, height} = input;
    let heights = input.heights;
    if (options.smooth > 0) {
      heights = smoothHeights(heights, width, height, options.smooth);
    }
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < heights.length; i++) {
      if (heights[i] < min) min = heights[i];
      if (heights[i] > max) max = heights[i];
    }
    const interval = options.interval > 0 ? options.interval : autoContourInterval(max - min);
    const levels = contourLevels(min, max, interval);
    const layers = options.mode === 'layers';
    const contours = simplifyContours(traceContours(heights, width, height, levels, {closed: layers}), 0.25);
    const files : {name : string, text : string}[] = [];
    if (options.format === 'dxf') {
      files.push({name: 'contours.dxf', text: contoursToDxf(contours, {width, height, physWidth: input.physWidth, physHeight: input.physHeight, interval})});
    } else if (layers && options.separateSheets) {
      for (const sheet of contourLayerSvgs(contours, {width, height, outputWidthMm: options.widthMm, title: options.title})) {
        files.push({name: sheet.name, text: sheet.svg});
      }
    } else {
      files.push({name: 'contours.svg', text: contoursToSvg(contours, {width, height, outputWidthMm: options.widthMm, mode: options.mode, interval, title: options.title})});
    }
    return {files, interval, levels: levels.length, min, max};
  },
  /** Tree cover for the map overlay (no single trees, for speed). */
  treePreview(heights : Float32Array, width : number, height : number, grid : OsmGrid, mpp : {x : number, y : number}, rasters : TreeRaster[], features : OsmFeature[] | undefined, settings : TreeSettings) {
    const g = {...grid, width, height};
    const result = buildTreemap(heights, width, height, g, mpp, rasters, leafMasks(features, g), settings, {points: false});
    return Comlink.transfer({preview: result.preview, stats: treeStats(result)}, [result.preview.buffer]);
  },
  /** Contour rings for drawing on the map: same levels and smoothing as the export. */
  contourPreview(heights : Float32Array, width : number, height : number, options : {interval : number, smooth : number, closed : boolean}) {
    const smoothed = options.smooth > 0 ? smoothHeights(heights, width, height, options.smooth) : heights;
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < smoothed.length; i++) {
      if (smoothed[i] < min) min = smoothed[i];
      if (smoothed[i] > max) max = smoothed[i];
    }
    const interval = options.interval > 0 ? options.interval : autoContourInterval(max - min);
    const levels = contourLevels(min, max, interval);
    const contours = simplifyContours(traceContours(smoothed, width, height, levels, {closed: options.closed}), 0.5);
    const buffers = new Set<ArrayBuffer>();
    contours.forEach(c => c.rings.forEach(r => buffers.add(r.points.buffer as ArrayBuffer)));
    return Comlink.transfer({contours, interval, min, max}, Array.from(buffers));
  },
  /** Build a mesh and encode it as STL/OBJ/GLB/3MF, ready to download. */
  async buildMeshFile(input : MeshInput, options : MeshOptions, format : MeshFormat, name : string, preset : SimplifyPreset = 'off', texture? : MeshTexture & {filename : string}, extras : MeshExtras = {}) {
    if (extras.lithophane) {
      return this.buildLithophane(input, options, format, name, preset, extras);
    }
    const simplified = withSimplify(input, options, preset);
    let mesh = buildMesh(input, simplified);
    const notes : string[] = [];
    if (extras.buildings) {
      const added = this.addBuildings(mesh, input, simplified, extras.buildings);
      mesh = added.mesh;
      if (added.count) notes.push(`${added.count.toLocaleString()} buildings`);
    }
    let labelMesh : Mesh | null = null;
    if (extras.label && options.solid && mesh.units === 'mm') {
      const sizeX = input.physWidth * mesh.unitsPerMetre, sizeY = input.physHeight * mesh.unitsPerMetre;
      labelMesh = boxesMesh(labelBoxes({
        lines: extras.label.lines, sizeX, sizeY, depth: extras.label.depth,
        height: Math.max(1.2, options.baseThickness || 0), relief: 0.8,
      }), mesh);
    }
    let buffer : ArrayBuffer;
    let mtl : string | undefined;
    let bandInfo : {from : number, to : number, z : number, color : string}[] | undefined;
    if (format === '3mf') {
      const objects : ThreeMfObject[] = [];
      if (extras.bands && extras.bands.colors.length > 1 && options.solid) {
        let min = Infinity, max = -Infinity;
        for (let i = 0; i < input.heights.length; i++) { if (input.heights[i] < min) min = input.heights[i]; if (input.heights[i] > max) max = input.heights[i]; }
        const levels = extras.bands.levels.length ? extras.bands.levels : autoBandLevels(min, max, extras.bands.colors.length);
        const bands = bandMeshes(input, simplified, levels);
        bandInfo = [];
        bands.forEach((band, k) => {
          const color = extras.bands!.colors[Math.min(k, extras.bands!.colors.length - 1)];
          objects.push({name: `Band ${k + 1} (${Math.round(band.from)} to ${Math.round(band.to)} m)`, color, mesh: band.mesh});
          bandInfo!.push({from: band.from, to: band.to, z: band.floorZ, color});
        });
        if (mesh.positions.length > buildMesh(input, simplified).positions.length) {
          // Buildings go in their own part, so they can have their own colour
          const terrainOnly = buildMesh(input, simplified);
          const extra = {...mesh, positions: mesh.positions.slice(terrainOnly.positions.length), uvs: mesh.uvs.slice(terrainOnly.uvs.length),
            indices: mesh.indices.slice(terrainOnly.indices.length).map(i => i - terrainOnly.positions.length / 3)};
          objects.push({name: 'Buildings', color: extras.bands.buildingColor ?? '#D9D4CC', mesh: extra});
        }
      } else {
        objects.push({name: 'Terrain', color: extras.bands?.colors[0] ?? '#B8A98F', mesh});
      }
      if (labelMesh) objects.push({name: 'Label', color: extras.label?.color ?? '#FFFFFF', mesh: labelMesh, weld: false});
      buffer = await this.zip3mf(objects, name);
    } else if (format === 'obj' && texture) {
      const files = meshToObjWithMaterial(mesh, name, texture.filename);
      buffer = new TextEncoder().encode(files.obj).buffer as ArrayBuffer;
      mtl = files.mtl;
    } else {
      if (labelMesh && format === 'stl') mesh = mergeMeshes([mesh, labelMesh]);
      buffer = encodeMesh(mesh, format, name, format === 'glb' ? texture : undefined);
    }
    return Comlink.transfer({
      buffer,
      mtl,
      notes,
      bands: bandInfo,
      gridWidth: mesh.gridWidth,
      gridHeight: mesh.gridHeight,
      triangles: mesh.indices.length / 3,
      vertices: mesh.positions.length / 3,
      simplifyError: mesh.simplifyError,
      units: mesh.units,
    }, [buffer]);
  },
  async zip3mf(objects : ThreeMfObject[], title : string) : Promise<ArrayBuffer> {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', THREEMF_CONTENT_TYPES);
    zip.file('_rels/.rels', THREEMF_RELS);
    zip.file('3D/3dmodel.model', threeMfModel(objects, title));
    return zip.generateAsync({type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: {level: 6}});
  },
  addBuildings(mesh : Mesh, input : MeshInput, options : MeshOptions, b : NonNullable<MeshExtras['buildings']>) {
    const grid = {...b.grid, width: input.width, height: input.height};
    const footprints = buildingFootprints(b.features, grid, b.options?.defaultHeight ?? defaultBuildingOptions.defaultHeight);
    let minH = Infinity;
    for (let i = 0; i < input.heights.length; i++) if (input.heights[i] < minH) minH = input.heights[i];
    return appendBuildings(mesh, {heights: input.heights, width: input.width, height: input.height, physWidth: input.physWidth, physHeight: input.physHeight},
      footprints, {
        unitsPerMetre: mesh.unitsPerMetre,
        exaggeration: options.exaggeration > 0 ? options.exaggeration : 1,
        base: options.solid ? Math.max(0, options.baseThickness || 0) : 0,
        minHeight: options.datum ?? minH,
      }, {...defaultBuildingOptions, ...(b.options ?? {})});
  },
  /** A lithophane plate: thickness from the hillshade, sized by the print width. */
  async buildLithophane(input : MeshInput, options : MeshOptions, format : MeshFormat, name : string, preset : SimplifyPreset, extras : MeshExtras) {
    const l = extras.lithophane!;
    const grid = meshGridSize(input.width, input.height, options.resolution);
    const small = grid.width === input.width && grid.height === input.height ? input.heights : resizeGrid(input.heights, input.width, input.height, grid.width, grid.height);
    const mpp = {x: input.physWidth / grid.width, y: input.physHeight / grid.height};
    const thickness = lithophaneThickness(small, grid.width, grid.height, mpp, l.minThickness, l.maxThickness, l.zFactor);
    const longest = Math.max(input.physWidth, input.physHeight) || 1;
    // Plate in millimetres: treat mm as the mesh's "metres" at 1:1
    const plate : MeshInput = {heights: thickness, width: grid.width, height: grid.height,
      physWidth: input.physWidth / longest * options.printWidth, physHeight: input.physHeight / longest * options.printWidth};
    const plateOptions : MeshOptions = {...options, scale: 'real', solid: true, baseThickness: 0, datum: 0, exaggeration: 1,
      simplify: preset === 'off' ? 0 : Math.min(0.02, (l.maxThickness - l.minThickness) / 200)};
    const mesh = {...buildMesh(plate, plateOptions), units: 'mm' as const};
    const buffer = format === '3mf'
      ? await this.zip3mf([{name: 'Lithophane', color: '#F2F2F2', mesh}], name)
      : encodeMesh(mesh, format === 'obj' || format === 'glb' ? 'stl' : format, name);
    return Comlink.transfer({
      buffer,
      mtl: undefined as string | undefined,
      notes: [`lithophane ${l.minThickness}–${l.maxThickness} mm thick`],
      bands: undefined as {from : number, to : number, z : number, color : string}[] | undefined,
      gridWidth: mesh.gridWidth,
      gridHeight: mesh.gridHeight,
      triangles: mesh.indices.length / 3,
      vertices: mesh.positions.length / 3,
      simplifyError: 0,
      units: 'mm' as const,
    }, [buffer]);
  },
  /** Shaded-relief map for a poster frame. */
  renderPoster(heights : Float32Array, width : number, height : number, options : PosterMapOptions) {
    const rgba = renderPosterMap(heights, width, height, options);
    return Comlink.transfer(rgba, [rgba.buffer]);
  },
  viewshed(heights : Float32Array, width : number, height : number, mpp : {x : number, y : number}, options : ViewshedOptions) {
    const result = computeViewshed(heights, width, height, mpp, options);
    return Comlink.transfer(result, [result.visible.buffer]);
  },
  sunlight(heights : Float32Array, width : number, height : number, mpp : {x : number, y : number}, options : InsolationOptions) {
    const result = annualInsolation(heights, width, height, mpp, options);
    return Comlink.transfer(result, [result.data.buffer]);
  },
  /** Painted colours for the map overlay. */
  paintPreview(heights : Float32Array, width : number, height : number, mpp : {x : number, y : number}, settings : PaintSettings, features : OsmFeature[] | undefined, grid : OsmGrid | undefined) {
    const g = grid ? {...grid, width, height} : undefined;
    const masks = this.osmMasks(features, g, settings.rules.map(r => r.osm));
    const painted = paintTerrain(heights, width, height, mpp, settings, masks);
    return Comlink.transfer({preview: painted.preview, coverage: painted.coverage}, [painted.preview.buffer]);
  },
  /** Build a mesh for the on-screen preview (Z-up, with smooth normals). */
  buildPreviewMesh(input : MeshInput, options : MeshOptions, preset : SimplifyPreset = 'off', extras : MeshExtras = {}) {
    const simplified = withSimplify(input, options, preset);
    let mesh = buildMesh(input, simplified);
    if (extras.buildings) mesh = this.addBuildings(mesh, input, simplified, extras.buildings).mesh;
    const normals = computeVertexNormals(mesh);
    return Comlink.transfer({
      positions: mesh.positions,
      normals,
      uvs: mesh.uvs,
      indices: mesh.indices,
      topVertexCount: mesh.topVertexCount,
      gridWidth: mesh.gridWidth,
      gridHeight: mesh.gridHeight,
      gridHeights: mesh.gridHeights,
      vertexHeights: mesh.vertexHeights,
      units: mesh.units,
      unitsPerMetre: mesh.unitsPerMetre,
      triangles: mesh.indices.length / 3,
    }, [mesh.positions.buffer, normals.buffer, mesh.uvs.buffer, mesh.indices.buffer, mesh.gridHeights.buffer, mesh.vertexHeights.buffer]);
  }

}

export type MeshExtras = {
  buildings?: {features : OsmFeature[], grid : OsmGrid, options? : Partial<BuildingOptions>};
  label?: {lines : string[], depth : number, color? : string};
  bands?: {colors : string[], levels : number[], buildingColor? : string};
  lithophane?: {minThickness : number, maxThickness : number, zFactor : number};
};

/** Crop the top-left w × h of a grid `srcWidth` wide. */
const cropGrid = (src : Float32Array, srcWidth : number, w : number, h : number) : Float32Array => {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) out.set(src.subarray(y * srcWidth, y * srcWidth + w), y * w);
  return out;
};

const rgbaToRgb = (rgba : Uint8ClampedArray) : Uint8Array => {
  const out = new Uint8Array(rgba.length / 4 * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    out[j] = rgba[i]; out[j + 1] = rgba[i + 1]; out[j + 2] = rgba[i + 2];
  }
  return out;
};

export type ContourJob = {
  /** Metres between lines; 0 picks a round number giving roughly 20 levels. */
  interval : number;
  mode : 'lines' | 'layers';
  format : 'svg' | 'dxf';
  widthMm : number;
  smooth : number;
  separateSheets : boolean;
  title? : string;
};

export type ContourResult = {
  files : {name : string, text : string}[];
  interval : number;
  levels : number;
  min : number;
  max : number;
};

export type ProcessorWorker = typeof processor;

Comlink.expose(processor);