export const format = (str : string, obj : Record<string, string|number>) : string => {
  for (let [key, value] of Object.entries(obj)) {
    str = str.replace(`{${key}}`, value.toString());
  }
  return str;
};

export type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

export interface TileCoords {
  x: number,
  y: number,
  z: number
}
export interface LatLng {
  latitude: number,
  longitude: number
}
export interface LatLngZoom extends LatLng {
  zoom: number
}

export type ConfigState = TileCoords & LatLngZoom & {
  width : number,
  height : number,
  exactPos : TileCoords,
  widthInTiles : number,
  heightInTiles : number,
  startx: number,
  starty: number,
  endx: number,
  endy: number,
  status: string,
  bounds: [LatLng, LatLng],
  phys: {width: number, height: number},
  min: {y: number, x: number},
  max: {y: number, x: number},
};

export type TileLoadState = ConfigState & {x: number, y: number, heights: Float32Array, buffer: ArrayBuffer};

export enum NormaliseMode {
  Off = 0,
  Regular = 1,
  Smart = 2,
  SmartWindow = 3,
  Fixed = 4,
}

export const roll = (num: number, min: number = 0, max: number = 1)  => modWithNeg(num - min, max - min) + min;
export const modWithNeg =  (x: number, mod: number) => ((x % mod) + mod) % mod;
export const clamp = (num : number, min: number = 0, max: number = 1) => Math.max(min, Math.min(max, num));

/**
 * Same as Promise.all(items.map(item => task(item))), but it waits for
 * the first {batchSize} promises to finish before starting the next batch.
 *
 * @template A
 * @template B
 * @param {function(A): B} task The task to run for each item.
 * @param {A[]} items Arguments to pass to the task for each call.
 * @param {int} batchSize
 * @returns {Promise<B[]>}
 */
export async function promiseAllInBatches<T, B>(task : (item : T) => Promise<B>|B, items : T[], batchSize : number, to : number = 0) : Promise<B[]> {
    let position = 0;
    let results : B[] = [];
    while (position < items.length) {
        const itemsForBatch = items.slice(position, position + batchSize);
        results = [...results, ...await Promise.all(itemsForBatch.map(item => task(item)))];
        position += batchSize;
        if (to > 0) {
          await new Promise((resolve) => setTimeout(resolve, to));
        }
    }
    return results;
}