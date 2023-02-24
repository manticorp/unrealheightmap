import * as Comlink from "comlink";

interface TileCoords {
  x: number,
  y: number,
  z: number
}
interface LatLng {
  latitude: number,
  longitude: number
}
interface LatLngZoom extends LatLng {
  zoom: number
}

type ConfigState = TileCoords & LatLngZoom & {
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
  bounds: [LatLng, LatLng]
};

type TileLoadState = ConfigState & {x: number, y: number, heights: Float32Array};

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
	combineImages(states : TileLoadState[]) : Float32Array {
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
		let last = 0;
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
		    const cur = map[tile.x][tile.y].heights[idx];
		    if (!last) {
		      last = map[tile.x][tile.y].heights[idx];
		    }
		    if (Math.abs(last - cur) > 10) {
		      // console.log({last, cur, x, y, i, tile, idx, map: map[tile.x][tile.y]});
		      // throw new Error('BLAGH');
		    }
		    output[i++] = cur;
		    last = cur;
		  }
		}
		output = this.normaliseTypedArray(output);
		return output;
	}
}

Comlink.expose(processor);