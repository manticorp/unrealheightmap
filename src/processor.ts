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
import {
  MeshFormat,
  MeshInput,
  MeshOptions,
  buildMesh,
  computeVertexNormals,
  encodeMesh,
} from "./mesh";

export type NormaliseResult<T> = {
  data: T,
  minBefore: number,
  maxBefore: number,
  minAfter: number,
  maxAfter: number,
  /** Extra maps requested through ProcessOptions.maps, same size as data. */
  maps?: DerivedMap[]
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
    options: ProcessOptions = {}
  ) : NormaliseResult<Float32Array> {
    const area = states[0].width * states[0].height;
    let output = new Float32Array(area);
    const tileWidth = 256;
    const increment = 1/tileWidth;
    const reportProgress = (phase: ProcessorProgressPhase, completed: number, total: number) => {
      if (typeof progress === 'function') {
        progress({phase, completed, total});
      }
    };
    const map : Record<number, Record<number, TileLoadState>> = {};
    for (let tile of states) {
      if (!map[tile.x]) {
        map[tile.x] = {};
      }
      map[tile.x][tile.y] = tile;
    }

    const extent = {
      x1: states[0].exactPos.x - states[0].widthInTiles/2,
      x2: states[0].exactPos.x + states[0].widthInTiles/2,
      y1: states[0].exactPos.y - states[0].heightInTiles/2,
      y2: states[0].exactPos.y + states[0].heightInTiles/2
    }

    const totalRows = states[0].height || 0;
    const rowInterval = Math.max(1, Math.floor(totalRows / 50));
    let processedRows = 0;
    let i = 0;
    for (let y = extent.y1; y < extent.y2; y += increment) {
      for (let x = extent.x1; x < extent.x2; x += increment) {
        const tile = {
          x: Math.floor(x),
          y: Math.floor(y)
        };
        const px = {
          x: Math.floor((x%1)*tileWidth),
          y: Math.floor((y%1)*tileWidth)
        };
        const idx = px.y*tileWidth + px.x;
        if (typeof map[tile.x] === 'undefined') {
          throw new Error(`x value ${tile.x} was undefined`);
        } else if (typeof map[tile.x][tile.y] === 'undefined') {
          throw new Error(`y value ${tile.y} was undefined`);
        } else {
          output[i++] = map[tile.x][tile.y].heights[idx];
        }
      }
      processedRows++;
      if (processedRows % rowInterval === 0 || processedRows === totalRows) {
        reportProgress('stitch', processedRows, Math.max(1, totalRows));
      }
    }
    // Derived maps and the water mask need real heights, so build them
    // before flattening or normalising touches the data.
    let maps : DerivedMap[] | undefined;
    if (wantsDerivedMaps(options.maps)) {
      reportProgress('maps', 0, 1);
      maps = computeDerivedMaps(
        output,
        states[0].width,
        states[0].height,
        options.maps,
        options.metresPerPixel ?? {x: 1, y: 1},
        options.water?.level ?? 0
      );
      reportProgress('maps', 1, 1);
    }
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
      for (let i = 0; i < output.length; i++) {
        result.maxAfter = Math.max(output[i], result.maxAfter);
        result.minAfter = Math.min(output[i], result.minAfter);
      }
      result.maxBefore = result.maxAfter;
      result.minBefore = result.minAfter;
    }
    reportProgress('normalise', 1, 1);
    if (maps) {
      result.maps = maps;
      return Comlink.transfer(result, [result.data.buffer, ...maps.map(m => m.data.buffer)]);
    }
    return result;
  },
  /** Build a mesh and encode it as STL/OBJ/GLB, ready to download. */
  buildMeshFile(input : MeshInput, options : MeshOptions, format : MeshFormat, name : string) {
    const mesh = buildMesh(input, options);
    const buffer = encodeMesh(mesh, format, name);
    return Comlink.transfer({
      buffer,
      gridWidth: mesh.gridWidth,
      gridHeight: mesh.gridHeight,
      triangles: mesh.indices.length / 3,
      units: mesh.units,
    }, [buffer]);
  },
  /** Build a mesh for the on-screen preview (Z-up, with smooth normals). */
  buildPreviewMesh(input : MeshInput, options : MeshOptions) {
    const mesh = buildMesh(input, options);
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
      units: mesh.units,
      unitsPerMetre: mesh.unitsPerMetre,
    }, [mesh.positions.buffer, normals.buffer, mesh.uvs.buffer, mesh.indices.buffer, mesh.gridHeights.buffer]);
  }

}

export type ProcessorWorker = typeof processor;

Comlink.expose(processor);