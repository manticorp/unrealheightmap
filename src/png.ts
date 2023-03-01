const pako = require('pako');

const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

import {TypedArray} from "./helpers";

import {default as bufferTools} from "./buffer";

type byte1 = number;
type byte1unsigned = number;
type byte2 = number;
type byte2unsigned = number;
type byte4 = number;
type byte4unsigned = number;

enum ColorType {
  Grayscale = 0,
  Rgb = 2,
  Palette = 3,
  GrayscaleAlpha = 4,
  Rgba = 6
}
enum sRGBTypes {
  Perceptual = 0,
  RelativeColorimetric = 1,
  Saturation = 2,
  AbsoluteColorimetric = 3,
};
enum ResolutionUnit {
  Unknown = 0,
  Meter = 1,
};
enum PngLineFilter {
  None = 0,
  Sub = 1,
  Up = 2,
  Average = 3,
  Paeth = 4,
};

type IHDR = {
  size: number,
  header: string,
  width: number,
  height: number,
  bitDepth: number,
  colorType: ColorType,
  compressionMethod: number,
  filterMethod: number,
  interlaceMethod: number
}

type PLTE = Uint8Array;
type tRNS = TypedArray|number;
type sRGB = sRGBTypes;
type gAMA = number;
type cHRM = {
  whitePointX: number,
  whitePointY: number,
  redX:        number,
  redY:        number,
  greenX:      number,
  greenY:      number,
  blueX:       number,
  blueY:       number,
};
type iCCP = {
  profileName: string,
  compressionMethod: byte1unsigned,
  profile: TypedArray,
  compressedProfile: TypedArray,
};
type tEXt = {
  keyword: string,
  text: string
};
type zTXt = {
  keyword: string,
  compressionMethod: byte1unsigned,
  compressedText: TypedArray,
  text: string
};
type iTXt = {
  keyword: string,
  compressionFlag: boolean,
  compressionMethod: byte1unsigned,
  languageTag: string,
  translatedKeyword: string,
  text: string
};
type bKGD = TypedArray|number;
type pHYs = {
  x: byte4unsigned,
  y: byte4unsigned,
  unit: ResolutionUnit,
};
type tIME = {
  year:   byte2,
  month:  byte1unsigned,
  day:    byte1unsigned,
  hour:   byte1unsigned,
  minute: byte1unsigned,
  second: byte1unsigned,
};

type ChunkDataContents = IHDR|PLTE|tRNS|sRGB|gAMA|cHRM|iCCP|tEXt|zTXt|iTXt|bKGD|pHYs|tIME;

type ChunkData = {
  type: string,
  length: number,
  startOffset: number,
  dataOffset: number,
  data?: ChunkDataContents,
}

type DecodeImageArgs = {
  transparency: tRNS,
  palette: PLTE
};

export default class PNG {
  buffer: ArrayBuffer;
  dataview: DataView;
  offset: number = 0;
  chunks: ChunkData[];
  ihdr: IHDR;
  construct() {}
  static fromBuffer(buffer: ArrayBuffer) {
    return (new PNG).fromBuffer(buffer);
  }
  assertHasData() {
    this.assertHasDataview();
    this.assertHasBuffer();
  }
  assertHasBuffer() {
    if (!this.buffer) {
      throw new Error('Missing buffer');
    }
  }
  assertHasDataview() {
    if (!this.dataview) {
      throw new Error('Missing dataview');
    }
  }
  fromBuffer(buffer: ArrayBuffer) {
    if (!this.isPngBuffer(buffer)) {
      throw new Error('Buffer was not a valid PNG');
    }
    this.buffer = buffer;
    this.dataview = new DataView(buffer);
    delete this.chunks;
    delete this.ihdr;
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
  readAscii(length: number = 1) : string {
    this.assertHasData();
    let str = [];
    if (length < 0) throw new Error('Cannot have negative length');
    for (let i = 0; i < length; i++) {
      str.push(String.fromCharCode(this.dataview.getUint8(this.offset+i)));
    }
    this.offset += length;
    return str.join("");
  }
  readAsciiUntilNull(maxLength : number = 100000000) : string {
    this.assertHasData();
    let str = [];
    if (length < 0) throw new Error('Cannot have negative length');
    let i = 0;
    while (i++ < maxLength) {
      const byte = this.dataview.getUint8(this.offset);
      this.offset++;
      if (byte > 0) {
        str.push(String.fromCharCode(byte));
      } else {
        break;
      }
    }
    return str.join("");
  }
  asciiSafeByteStr(byte : number) : string {
    if (byte === 9) {
      return "\\t";
    }
    if (byte === 12) {
      return "\\0x0C";
    }
    if (byte === 13) {
      return "\\r";
    }
    if (byte === 10) {
      return "\\n";
    }
    if (
      (
        byte <= 31 &&
        byte !== 10
      ) ||
      (
        byte >= 127 &&
        byte <= 159
      )
    ) {
      return ''
    }
    return String.fromCharCode(byte);
  }
  readSafeAsciiUntilNull(maxLength : number = 100000000) : string {
    this.assertHasData();
    let str = [];
    if (length < 0) throw new Error('Cannot have negative length');
    let i = 0;
    while (i++ < maxLength) {
      const byte = this.dataview.getUint8(this.offset);
      this.offset++;
      if (byte > 0) {
        str.push(this.asciiSafeByteStr(byte));
      } else {
        break;
      }
    }
    return str.join("");
  }
  readUTF8UntilNull(maxLength : number = 10000000) : string {
    this.assertHasData();
    let len = 0;
    let byte = 0;
    do {
      byte = this.dataview.getUint8(this.offset + len);
      len++;
    } while (byte !== 0 && len < maxLength);
    const result = new TextDecoder().decode(new Uint8Array(this.buffer, this.offset, len));
    this.offset += len;
    return result;
  }
  readUint8() : number {
    this.assertHasData();
    this.offset += 1;
    return this.dataview.getUint8(this.offset-1);
  }
  readInt8() : number {
    this.assertHasData();
    this.offset += 1;
    return this.dataview.getInt8(this.offset-1);
  }
  readInt16() : number {
    this.assertHasData();
    this.offset += 2;
    return this.dataview.getInt16(this.offset-2, false);
  }
  readUint16() : number {
    this.assertHasData();
    this.offset += 2;
    return this.dataview.getUint16(this.offset-2, false);
  }
  readInt32() : number {
    this.assertHasData();
    this.offset += 4;
    return this.dataview.getInt32(this.offset-4, false);
  }
  readUint32() : number {
    this.assertHasData();
    this.offset += 4;
    return this.dataview.getUint32(this.offset-4, false);
  }
  readBigInt64() : bigint {
    this.assertHasData();
    this.offset += 8;
    return this.dataview.getBigInt64(this.offset-8, false);
  }
  readBigUint64() : bigint {
    this.assertHasData();
    this.offset += 8;
    return this.dataview.getBigUint64(this.offset-8, false);
  }
  readFloat32() : number {
    this.assertHasData();
    this.offset += 4;
    return this.dataview.getFloat32(this.offset-4, false);
  }
  readFloat64() : number {
    this.assertHasData();
    this.offset += 8;
    return this.dataview.getFloat64(this.offset-8, false);
  }
  isTypedArray(data : any) : data is TypedArray {
    return (
      (data instanceof Int8Array) ||
      (data instanceof Uint8Array) ||
      (data instanceof Uint8ClampedArray) ||
      (data instanceof Int16Array) ||
      (data instanceof Uint16Array) ||
      (data instanceof Int32Array) ||
      (data instanceof Uint32Array) ||
      (data instanceof Float32Array) ||
      (data instanceof Float64Array)
    );
  }
  chunkIsIHDR(chunk : ChunkDataContents) : chunk is IHDR {
    if (typeof chunk !== 'undefined' && chunk !== null) {
      return true;
    }
    return false;
  }
  chunkIsPLTE(chunk : ChunkDataContents) : chunk is PLTE {
    return (chunk instanceof Uint8Array);
  }
  chunkIstRNS(chunk : ChunkDataContents) : chunk is tRNS {
    return this.isTypedArray(chunk);
  }
  chunkIssRGB(chunk : ChunkDataContents) : chunk is sRGB {
    return (typeof chunk === 'number' && chunk in sRGBTypes);
  }
  chunkIsgAMA(chunk : ChunkDataContents) : chunk is gAMA {
    return typeof chunk === 'number';
  }
  chunkIscHRM(chunk : ChunkDataContents) : chunk is cHRM {
    if (
      typeof chunk !== 'undefined' &&
      chunk !== null &&
      typeof chunk === 'object'
    ) {
      return (
        typeof (chunk as cHRM).whitePointX === 'number' &&
        typeof (chunk as cHRM).whitePointY === 'number' &&
        typeof (chunk as cHRM).redX === 'number' &&
        typeof (chunk as cHRM).redY === 'number' &&
        typeof (chunk as cHRM).greenX === 'number' &&
        typeof (chunk as cHRM).greenY === 'number' &&
        typeof (chunk as cHRM).blueX === 'number' &&
        typeof (chunk as cHRM).blueY === 'number'
      );
    }
    return false;
  }
  chunkIsiCCP(chunk : ChunkDataContents) : chunk is iCCP {
    if (
      typeof chunk !== 'undefined' &&
      chunk !== null &&
      typeof chunk === 'object'
    ) {
      return (
        typeof (chunk as iCCP).profileName === 'string' &&
        typeof (chunk as iCCP).compressionMethod === 'number' &&
        this.isTypedArray((chunk as iCCP).profile) &&
        this.isTypedArray((chunk as iCCP).compressedProfile)
      );
    }
    return false;
  }
  chunkIstEXt(chunk : ChunkDataContents) : chunk is tEXt {
    if (
      typeof chunk !== 'undefined' &&
      chunk !== null &&
      typeof chunk === 'object'
    ) {
      return (
        typeof (chunk as tEXt).keyword === 'string' &&
        typeof (chunk as tEXt).text === 'string'
      );
    }
    return false;
  }
  chunkIszTXt(chunk : ChunkDataContents) : chunk is zTXt {
    if (
      typeof chunk !== 'undefined' &&
      chunk !== null &&
      typeof chunk === 'object'
    ) {
      return (
        typeof (chunk as zTXt).keyword === 'string' &&
        typeof (chunk as zTXt).compressionMethod === 'number' &&
        this.isTypedArray((chunk as zTXt).compressedText) &&
        typeof (chunk as zTXt).text === 'string'
      );
    }
    return false;
  }
  chunkIsiTXt(chunk : ChunkDataContents) : chunk is iTXt {
    if (
      typeof chunk !== 'undefined' &&
      chunk !== null &&
      typeof chunk === 'object'
    ) {
      return (
        typeof (chunk as iTXt).keyword === 'string' &&
        typeof (chunk as iTXt).compressionMethod === 'number' &&
        typeof (chunk as iTXt).compressionFlag === 'boolean' &&
        typeof (chunk as iTXt).languageTag === 'string' &&
        typeof (chunk as iTXt).translatedKeyword === 'string' &&
        typeof (chunk as iTXt).text === 'string'
      );
    }
    return false;
  }
  chunkIsbKGD(chunk : ChunkDataContents) : chunk is bKGD {
    return this.isTypedArray(chunk) || typeof chunk === 'number';
  }
  chunkIspHYs(chunk : ChunkDataContents) : chunk is pHYs {
    if (
      typeof chunk !== 'undefined' &&
      chunk !== null &&
      typeof chunk === 'object'
    ) {
      return (
        typeof (chunk as pHYs).x === 'number' &&
        typeof (chunk as pHYs).y === 'number' &&
        (chunk as pHYs).unit in ResolutionUnit
      );
    }
    return false;
  }
  chunkIstIME(chunk : ChunkDataContents) : chunk is tIME {
    if (
      typeof chunk !== 'undefined' &&
      chunk !== null &&
      typeof chunk === 'object'
    ) {
      return (
        typeof (chunk as tIME).year === 'number' &&
        typeof (chunk as tIME).month === 'number' &&
        typeof (chunk as tIME).day === 'number' &&
        typeof (chunk as tIME).hour === 'number' &&
        typeof (chunk as tIME).minute === 'number' &&
        typeof (chunk as tIME).second === 'number'
      );
    }
    return false;
  }
  getIHDR() : IHDR {
    this.assertHasData();
    if (!this.ihdr) {
      this.offset = 8;
      const dataview = this.dataview;
      const size   = this.readUint32();
      const header = this.readAscii(4);
      return this.ihdr = {
        size,
        header,
        width: this.readUint32(),
        height: this.readUint32(),
        bitDepth: this.readUint8(),
        colorType: this.readUint8(),
        compressionMethod: this.readUint8(),
        filterMethod: this.readUint8(),
        interlaceMethod: this.readUint8()
      };
    }
    return this.ihdr;
  }
  getWidth() : number {
    return this.getIHDR().width;
  }
  getHeight() : number {
    return this.getIHDR().height;
  }
  getArea() : number {
    return this.getWidth() * this.getHeight();
  }
  getChunksByType(...types : string[][]|string[]) : ChunkData[] {
    const ntypes : string[] = types.flat(2);
    return this.getChunkData().filter((a) => ntypes.indexOf(a.type) !== -1);
  }
  getPLTE() : PLTE|null {
    const chunks = this.getChunksByType('PLTE');
    if (chunks.length > 1) {
      throw new Error('Cannot have more than 1 PLTE chunk.');
    }
    if (chunks.length === 1) {
      if (chunks[0].length % 3 !== 0) {
        throw new Error('Cannot have PLTE not a multiple of 3, length was ' + chunks[0].length);
      }
      let chunkData = chunks[0].data;
      if (!this.chunkIsPLTE(chunkData)) {
        chunkData = new Uint8Array(this.buffer, chunks[0].dataOffset, chunks[0].length);
        chunks[0].data = chunkData;
      }
      return chunkData;
    }
    return null;
  }
  gettRNS() : tRNS|null {
    const ihdr = this.getIHDR();
    const chunks = this.getChunksByType('tRNS');
    if (chunks.length > 1) {
      throw new Error('Cannot have more than 1 tRNS chunk.');
    }
    if (chunks.length === 1) {
      let chunkData = chunks[0].data;
      if (this.chunkIstRNS(chunkData)) {
        return chunkData;
      } else {
        let trns = null;
        if (ihdr.colorType === ColorType.Palette) {
          trns = new Uint8Array(this.buffer, chunks[0].dataOffset, chunks[0].length);
        } else if (ihdr.colorType === ColorType.Grayscale) {
          if (ihdr.bitDepth === 8) {
            trns = this.dataview.getUint8(chunks[0].dataOffset+1);
          } else if (ihdr.bitDepth === 16) {
            trns = this.dataview.getUint16(chunks[0].dataOffset);
          }
        } else if (ihdr.colorType === ColorType.Rgb) {
          trns = new Uint16Array(this.buffer, chunks[0].dataOffset, chunks[0].length);
        } else {
          trns = null;
          throw new Error(`Color type ${ihdr.colorType} cannot have transparency`);
        }
        chunks[0].data = trns
        return trns;
      }
    }
    return null;
  }
  getgAMA() : gAMA|null {
    const ihdr = this.getIHDR();
    const chunks = this.getChunksByType('gAMA');
    if (chunks.length > 1) {
      throw new Error('Cannot have more than 1 gAMA chunk.');
    }
    if (chunks.length === 1) {
      let gama = chunks[0].data;
      if (!this.chunkIsgAMA(gama)) {
        gama = (this.dataview.getUint32(chunks[0].dataOffset, false))/100000;
        chunks[0].data = gama;
      }
      return gama;
    }
    return null;
  }
  getcHRM() : cHRM|null {
    const ihdr = this.getIHDR();
    const chunks = this.getChunksByType('cHRM');
    if (chunks.length > 1) {
      throw new Error('Cannot have more than 1 cHRM chunk.');
    }
    if (chunks.length === 1) {
      let chunkData = chunks[0].data;
      if (!this.chunkIscHRM(chunkData)) {
        const off = chunks[0].dataOffset;
        const chrm : cHRM = {
          whitePointX: (this.dataview.getUint32(off + ( 4 * 0 ), false) / 100000),
          whitePointY: (this.dataview.getUint32(off + ( 4 * 1 ), false) / 100000),
          redX:        (this.dataview.getUint32(off + ( 4 * 2 ), false) / 100000),
          redY:        (this.dataview.getUint32(off + ( 4 * 3 ), false) / 100000),
          greenX:      (this.dataview.getUint32(off + ( 4 * 4 ), false) / 100000),
          greenY:      (this.dataview.getUint32(off + ( 4 * 5 ), false) / 100000),
          blueX:       (this.dataview.getUint32(off + ( 4 * 6 ), false) / 100000),
          blueY:       (this.dataview.getUint32(off + ( 4 * 7 ), false) / 100000),
        }
        chunkData = chrm;
        chunks[0].data = chunkData;
      }
      return chunkData;
    }
    return null;
  }
  getsRGB() : sRGB|null {
    const chunks = this.getChunksByType('sRGB');
    if (chunks.length > 1) {
      throw new Error('Cannot have more than 1 sRGB chunk.');
    }
    if (chunks.length === 1) {
      let chunkData = chunks[0].data;
      if (!this.chunkIssRGB(chunkData)) {
        chunkData = this.dataview.getUint8(chunks[0].dataOffset);
        chunks[0].data = chunkData;
      }
      return chunkData;
    }
    return null;
  }
  getiCCP() : iCCP|null {
    const ihdr = this.getIHDR();
    const chunks = this.getChunksByType('iCCP');
    if (chunks.length > 1) {
      throw new Error('Cannot have more than 1 iCCP chunk.');
    }
    if (chunks.length === 1) {
      let iccp = chunks[0].data
      if (!this.chunkIsiCCP(iccp)) {

        this.offset = chunks[0].dataOffset;

        const profileName       = this.readSafeAsciiUntilNull();
        const compressionMethod = this.readUint8();
        const dataLength        = chunks[0].length - (this.offset - chunks[0].dataOffset);
        const compressedProfile = new Uint8Array(this.buffer, this.offset, dataLength);
        const profile           = pako.inflate(compressedProfile);

        iccp = {
          profileName,
          compressionMethod,
          compressedProfile,
          profile
        };
        chunks[0].data = iccp;
      }
      return iccp;
    }
    return null;
  }
  gettEXt() : tEXt[]|null {
    const ihdr = this.getIHDR();
    const chunks = this.getChunksByType('tEXt');
    const textChunks : tEXt[] = [];
    chunks.forEach(chunk => {
      let textChunk = chunk.data;
      if (!this.chunkIstEXt(textChunk)) {
        this.offset = chunk.dataOffset;
        const keyword = this.readSafeAsciiUntilNull(chunk.length);
        const length = chunk.length - (this.offset - chunk.dataOffset);
        const text = this.readSafeAsciiUntilNull(length);
        textChunk = {
          keyword,
          text
        }
        chunk.data = textChunk;
      }
      textChunks.push(textChunk);
    });
    return textChunks;
  }
  getzTXt() : zTXt[]|null {
    const ihdr = this.getIHDR();
    const chunks = this.getChunksByType('zTXt');
    const textChunks : zTXt[] = [];
    chunks.forEach(chunk => {
      let textChunk = chunk.data;
      if (!this.chunkIszTXt(textChunk)) {
        this.offset = chunk.dataOffset;

        const keyword           = this.readSafeAsciiUntilNull();
        const compressionMethod = this.readUint8();
        const dataLength        = chunk.length - (this.offset - chunk.dataOffset);
        const compressedText    = new Uint8Array(this.buffer, this.offset, dataLength);
        const text              = pako.inflate(compressedText, { to: 'string' });

        textChunk = {
          keyword,
          compressionMethod,
          compressedText,
          text
        }
        chunk.data = textChunk;
      }
      textChunks.push(textChunk);
    });
    return textChunks;
  }
  getiTXt() : iTXt[]|null {
    const ihdr = this.getIHDR();
    const chunks = this.getChunksByType('iTXt');
    const textChunks : iTXt[] = [];
    chunks.forEach(chunk => {
      let textChunk = chunk.data;
      if (!this.chunkIsiTXt(textChunk)) {
        this.offset = chunk.dataOffset;

        const keyword           = this.readSafeAsciiUntilNull();
        const compressionFlag   = this.readUint8() > 0 ? true : false;
        const compressionMethod = this.readUint8();
        const languageTag       = this.readSafeAsciiUntilNull();
        const translatedKeyword = this.readUTF8UntilNull();

        const dataLength        = chunk.length - (this.offset - chunk.dataOffset);
        let text = '';
        if (compressionFlag) {
          const compressedText = new Uint8Array(this.buffer, this.offset, dataLength);
          text = pako.inflate(compressedText, { to: 'string' });
        } else {
          text = this.readUTF8UntilNull(dataLength);
        }

        const itxt : iTXt = textChunk = {
          keyword,
          compressionFlag,
          compressionMethod,
          languageTag,
          translatedKeyword,
          text,
        };
        chunk.data = textChunk;
      }
      textChunks.push(textChunk);
    });
    return textChunks;
  }
  getbKGD() : bKGD|null {
    const ihdr = this.getIHDR();
    const chunks = this.getChunksByType('bKGD');
    if (chunks.length > 1) {
      throw new Error('Cannot have more than 1 tRNS chunk.');
    }
    if (chunks.length === 1) {
      let chunkData = chunks[0].data;
      if (this.chunkIsbKGD(chunkData)) {
        return chunkData;
      } else {
        let bkgd = null;
        if (ihdr.colorType === ColorType.Palette) {
          bkgd = new Uint8Array(this.buffer, chunks[0].dataOffset, chunks[0].length);
        } else if (ihdr.colorType === ColorType.Grayscale || ihdr.colorType === ColorType.GrayscaleAlpha) {
          if (ihdr.bitDepth === 8) {
            bkgd = this.dataview.getUint8(chunks[0].dataOffset+1);
          } else if (ihdr.bitDepth === 16) {
            bkgd = this.dataview.getUint16(chunks[0].dataOffset);
          }
        } else if (ihdr.colorType === ColorType.Rgb || ihdr.colorType === ColorType.Rgba) {
          bkgd = new Uint16Array(this.buffer, chunks[0].dataOffset, chunks[0].length);
        } else {
          throw new Error(`Color type ${ihdr.colorType} cannot have bKGD`);
        }
        chunks[0].data = bkgd
        return bkgd;
      }
    }
    return null;
  }
  getpHYs() : pHYs|null {
    const chunks = this.getChunksByType('pHYs');
    if (chunks.length > 1) {
      throw new Error('Cannot have more than 1 pHYs chunk.');
    }
    if (chunks.length === 1) {
      let phys = chunks[0].data;
      if (!this.chunkIspHYs(phys)) {
        this.offset = chunks[0].dataOffset;
        const x = this.readUint32();
        const y = this.readUint32();
        const unit = this.readUint8();
        phys = {
          x,
          y,
          unit
        };
        chunks[0].data = phys
      }
      return phys;
    }
    return null;
  }
  gettIME() : tIME|null {
    const chunks = this.getChunksByType('tIME');
    if (chunks.length > 1) {
      throw new Error('Cannot have more than 1 tIME chunk.');
    }
    if (chunks.length === 1) {
      let time = chunks[0].data;
      if (!this.chunkIstIME(time)) {
        this.offset = chunks[0].dataOffset;

        const year =   this.readUint16();
        const month =  this.readUint8();
        const day =    this.readUint8();
        const hour =   this.readUint8();
        const minute = this.readUint8();
        const second = this.readUint8();

        time = {
          year,
          month,
          day,
          hour,
          minute,
          second,
        };
        chunks[0].data = time
      }
      return time;
    }
    return null;
  }
  getChunkData() : ChunkData[] {
    this.assertHasData();
    if (!this.chunks) {
      this.chunks = [];
      this.offset = 8;
      const MAX = 100000;
      let i = 0;
      while (this.offset < this.buffer.byteLength && i++ < MAX) {
        const startOff = this.offset;
        const chunk : ChunkData = {
          length :  this.readUint32(),
          type : this.readAscii(4),
          startOffset : startOff,
          dataOffset : startOff + 8
        };
        this.offset = startOff + 8 + 4 + chunk.length;
        this.chunks.push(chunk);
      }
    }
    return this.chunks;
  }
  populateChunks() : this {
    this.getChunkData();
    this.getPLTE();
    this.gettRNS();
    this.getgAMA();
    this.getcHRM();
    this.getsRGB();
    this.getiCCP();
    this.gettEXt();
    this.getzTXt();
    this.getiTXt();
    this.getbKGD();
    this.getpHYs();
    this.gettIME();
    return this;
  }
  getImageDataRaw() {
    const idats  = this.getChunksByType('IDAT');
    const imdataLength = idats.reduce((a, b) => a + b.length, 0);
    const intermediateBuffer = new ArrayBuffer(imdataLength);
    const intermediateArray = new Uint8Array(intermediateBuffer);

    let curOff = 0;
    for (let idat of idats) {
      intermediateArray.set(new Uint8Array(this.buffer, idat.dataOffset, idat.length), curOff);
      curOff += idat.length;
    }

    const imageDataRaw = pako.inflate(intermediateArray);
    return imageDataRaw;
  }
  getImageDataTransformed() {
    const ihdr   = this.getIHDR();
    const imageDataRaw = this.getImageDataRaw();

    if (ihdr.colorType === ColorType.Grayscale) {
      let res : TypedArray = new Uint8Array(imageDataRaw.buffer);
      res = this.filterZero(res, ihdr, 0);
      if (ihdr.bitDepth === 16) {
        const area = ihdr.width * ihdr.height;
        const res16 = new Uint16Array(area);
        const dv = new DataView(res.buffer);
        for (let i = 0; i < area; i++) {
          res16[i] = dv.getUint16(i*2, false);
        }
        return res16;
      }
      if (ihdr.bitDepth === 8) {
        return res;
      }
    } else if (ihdr.colorType === ColorType.Rgb) {
      let res : TypedArray = new Uint8Array(imageDataRaw.buffer);
      res = this.filterZero(res, ihdr, 0);
      if (ihdr.bitDepth === 16) {
        const area = ihdr.width * ihdr.height * 3;
        const res16 = new Uint16Array(area);
        const dv = new DataView(res.buffer);
        for (let i = 0; i < area; i++) {
          res16[i] = dv.getUint16(i*2, false);
        }
        return res16;
      }
      if (ihdr.bitDepth === 8) {
        return res;
      }
    } else if (ihdr.colorType === ColorType.Rgba) {
      let res : TypedArray = new Uint8Array(imageDataRaw.buffer);
      res = this.filterZero(res, ihdr, 0);
      if (ihdr.bitDepth === 16) {
        const area = ihdr.width * ihdr.height * 4;
        const res16 = new Uint16Array(area);
        const dv = new DataView(res.buffer);
        for (let i = 0; i < area; i++) {
          res16[i] = dv.getUint16(i*2, false);
        }
        return res16;
      }
      if (ihdr.bitDepth === 8) {
        return res;
      }
    } else if (ihdr.colorType === ColorType.GrayscaleAlpha) {
      let res : TypedArray = new Uint8Array(imageDataRaw.buffer);
      res = this.filterZero(res, ihdr, 0);
      if (ihdr.bitDepth === 16) {
        const area = ihdr.width * ihdr.height * 2;
        const res16 = new Uint16Array(area);
        const dv = new DataView(res.buffer);
        for (let i = 0; i < area; i++) {
          res16[i] = dv.getUint16(i*2, false);
        }
        return res16;
      }
      if (ihdr.bitDepth === 8) {
        return res;
      }
    }
  }
  getImageData() {
    const transparency = this.gettRNS();
    const palette = this.getPLTE();
    return this.decodeImage(
      this.getImageDataTransformed(),
      this.getIHDR(),
      {
        transparency,
        palette,
      }
    );
  }
  bitsPerPixel(colorType : ColorType, depth : number) : number {
    const noc : Record<ColorType, number> = {
      0: 1, // ColorType.Grayscale
      2: 3, // ColorType.Rgb
      3: 1, // ColorType.Palette
      4: 2, // ColorType.GrayscaleAlpha
      6: 4, // ColorType.Rgba
    };
    return noc[colorType] * depth;
  }
  filterZero(data : TypedArray, {width, bitDepth, height, colorType} : IHDR, off : number = 0) {
    const w = width, h = height;
    let bpp = this.bitsPerPixel(colorType, bitDepth);
    const bpl = Math.ceil(w * bpp / 8);

    bpp = Math.ceil(bpp / 8);

    let i;
    let di;
    let type = data[off];
    let x = 0;

    if (type > 1) {
      data[off] = [0, 0, 1][type - 2];
    }
    if (type == 3) {
      for (x = bpp; x < bpl; x++) {
        data[x + 1] = (data[x + 1] + (data[x + 1 - bpp] >>> 1)) & 255;
      }
    }

    for (let y = 0; y < h; y++) {
      i = off + y * bpl;
      di = i + y + 1;
      type = data[di - 1]; x = 0;

      if (type == PngLineFilter.None) {
        for (; x < bpl; x++) {
          data[i + x] = data[di + x];
        }
      } else if (type == PngLineFilter.Sub) {
        for (; x < bpp; x++) {
          data[i + x] = data[di + x];
        }
        for (; x < bpl; x++) {
          data[i + x] = (data[di + x] + data[i + x - bpp]);
        }
      } else if (type == PngLineFilter.Up) {
        for (; x < bpl; x++) {
          data[i + x] = (data[di + x] + data[i + x - bpl]);
        }
      } else if (type == PngLineFilter.Average) {
        for (; x < bpp; x++) {
          data[i + x] = (data[di + x] + (data[i + x - bpl] >>> 1));
        }
        for (; x < bpl; x++) {
          data[i + x] = (data[di + x] + ((data[i + x - bpl] + data[i + x - bpp]) >>> 1));
        }
      } else if (type == PngLineFilter.Paeth) {
        for (; x < bpp; x++) {
          data[i + x] = (data[di + x] + this.unpaeth(0, data[i + x - bpl], 0));
        }
        for (; x < bpl; x++) {
          data[i + x] = (data[di + x] + this.unpaeth(data[i + x - bpp], data[i + x - bpl], data[i + x - bpp - bpl]));
        }
      }
    }
    return data;
  }
  unpaeth (a : number, b : number, c : number) {
    const p = a + b - c; const pa = (p - a); const pb = (p - b); const pc = (p - c);
    if (pa * pa <= pb * pb && pa * pa <= pc * pc) return a;
    else if (pb * pb <= pc * pc) return b;
    return c;
  }
  decodeImage (
    data : TypedArray,
    {width, bitDepth, height, colorType} : IHDR,
    {
      transparency = null,
      palette = null,
    } : DecodeImageArgs
  ) {
    const area = width * height;
    if (colorType == ColorType.Rgba) {
      if (bitDepth == 8) {
        return new Uint8Array(data).slice(0, area*4);
      }
      if (bitDepth == 16) {
        return new Uint16Array(data).slice(0, area*4);
      }
    } else if (colorType == ColorType.Rgb) {
      if (bitDepth == 8) {
        return new Uint8Array(data).slice(0, area*3);
      }
      if (bitDepth == 16) {
        return new Uint16Array(data).slice(0, area*3);
      }
    } else if (colorType == ColorType.Palette) {
      const bpp = this.bitsPerPixel(colorType, bitDepth);
      const bpl = Math.ceil(width * bpp / 8); // bytes per line
      const bf = new Uint8Array(area * 4);
      const p = palette;
      const ap = transparency;
      const tl = ap ? (typeof ap === 'number' ? 0 : ap.length) : 0;
      // console.log(p, ap);
      if (bitDepth == 1) {
        for (var y = 0; y < height; y++) {
          var s0 = y * bpl;
          var t0 = y * width;
          for (var i = 0; i < width; i++) {
            var qi = (t0 + i) << 2;
            var j = ((data[s0 + (i >> 3)] >> (7 - ((i & 7) << 0))) & 1);
            var cj = 3 * j;
            bf[qi] = p[cj];
            bf[qi + 1] = p[cj + 1];
            bf[qi + 2] = p[cj + 2];
            if (typeof ap === 'number') {
              bf[qi + 3] = 255;
            } else {
              bf[qi + 3] = (j < tl) ? ap[j] : 255;
            }
          }
        }
      }
      if (bitDepth == 2) {
        for (var y = 0; y < height; y++) {
          var s0 = y * bpl;
          var t0 = y * width;
          for (var i = 0; i < width; i++) {
            var qi = (t0 + i) << 2;
            var j = ((data[s0 + (i >> 2)] >> (6 - ((i & 3) << 1))) & 3);
            var cj = 3 * j;
            bf[qi] = p[cj];
            bf[qi + 1] = p[cj + 1];
            bf[qi + 2] = p[cj + 2];
            if (typeof ap === 'number') {
              bf[qi + 3] = 255;
            } else {
              bf[qi + 3] = (j < tl) ? ap[j] : 255;
            }
          }
        }
      }
      if (bitDepth == 4) {
        for (var y = 0; y < height; y++) {
          var s0 = y * bpl;
          var t0 = y * width;
          for (var i = 0; i < width; i++) {
            var qi = (t0 + i) << 2;
            var j = ((data[s0 + (i >> 1)] >> (4 - ((i & 1) << 2))) & 15);
            var cj = 3 * j;
            bf[qi] = p[cj];
            bf[qi + 1] = p[cj + 1];
            bf[qi + 2] = p[cj + 2];
            if (typeof ap === 'number') {
              bf[qi + 3] = 255;
            } else {
              bf[qi + 3] = (j < tl) ? ap[j] : 255;
            }
          }
        }
      }
      if (bitDepth == 8) {
        for (var i = 0; i < area; i++) {
          var qi = i << 2;
          var j = data[i];
          var cj = 3 * j;
          bf[qi] = p[cj];
          bf[qi + 1] = p[cj + 1];
          bf[qi + 2] = p[cj + 2];
          if (typeof ap === 'number') {
            bf[qi + 3] = 255;
          } else {
            bf[qi + 3] = (j < tl) ? ap[j] : 255;
          }
        }
      }
      return bf;
    } else if (colorType == ColorType.GrayscaleAlpha) {
      if (bitDepth === 8) {
        return new Uint8Array(data).slice(0, area * 2);
      }
      if (bitDepth === 16) {
        return new Uint16Array(data).slice(0, area * 2);
      }
      throw new Error('Invalid bit depth');
    } else if (colorType == ColorType.Grayscale) {
      if (bitDepth === 8 || bitDepth === 4 || bitDepth === 2 || bitDepth === 1) {
        return new Uint8Array(data).slice(0, area);
      }
      if (bitDepth === 16) {
        return new Uint16Array(data).slice(0, area);
      }
      throw new Error('Invalid bit depth');
    }
  }
  static Float32ArrayToPng16Bit(inp: Float32Array) : Uint8Array {
    let u8 = new ArrayBuffer(inp.length*2);
    let dv = new DataView(u8);
    for (let i = 0; i < inp.length; i++) {
      dv.setUint16(i * 2, inp[i]);
    }
    return new Uint8Array(u8);
  }
  static Uint16ArrayToPng16Bit(inp: Uint16Array) : Uint8Array {
    let dv = new DataView(inp.buffer);
    for (let i = 0; i < inp.length; i++) {
      dv.setUint16(i * 2, inp[i]);
    }
    return new Uint8Array(inp.buffer);
  }
  static arrayToPng16Bit(inp: number[]|Uint16Array) : Uint8Array {
    let u8 = new ArrayBuffer(inp.length*2);
    let dv = new DataView(u8);
    for (let i = 0; i < inp.length; i++) {
      dv.setUint16(i * 2, inp[i]);
    }
    return new Uint8Array(u8);
  }
  terrariumToGrayscale() : Float32Array {
    this.assertHasData();
    const pixels = this.getImageData();
    const area = this.getArea();
    const newPixels = new Float32Array(area);
    // terrarium images are 24,8 decimal encodings with R representing
    // the first 8 bits, G representing the next 8 and B representing the
    // final 8 bits
    // i.e. the height in metres is (R * 256) + (G) + (B / 256)
    // so...
    for (let i = 0; i < area; i++) {
      newPixels[i] = ((pixels[(i*3)]*2**8) + (pixels[(i*3)+1])+ (pixels[(i*3)+2]/2**8)) - 2**15;
    }
    return newPixels;
  }
}