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

declare namespace UPNG {
  export interface ImageFrameRect {
      x: number;
      y: number;
      width: number;
      height: number;
  }

  export interface ImageFrame {
      rect: ImageFrameRect;
      delay: number;
      dispose: number;
      blend: number;
  }

  export interface ImageTabACTL {
      num_frames: number;
      num_plays: number;
  }

  export interface ImageTabText {
      [key: string]: string;
  }

  export interface ImageTabs {
      acTL?: ImageTabACTL | undefined;
      pHYs?: number[] | undefined;
      cHRM?: number[] | undefined;
      tEXt?: ImageTabText | undefined;
      iTXt?: ImageTabText | undefined;
      PLTE?: number[] | undefined;
      hIST?: number[] | undefined;
      tRNS?: (number | number[]) | undefined; // Depends on ctype
      gAMA?: number | undefined;
      sRGB?: number | undefined;
      bKGD?: (number | number[]) | undefined; // Depends on ctype
  }

  export interface Image {
      width: number;
      height: number;
      depth: number;
      ctype: number;
      frames: ImageFrame[];
      tabs: ImageTabs;
      data: Uint8Array;
  }

  export interface QuantizeResult {
      abuf: ArrayBuffer;
      inds: Uint8Array;
      // Type is complicated and I am too lazy to work it out right now, sorry!
      plte: any[];
  }

  export function encode(
      imgs: Uint8Array[],
      w: number,
      h: number,
      cnum: number,
      dels?: number[]
  ): ArrayBuffer;

  export function encodeLL(
      bufs: Uint8Array[],
      w: number,
      h: number,
      cc: number,
      ac: number,
      depth: number,
      dels?: number[],
      tabs?: ImageTabs
  ): ArrayBuffer;

  export function decode(buffer: ArrayBuffer | TypedArray): Image;
  export function decodeImage (data : Uint8Array, w : number, h : number, out : Image) : Uint8Array;
  export function toRGBA8(out: Image): TypedArray[];
  export function quantize(data: ArrayBuffer, psize: number): QuantizeResult;
}
export default UPNG;