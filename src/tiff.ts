/**
 * Minimal GeoTIFF reading and writing for single-band elevation rasters.
 *
 * The writer produces a little-endian, stripped, 32-bit float GeoTIFF in
 * EPSG:3857 that GDAL/QGIS open directly. The reader covers what DEMs in
 * the wild use (SRTM, Copernicus, USGS, lidar exports): both byte orders,
 * classic and BigTIFF, strips and tiles, none/LZW/Deflate/PackBits with
 * predictors 1–3, and integer or float samples.
 */
const pako = require('pako');

// Baseline and extension tags
const TAG_IMAGE_WIDTH = 256;
const TAG_IMAGE_LENGTH = 257;
const TAG_BITS_PER_SAMPLE = 258;
const TAG_COMPRESSION = 259;
const TAG_PHOTOMETRIC = 262;
const TAG_STRIP_OFFSETS = 273;
const TAG_SAMPLES_PER_PIXEL = 277;
const TAG_ROWS_PER_STRIP = 278;
const TAG_STRIP_BYTE_COUNTS = 279;
const TAG_PLANAR_CONFIGURATION = 284;
const TAG_PREDICTOR = 317;
const TAG_TILE_WIDTH = 322;
const TAG_TILE_LENGTH = 323;
const TAG_TILE_OFFSETS = 324;
const TAG_TILE_BYTE_COUNTS = 325;
const TAG_SAMPLE_FORMAT = 339;
// GeoTIFF tags
const TAG_MODEL_PIXEL_SCALE = 33550;
const TAG_MODEL_TIEPOINT = 33922;
const TAG_MODEL_TRANSFORMATION = 34264;
const TAG_GEO_KEY_DIRECTORY = 34735;
const TAG_GEO_DOUBLE_PARAMS = 34736;
const TAG_GEO_ASCII_PARAMS = 34737;
const TAG_GDAL_NODATA = 42113;

// GeoKeys
export const GEOKEY_MODEL_TYPE = 1024;
export const GEOKEY_RASTER_TYPE = 1025;
export const GEOKEY_CITATION = 1026;
export const GEOKEY_GEOGRAPHIC_TYPE = 2048;
export const GEOKEY_GEOG_CITATION = 2049;
export const GEOKEY_GEODETIC_DATUM = 2050;
export const GEOKEY_PROJECTED_CS_TYPE = 3072;
export const GEOKEY_PROJ_CITATION = 3073;
export const GEOKEY_PROJ_LINEAR_UNITS = 3076;

const MODEL_TYPE_PROJECTED = 1;
const MODEL_TYPE_GEOGRAPHIC = 2;
const MODEL_TYPE_GEOCENTRIC = 3;
const RASTER_PIXEL_IS_AREA = 1;
const RASTER_PIXEL_IS_POINT = 2;
const LINEAR_UNIT_METRE = 9001;
const USER_DEFINED = 32767;

// Field types
const TYPE_ASCII = 2;
const TYPE_SHORT = 3;
const TYPE_LONG = 4;
const TYPE_DOUBLE = 12;

const TYPE_SIZES: {[type: number]: number} = {
  1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8, 13: 4, 16: 8, 17: 8, 18: 8,
};

const COMPRESSION_NAMES: {[code: number]: string} = {
  2: 'CCITT Group 3', 3: 'CCITT T.4', 4: 'CCITT T.6', 6: 'old-style JPEG', 7: 'JPEG',
  34661: 'JBIG', 34676: 'SGILog', 34712: 'JPEG 2000', 34887: 'LERC', 34925: 'LZMA',
  50000: 'ZSTD', 50001: 'WebP', 50002: 'JPEG XL',
};

/** Aim for strips of about this many bytes, as libtiff/GDAL do. */
const STRIP_TARGET_BYTES = 256 * 1024;

// ---------------------------------------------------------------------------
// Writing

export type GeoTiffEncodeOptions = {
  width: number;
  height: number;
  /** Row-major heights, top row first. */
  data: Float32Array;
  /** Top-left corner of the top-left pixel in EPSG:3857 metres, and the pixel size. */
  bounds3857: {left: number; top: number; pixelSizeX: number; pixelSizeY: number};
  noData?: number;
  /** Deflate with the floating-point predictor. */
  compress?: boolean;
};

type IfdEntry = {tag: number; type: number; count: number; bytes: Uint8Array};

const shortsEntry = (tag: number, values: number[]): IfdEntry => {
  const bytes = new Uint8Array(values.length * 2);
  const view = new DataView(bytes.buffer);
  values.forEach((v, i) => view.setUint16(i * 2, v, true));
  return {tag, type: TYPE_SHORT, count: values.length, bytes};
};

const longsEntry = (tag: number, values: number[]): IfdEntry => {
  const bytes = new Uint8Array(values.length * 4);
  const view = new DataView(bytes.buffer);
  values.forEach((v, i) => view.setUint32(i * 4, v, true));
  return {tag, type: TYPE_LONG, count: values.length, bytes};
};

const doublesEntry = (tag: number, values: number[]): IfdEntry => {
  const bytes = new Uint8Array(values.length * 8);
  const view = new DataView(bytes.buffer);
  values.forEach((v, i) => view.setFloat64(i * 8, v, true));
  return {tag, type: TYPE_DOUBLE, count: values.length, bytes};
};

const asciiEntry = (tag: number, text: string): IfdEntry => {
  const bytes = new Uint8Array(text.length + 1);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0x7f;
  return {tag, type: TYPE_ASCII, count: bytes.length, bytes};
};

/**
 * TIFF floating-point predictor (Adobe Photoshop TIFF Technical Note 3):
 * split each row into byte planes, most significant first, then
 * byte-wise horizontal differencing across the whole row.
 */
const floatPredictRow = (values: Float32Array, out: Uint8Array) => {
  const n = values.length;
  const bits = new Uint32Array(values.buffer, values.byteOffset, n);
  for (let k = 0; k < n; k++) {
    const b = bits[k];
    out[k] = b >>> 24;
    out[n + k] = (b >>> 16) & 0xff;
    out[2 * n + k] = (b >>> 8) & 0xff;
    out[3 * n + k] = b & 0xff;
  }
  for (let i = out.length - 1; i > 0; i--) {
    out[i] = (out[i] - out[i - 1]) & 0xff;
  }
};

/** Formats a no-data value the way GDAL writes it. */
const formatNoData = (value: number) => {
  if (Number.isNaN(value)) return 'nan';
  if (value === Infinity) return 'inf';
  if (value === -Infinity) return '-inf';
  return `${value}`;
};

/**
 * Single-band 32-bit float GeoTIFF in EPSG:3857 (GeoTIFF 1.1), little-endian,
 * stripped, uncompressed or Deflate + floating-point predictor.
 */
export const encodeGeoTiff = (options: GeoTiffEncodeOptions): ArrayBuffer => {
  const {width, height, data, bounds3857, noData, compress = false} = options;
  if (width < 1 || height < 1 || data.length < width * height) {
    throw new Error(`GeoTIFF needs ${width}×${height} heights, got ${data.length}`);
  }
  const rowBytes = width * 4;
  const rowsPerStrip = Math.max(1, Math.min(height, Math.floor(STRIP_TARGET_BYTES / rowBytes)));
  const stripCount = Math.ceil(height / rowsPerStrip);

  const strips: Uint8Array[] = [];
  const rowValues = new Float32Array(width);
  for (let s = 0; s < stripCount; s++) {
    const firstRow = s * rowsPerStrip;
    const rows = Math.min(rowsPerStrip, height - firstRow);
    const raw = new Uint8Array(rows * rowBytes);
    if (compress) {
      for (let r = 0; r < rows; r++) {
        const start = (firstRow + r) * width;
        rowValues.set(data.subarray(start, start + width));
        floatPredictRow(rowValues, raw.subarray(r * rowBytes, (r + 1) * rowBytes));
      }
      strips.push(pako.deflate(raw));
    } else {
      const view = new DataView(raw.buffer);
      for (let i = 0; i < rows * width; i++) {
        view.setFloat32(i * 4, data[firstRow * width + i], true);
      }
      strips.push(raw);
    }
  }

  const entries: IfdEntry[] = [
    longsEntry(TAG_IMAGE_WIDTH, [width]),
    longsEntry(TAG_IMAGE_LENGTH, [height]),
    shortsEntry(TAG_BITS_PER_SAMPLE, [32]),
    shortsEntry(TAG_COMPRESSION, [compress ? 8 : 1]),
    shortsEntry(TAG_PHOTOMETRIC, [1]), // MinIsBlack
    longsEntry(TAG_STRIP_OFFSETS, strips.map(() => 0)), // filled in once the layout is known
    shortsEntry(TAG_SAMPLES_PER_PIXEL, [1]),
    longsEntry(TAG_ROWS_PER_STRIP, [rowsPerStrip]),
    longsEntry(TAG_STRIP_BYTE_COUNTS, strips.map(s => s.length)),
    shortsEntry(TAG_PLANAR_CONFIGURATION, [1]),
    shortsEntry(TAG_SAMPLE_FORMAT, [3]), // IEEE float
    doublesEntry(TAG_MODEL_PIXEL_SCALE, [bounds3857.pixelSizeX, bounds3857.pixelSizeY, 0]),
    doublesEntry(TAG_MODEL_TIEPOINT, [0, 0, 0, bounds3857.left, bounds3857.top, 0]),
    shortsEntry(TAG_GEO_KEY_DIRECTORY, [
      1, 1, 1, 4, // KeyDirectoryVersion, KeyRevision, MinorRevision (GeoTIFF 1.1), key count
      GEOKEY_MODEL_TYPE, 0, 1, MODEL_TYPE_PROJECTED,
      GEOKEY_RASTER_TYPE, 0, 1, RASTER_PIXEL_IS_AREA,
      GEOKEY_PROJECTED_CS_TYPE, 0, 1, 3857,
      GEOKEY_PROJ_LINEAR_UNITS, 0, 1, LINEAR_UNIT_METRE,
    ]),
  ];
  if (compress) entries.push(shortsEntry(TAG_PREDICTOR, [3]));
  if (noData !== undefined) entries.push(asciiEntry(TAG_GDAL_NODATA, formatNoData(noData)));
  entries.sort((a, b) => a.tag - b.tag);

  // Layout: header, IFD, out-of-line values, then strip data; every offset word-aligned
  const align = (n: number) => (n + 3) & ~3;
  const ifdOffset = 8;
  let cursor = ifdOffset + 2 + entries.length * 12 + 4;
  const valueOffsets = entries.map(entry => {
    if (entry.bytes.length <= 4) return -1;
    cursor = align(cursor);
    const offset = cursor;
    cursor += entry.bytes.length;
    return offset;
  });
  const stripOffsets: number[] = [];
  for (const strip of strips) {
    cursor = align(cursor);
    stripOffsets.push(cursor);
    cursor += strip.length;
  }
  const offsetsEntry = entries.find(e => e.tag === TAG_STRIP_OFFSETS);
  offsetsEntry.bytes = longsEntry(TAG_STRIP_OFFSETS, stripOffsets).bytes;

  const buffer = new ArrayBuffer(cursor);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  view.setUint8(0, 0x49); // 'II'
  view.setUint8(1, 0x49);
  view.setUint16(2, 42, true);
  view.setUint32(4, ifdOffset, true);
  view.setUint16(ifdOffset, entries.length, true);
  entries.forEach((entry, i) => {
    const p = ifdOffset + 2 + i * 12;
    view.setUint16(p, entry.tag, true);
    view.setUint16(p + 2, entry.type, true);
    view.setUint32(p + 4, entry.count, true);
    if (valueOffsets[i] < 0) {
      bytes.set(entry.bytes, p + 8); // left-justified in the value field
    } else {
      view.setUint32(p + 8, valueOffsets[i], true);
      bytes.set(entry.bytes, valueOffsets[i]);
    }
  });
  view.setUint32(ifdOffset + 2 + entries.length * 12, 0, true); // no further IFDs
  strips.forEach((strip, i) => bytes.set(strip, stripOffsets[i]));
  return buffer;
};

// ---------------------------------------------------------------------------
// Reading

export type TiffGeo = {
  /** EPSG code of the projected or geographic CRS, if one is declared. */
  epsg: number | null;
  modelType: 'projected' | 'geographic' | 'geocentric' | null;
  /** Whether a pixel's coordinate is its top-left corner (area) or its centre (point). */
  rasterType: 'area' | 'point';
  /**
   * GDAL-style geotransform from raster (col, row) to CRS (x, y), always in the
   * pixel-corner convention: x = t[0] + col·t[1] + row·t[2], y = t[3] + col·t[4] + row·t[5],
   * where (0, 0) is the outer corner of the first pixel. PixelIsPoint files
   * are already shifted by half a pixel. Null if the file has no usable georeferencing.
   */
  geoTransform: number[] | null;
  pixelScale: number[] | null;
  tiepoints: number[] | null;
  transformation: number[] | null;
  /** Every GeoKey, resolved to its number, number list or string value. */
  geoKeys: {[key: number]: number | number[] | string};
  /** Any citation text (GT/Geog/Proj citation), handy for user-defined CRSes. */
  citation: string | null;
};

export type DecodedTiff = {
  width: number;
  height: number;
  /** First band, row-major, top row first, raw values (no-data not replaced). */
  data: Float32Array;
  noData: number | null;
  geo: TiffGeo;
};

type RawEntry = {type: number; count: number; valueOffset: number};

class TiffReader {
  view: DataView;
  bytes: Uint8Array;
  le: boolean;
  big: boolean;
  entries: {[tag: number]: RawEntry} = {};

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
    this.bytes = new Uint8Array(buffer);
    if (buffer.byteLength < 8) throw new Error('Not a TIFF file (too short)');
    const order = this.view.getUint16(0, false);
    if (order === 0x4949) this.le = true;
    else if (order === 0x4d4d) this.le = false;
    else throw new Error('Not a TIFF file (bad byte-order mark)');
    const magic = this.view.getUint16(2, this.le);
    if (magic === 43) {
      this.big = true;
      if (this.view.getUint16(4, this.le) !== 8) throw new Error('Unsupported BigTIFF offset size');
    } else if (magic === 42) {
      this.big = false;
    } else {
      throw new Error('Not a TIFF file (bad magic number)');
    }
    this.readIfd(this.big ? this.uint64(8) : this.view.getUint32(4, this.le));
  }

  uint64(offset: number) {
    const lo = this.view.getUint32(offset + (this.le ? 0 : 4), this.le);
    const hi = this.view.getUint32(offset + (this.le ? 4 : 0), this.le);
    if (hi >= 0x200000) throw new Error('TIFF offset too large');
    return hi * 0x100000000 + lo;
  }

  readIfd(offset: number) {
    const countSize = this.big ? 8 : 2;
    const entrySize = this.big ? 20 : 12;
    const valueSize = this.big ? 8 : 4;
    if (offset + countSize > this.bytes.length) throw new Error('TIFF is truncated (IFD out of range)');
    const count = this.big ? this.uint64(offset) : this.view.getUint16(offset, this.le);
    for (let i = 0; i < count; i++) {
      const p = offset + countSize + i * entrySize;
      if (p + entrySize > this.bytes.length) throw new Error('TIFF is truncated (IFD out of range)');
      const tag = this.view.getUint16(p, this.le);
      const type = this.view.getUint16(p + 2, this.le);
      const n = this.big ? this.uint64(p + 4) : this.view.getUint32(p + 4, this.le);
      const valueField = p + (this.big ? 12 : 8);
      const size = (TYPE_SIZES[type] || 1) * n;
      const valueOffset = size <= valueSize ? valueField : (this.big ? this.uint64(valueField) : this.view.getUint32(valueField, this.le));
      this.entries[tag] = {type, count: n, valueOffset};
    }
  }

  has(tag: number) {
    return tag in this.entries;
  }

  values(tag: number): number[] | null {
    const entry = this.entries[tag];
    if (!entry) return null;
    const {type, count, valueOffset: p} = entry;
    const size = TYPE_SIZES[type];
    if (!size) throw new Error(`Unknown TIFF field type ${type} for tag ${tag}`);
    if (p + size * count > this.bytes.length) throw new Error(`TIFF is truncated (tag ${tag} out of range)`);
    const v = this.view;
    const le = this.le;
    const out: number[] = new Array(count);
    for (let i = 0; i < count; i++) {
      const o = p + i * size;
      switch (type) {
        case 1: case 2: case 7: out[i] = v.getUint8(o); break;
        case 6: out[i] = v.getInt8(o); break;
        case 3: out[i] = v.getUint16(o, le); break;
        case 8: out[i] = v.getInt16(o, le); break;
        case 4: case 13: out[i] = v.getUint32(o, le); break;
        case 9: out[i] = v.getInt32(o, le); break;
        case 5: out[i] = v.getUint32(o, le) / v.getUint32(o + 4, le); break;
        case 10: out[i] = v.getInt32(o, le) / v.getInt32(o + 4, le); break;
        case 11: out[i] = v.getFloat32(o, le); break;
        case 12: out[i] = v.getFloat64(o, le); break;
        case 16: case 18: out[i] = this.uint64(o); break;
        case 17: out[i] = v.getInt32(o + (le ? 4 : 0), le) * 0x100000000 + v.getUint32(o + (le ? 0 : 4), le); break;
      }
    }
    return out;
  }

  value(tag: number, fallback: number): number {
    const values = this.values(tag);
    return values && values.length ? values[0] : fallback;
  }

  string(tag: number): string | null {
    const values = this.values(tag);
    if (!values) return null;
    let text = '';
    for (const c of values) text += String.fromCharCode(c);
    return text;
  }
}

/** TIFF LZW (MSB-first codes, 9–12 bits, early change). */
export const lzwDecode = (input: Uint8Array, expectedLength: number): Uint8Array => {
  const CLEAR = 256;
  const EOI = 257;
  const prefix = new Int32Array(4096);
  const suffix = new Uint8Array(4096);
  const first = new Uint8Array(4096);
  const length = new Int32Array(4096);
  for (let i = 0; i < 256; i++) {
    prefix[i] = -1;
    suffix[i] = i;
    first[i] = i;
    length[i] = 1;
  }
  let out = new Uint8Array(Math.max(expectedLength, 1));
  let pos = 0;
  const totalBits = input.length * 8;
  let bitPos = 0;
  let codeLength = 9;
  let next = 258;
  let old = -1;

  const write = (code: number) => {
    const len = length[code];
    if (pos + len > out.length) {
      const grown = new Uint8Array(Math.max(out.length * 2, pos + len));
      grown.set(out);
      out = grown;
    }
    for (let i = pos + len - 1, c = code; i >= pos; i--, c = prefix[c]) out[i] = suffix[c];
    pos += len;
  };
  const add = (base: number, byte: number) => {
    if (next >= 4096) return;
    prefix[next] = base;
    suffix[next] = byte;
    first[next] = first[base];
    length[next] = length[base] + 1;
    next++;
    if (next >= (1 << codeLength) - 1 && codeLength < 12) codeLength++;
  };

  while (bitPos + codeLength <= totalBits) {
    // Read codeLength bits, most significant first
    let code = 0;
    for (let i = 0; i < codeLength; i++, bitPos++) {
      code = (code << 1) | ((input[bitPos >> 3] >> (7 - (bitPos & 7))) & 1);
    }
    if (code === EOI) break;
    if (code === CLEAR) {
      next = 258;
      codeLength = 9;
      old = -1;
      continue;
    }
    if (old < 0) {
      if (code > 255) throw new Error('Corrupt LZW data');
      write(code);
    } else if (code < next) {
      write(code);
      add(old, first[code]);
    } else if (code === next) {
      add(old, first[old]);
      write(code);
    } else {
      throw new Error('Corrupt LZW data');
    }
    old = code;
  }
  return out.subarray(0, pos);
};

/** PackBits run-length decoding (Apple / TIFF compression 32773). */
export const packBitsDecode = (input: Uint8Array, expectedLength: number): Uint8Array => {
  const out = new Uint8Array(expectedLength);
  let i = 0;
  let pos = 0;
  while (i < input.length && pos < expectedLength) {
    const n = (input[i++] << 24) >> 24;
    if (n >= 0) {
      for (let k = 0; k <= n && pos < expectedLength; k++) out[pos++] = input[i++];
    } else if (n !== -128) {
      const byte = input[i++];
      for (let k = 0; k < 1 - n && pos < expectedLength; k++) out[pos++] = byte;
    }
  }
  return out;
};

const decompress = (compression: number, input: Uint8Array, expectedLength: number): Uint8Array => {
  switch (compression) {
    case 1: return input;
    case 5: return lzwDecode(input, expectedLength);
    case 8: case 32946: return pako.inflate(input);
    case 32773: return packBitsDecode(input, expectedLength);
  }
  const name = COMPRESSION_NAMES[compression] || `code ${compression}`;
  throw new Error(`TIFF compression ${name} isn't supported. Re-save the file uncompressed or with LZW or Deflate (e.g. gdal_translate -co COMPRESS=DEFLATE in.tif out.tif, or the "Create Options" in QGIS's Save Raster dialog).`);
};

/** Undo horizontal differencing (predictor 2) on integer samples, in place. */
const undoHorizontalPredictor = (
  bytes: Uint8Array, rowSamples: number, rows: number, stride: number, bytesPerSample: number, le: boolean,
) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let r = 0; r < rows; r++) {
    const base = r * rowSamples * bytesPerSample;
    if (base + rowSamples * bytesPerSample > bytes.length) break;
    for (let i = stride; i < rowSamples; i++) {
      const o = base + i * bytesPerSample;
      const prev = o - stride * bytesPerSample;
      if (bytesPerSample === 1) bytes[o] = (bytes[o] + bytes[prev]) & 0xff;
      else if (bytesPerSample === 2) view.setUint16(o, view.getUint16(o, le) + view.getUint16(prev, le), le);
      else if (bytesPerSample === 4) view.setUint32(o, (view.getUint32(o, le) + view.getUint32(prev, le)) >>> 0, le);
      else throw new Error(`Predictor 2 isn't supported for ${bytesPerSample * 8}-bit samples`);
    }
  }
};

/**
 * Undo the floating-point predictor (predictor 3). Returns the samples
 * reassembled in big-endian byte order, whatever the file's byte order.
 */
const undoFloatPredictor = (
  bytes: Uint8Array, rowSamples: number, rows: number, stride: number, bytesPerSample: number,
): Uint8Array => {
  const rowBytes = rowSamples * bytesPerSample;
  const out = new Uint8Array(rowBytes * rows);
  for (let r = 0; r < rows; r++) {
    const base = r * rowBytes;
    if (base + rowBytes > bytes.length) break;
    const row = bytes.subarray(base, base + rowBytes);
    for (let i = stride; i < rowBytes; i++) row[i] = (row[i] + row[i - stride]) & 0xff;
    for (let k = 0; k < rowSamples; k++) {
      for (let b = 0; b < bytesPerSample; b++) out[base + k * bytesPerSample + b] = row[b * rowSamples + k];
    }
  }
  return out;
};

type SampleReader = (view: DataView, offset: number, le: boolean) => number;

const sampleReader = (format: number, bits: number): SampleReader => {
  if (format === 1) {
    if (bits === 8) return (v, o) => v.getUint8(o);
    if (bits === 16) return (v, o, le) => v.getUint16(o, le);
    if (bits === 32) return (v, o, le) => v.getUint32(o, le);
  } else if (format === 2) {
    if (bits === 8) return (v, o) => v.getInt8(o);
    if (bits === 16) return (v, o, le) => v.getInt16(o, le);
    if (bits === 32) return (v, o, le) => v.getInt32(o, le);
  } else if (format === 3) {
    if (bits === 32) return (v, o, le) => v.getFloat32(o, le);
    if (bits === 64) return (v, o, le) => v.getFloat64(o, le);
  }
  const kind = format === 1 ? 'unsigned integer' : format === 2 ? 'signed integer' : format === 3 ? 'floating-point' : `sample format ${format}`;
  throw new Error(`${bits}-bit ${kind} TIFF samples aren't supported. Use 8/16/32-bit integers or 32/64-bit floats.`);
};

const parseNoData = (text: string | null): number | null => {
  if (text === null) return null;
  const clean = text.replace(/\0/g, '').trim();
  if (!clean) return null;
  if (/^[+-]?nan$/i.test(clean)) return NaN;
  if (/^\+?inf/i.test(clean)) return Infinity;
  if (/^-inf/i.test(clean)) return -Infinity;
  const value = parseFloat(clean);
  return Number.isNaN(value) ? null : value;
};

const readGeo = (reader: TiffReader): TiffGeo => {
  const geoKeys: {[key: number]: number | number[] | string} = {};
  const directory = reader.values(TAG_GEO_KEY_DIRECTORY);
  if (directory && directory.length >= 4) {
    const doubles = reader.values(TAG_GEO_DOUBLE_PARAMS) || [];
    const ascii = reader.string(TAG_GEO_ASCII_PARAMS) || '';
    const keyCount = directory[3];
    for (let i = 0; i < keyCount; i++) {
      const p = 4 + i * 4;
      if (p + 3 >= directory.length) break;
      const [id, location, count, offset] = directory.slice(p, p + 4);
      if (location === 0) {
        geoKeys[id] = offset;
      } else if (location === TAG_GEO_DOUBLE_PARAMS) {
        const values = doubles.slice(offset, offset + count);
        geoKeys[id] = count === 1 ? values[0] : values;
      } else if (location === TAG_GEO_ASCII_PARAMS) {
        // Strings end with '|' in place of a NUL
        geoKeys[id] = ascii.substr(offset, count).replace(/[|\0]+$/, '');
      } else if (location === TAG_GEO_KEY_DIRECTORY) {
        const values = directory.slice(offset, offset + count);
        geoKeys[id] = count === 1 ? values[0] : values;
      }
    }
  }
  const num = (key: number) => (typeof geoKeys[key] === 'number' ? geoKeys[key] as number : null);

  const modelTypeCode = num(GEOKEY_MODEL_TYPE);
  const modelType = modelTypeCode === MODEL_TYPE_PROJECTED ? 'projected'
    : modelTypeCode === MODEL_TYPE_GEOGRAPHIC ? 'geographic'
    : modelTypeCode === MODEL_TYPE_GEOCENTRIC ? 'geocentric' : null;
  let epsg: number | null = null;
  const projected = num(GEOKEY_PROJECTED_CS_TYPE);
  const geographic = num(GEOKEY_GEOGRAPHIC_TYPE);
  if (modelType !== 'geographic' && projected !== null && projected !== USER_DEFINED && projected !== 0) epsg = projected;
  else if (modelType !== 'projected' && geographic !== null && geographic !== USER_DEFINED && geographic !== 0) epsg = geographic;
  const rasterType = num(GEOKEY_RASTER_TYPE) === RASTER_PIXEL_IS_POINT ? 'point' : 'area';
  const citation = [GEOKEY_CITATION, GEOKEY_PROJ_CITATION, GEOKEY_GEOG_CITATION]
    .map(key => geoKeys[key]).filter(value => typeof value === 'string').join(' | ') || null;

  const pixelScale = reader.values(TAG_MODEL_PIXEL_SCALE);
  const tiepoints = reader.values(TAG_MODEL_TIEPOINT);
  const transformation = reader.values(TAG_MODEL_TRANSFORMATION);
  let geoTransform: number[] | null = null;
  if (transformation && transformation.length >= 8) {
    const m = transformation;
    geoTransform = [m[3], m[0], m[1], m[7], m[4], m[5]];
  } else if (pixelScale && pixelScale.length >= 2 && tiepoints && tiepoints.length >= 6) {
    const [i, j, , x, y] = tiepoints;
    const [sx, sy] = pixelScale;
    geoTransform = [x - i * sx, sx, 0, y + j * sy, 0, -sy];
  }
  if (geoTransform && rasterType === 'point') {
    // The coordinate names the pixel centre: move it to the corner
    const t = geoTransform;
    geoTransform = [t[0] - 0.5 * t[1] - 0.5 * t[2], t[1], t[2], t[3] - 0.5 * t[4] - 0.5 * t[5], t[4], t[5]];
  }
  return {epsg, modelType, rasterType, geoTransform, pixelScale, tiepoints, transformation, geoKeys, citation};
};

/** Decode the first band of the first image in a TIFF/GeoTIFF. */
export const decodeTiff = (buffer: ArrayBuffer): DecodedTiff => {
  const reader = new TiffReader(buffer);
  const width = reader.value(TAG_IMAGE_WIDTH, 0);
  const height = reader.value(TAG_IMAGE_LENGTH, 0);
  if (!width || !height) throw new Error('TIFF has no image size');
  const bits = reader.value(TAG_BITS_PER_SAMPLE, 1);
  const format = reader.value(TAG_SAMPLE_FORMAT, 1);
  const samplesPerPixel = reader.value(TAG_SAMPLES_PER_PIXEL, 1);
  const compression = reader.value(TAG_COMPRESSION, 1);
  const predictor = reader.value(TAG_PREDICTOR, 1);
  const planar = reader.value(TAG_PLANAR_CONFIGURATION, 1);
  const readSample = sampleReader(format, bits);
  const bytesPerSample = bits / 8;
  if (predictor !== 1 && predictor !== 2 && predictor !== 3) throw new Error(`TIFF predictor ${predictor} isn't supported`);
  if (predictor === 3 && format !== 3) throw new Error('TIFF floating-point predictor used on integer samples');

  const tiled = reader.has(TAG_TILE_WIDTH);
  const chunkWidth = tiled ? reader.value(TAG_TILE_WIDTH, 0) : width;
  const chunkHeight = tiled ? reader.value(TAG_TILE_LENGTH, 0) : Math.min(height, reader.value(TAG_ROWS_PER_STRIP, height));
  const offsets = reader.values(tiled ? TAG_TILE_OFFSETS : TAG_STRIP_OFFSETS);
  const byteCounts = reader.values(tiled ? TAG_TILE_BYTE_COUNTS : TAG_STRIP_BYTE_COUNTS);
  if (!chunkWidth || !chunkHeight || !offsets) throw new Error('TIFF has no image data layout');
  const across = Math.ceil(width / chunkWidth);
  const down = Math.ceil(height / chunkHeight);
  // With separate planes the first band's chunks come first
  const chunkSamples = planar === 2 ? 1 : samplesPerPixel;
  if (offsets.length < across * down) throw new Error('TIFF is missing image data chunks');

  const data = new Float32Array(width * height);
  const rowSamples = chunkWidth * chunkSamples;
  for (let c = 0; c < across * down; c++) {
    const cx = c % across;
    const cy = Math.floor(c / across);
    const rows = tiled ? chunkHeight : Math.min(chunkHeight, height - cy * chunkHeight);
    const expected = rowSamples * rows * bytesPerSample;
    const offset = offsets[c];
    const count = byteCounts ? byteCounts[c] : expected;
    if (offset + count > reader.bytes.length) throw new Error('TIFF is truncated (image data out of range)');
    // Copy so predictors can work in place without touching the source buffer
    let chunk = decompress(compression, reader.bytes.slice(offset, offset + count), expected);
    let le = reader.le;
    if (predictor === 2) {
      undoHorizontalPredictor(chunk, rowSamples, rows, chunkSamples, bytesPerSample, le);
    } else if (predictor === 3) {
      chunk = undoFloatPredictor(chunk, rowSamples, rows, chunkSamples, bytesPerSample);
      le = false;
    }
    const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    const x0 = cx * chunkWidth;
    const y0 = cy * chunkHeight;
    const maxX = Math.min(chunkWidth, width - x0);
    const maxY = Math.min(rows, height - y0);
    for (let r = 0; r < maxY; r++) {
      const rowBase = r * rowSamples * bytesPerSample;
      const outBase = (y0 + r) * width + x0;
      for (let i = 0; i < maxX; i++) {
        const o = rowBase + i * chunkSamples * bytesPerSample;
        data[outBase + i] = o + bytesPerSample <= chunk.length ? readSample(view, o, le) : 0;
      }
    }
  }

  return {width, height, data, noData: parseNoData(reader.string(TAG_GDAL_NODATA)), geo: readGeo(reader)};
};

/** True if the bytes start with a TIFF or BigTIFF header. */
export const isTiff = (buffer: ArrayBuffer) => {
  if (buffer.byteLength < 4) return false;
  const b = new Uint8Array(buffer, 0, 4);
  return (b[0] === 0x49 && b[1] === 0x49 && (b[2] === 42 || b[2] === 43) && b[3] === 0)
    || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0 && (b[3] === 42 || b[3] === 43));
};
