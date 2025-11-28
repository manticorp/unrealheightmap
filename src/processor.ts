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

export type NormaliseResult<T> = {
  data: T,
  minBefore: number,
  maxBefore: number,
  minAfter: number,
  maxAfter: number
};

export type ProcessorProgressPhase = 'stitch' | 'normalise';

export type ProcessorProgressUpdate = {
  phase: ProcessorProgressPhase;
  completed: number;
  total: number;
};

export type TypedArrayToStlArgs = {
  width : number,
  depth : number,
  height: number
};
export const typedArrayToStlDefaults : TypedArrayToStlArgs = {
  width : 100,
  depth : 100,
  height : 10,
};

export type vec3 = [number, number, number];
export type trivec3 = [vec3, vec3, vec3, vec3];

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
    progress?: (update: ProcessorProgressUpdate) => void
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
    let result = {
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
    return result;
  },
  typedArrayToStl(
    points: TypedArray,
    widthpx : number,
    heightpx : number,
    {width, depth, height} : TypedArrayToStlArgs = typedArrayToStlDefaults
  ) : ArrayBuffer {
    const dataLength = ((widthpx) * (heightpx)) * 50;
    console.log(points.length, dataLength);
    const size = 80 + 4 + dataLength;
    const result = new ArrayBuffer(dataLength);
    const dv = new DataView(result);
    dv.setUint32(80, (widthpx-1)*(heightpx-1), true);

    //@ts-ignore
    const max = points.reduce((acc, point) => Math.max(point, acc), 0);

    const o = (x : number, y : number) : number => (y * widthpx) + x;
    const n = (p1 : vec3, p2 : vec3, p3: vec3) : vec3 => {
      const A = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
      const B = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
      return [
        A[1] * B[2] - A[2] * B[1],
        A[2] * B[0] - A[0] * B[2],
        A[0] * B[1] - A[1] * B[0]
      ]
    }
    const pt = (tris : trivec3, off : number) => {
      tris.flat().forEach((flt : number, i : number) => {
        dv.setFloat32(off + (i * 4), flt, true);
      });
      // dv.setUint16(off+48, 0, true);
    }

    let off = 84;
    for (let x = 0; x < (widthpx - 1); x += 2) {
      for (let y = 0; y < (heightpx - 1); y++) {
        const tri1 : trivec3 = [
          [0,0,0], // normal
          [  x,   y, points[o(x,y)]/max], // v1
          [x+1,   y, points[o(x+1,y)]/max], // v2
          [  x, y+1, points[o(x,y+1)]/max], // v3
        ];
        // tri1[0] = n(tri1[1], tri1[2], tri1[3]);
        pt(tri1, off);
        off += 50;

        const tri2 : trivec3 = [
          [0,0,0], // normal
          [x+1,   y, points[o(x+1,y)]/max], // v1
          [x+1, y+1, points[o(x+1,y+1)]/max], // v2
          [  x, y+1, points[o(x,y+1)]/max], // v3
        ];
        // tri2[0] = n(tri2[1], tri2[2], tri2[3]);
        pt(tri2, off);
        off += 50;
      }
    }

    return result;
  }
}

export type ProcessorWorker = typeof processor;

Comlink.expose(processor);