import * as Comlink from "comlink";

import {TypedArray, TileCoords, LatLng, LatLngZoom, ConfigState, TileLoadState, NormaliseMode} from "./helpers";

const processor = {
  normaliseTypedArray<T extends TypedArray|number[]>(inp : T) : T {
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
    const max = inp.reduce((prev : number, cur : number) : number => Math.max(prev, cur), 0);
    //@ts-ignore
    const min = inp.reduce((prev : number, cur : number) : number => Math.min(prev, cur), max);
    const newMax = Math.pow(2, bpe * 8);
    const newMin = 0;
    const sub = max - min;
    const nsub = newMax - newMin;
    const factor = newMax/(max - sub);
    inp.forEach((a : number, index : number) => {
      inp[index] = (((a-min)/sub) * nsub + newMin);
    });
    return inp;
  },
  normaliseTypedArraySmart<T extends TypedArray|number[]>(inp : T) : T {
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
    const max = Math.min(mean+stddev * numStdDeviations, actualMax);
    //@ts-ignore
    const actualMin = inp.reduce((prev : number, cur : number) : number => Math.min(prev, cur), max);
    const min = Math.max(mean-stddev * numStdDeviations, actualMin);

    console.log({n, mean, stddev, actualMax, max, actualMin, min});

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
    return inp;
  },
  normaliseTypedArraySmartWindow<T extends TypedArray>(inp : T) : T {
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

    const max = (windowedMax + stddev) > actualMax ? actualMax : windowedMax;
    const min = (windowedMin - stddev) < actualMin ? actualMin : windowedMin;

    console.log({windowedMax, windowedMin, actualMax, actualMin, offset, length, stddev, max, min});

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
    return inp;
  },
  combineImages(states : TileLoadState[], normaliseMode : number = NormaliseMode.Regular) : Float32Array {
    const area = states[0].width * states[0].height;
    let output = new Float32Array(area);
    const tileWidth = 256;
    const increment = 1/tileWidth;
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
        output[i++] = map[tile.x][tile.y].heights[idx];
      }
    }
    if (normaliseMode == NormaliseMode.Regular) {
      output = this.normaliseTypedArray(output);
    } else if (normaliseMode == NormaliseMode.Smart) {
      output = this.normaliseTypedArraySmart(output);
    } else if (normaliseMode == NormaliseMode.SmartWindow) {
      output = this.normaliseTypedArraySmartWindow(output);
    }
    return output;
  }
}

Comlink.expose(processor);