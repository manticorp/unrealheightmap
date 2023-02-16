const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

import {default as bufferTools} from "./buffer";

export default class PNG {
  buffer: ArrayBuffer;
  construct() {}
  static fromBuffer(buffer: ArrayBuffer) {
    return (new PNG).fromBuffer(buffer);
  }
  fromBuffer(buffer: ArrayBuffer) {
    if (!this.isPngBuffer(buffer)) {
      throw new Error('Buffer was not a valid PNG');
    }
    this.buffer = buffer;
    return this;
  }
  checkTypedArrayEquality(view1: TypedArray, view2: TypedArray) {
    if (view1.byteLength != view1.byteLength) return false;
    if (view1.length != view1.length) return false;
    for (var i = 0 ; i != view1.length ; i++)
    {
        if (view1[i] != view1[i]) return false;
    }
    return true;
  }
  isPngBuffer(buffer: ArrayBuffer) : boolean {
    return this.checkTypedArrayEquality(pngHeader, new Uint8Array(buffer, 0, 8));
  }
}