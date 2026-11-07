import {decodeTiff, encodeGeoTiff, isTiff, lzwDecode, packBitsDecode} from '../src/tiff';

const fixture = (name: string): ArrayBuffer => {
  const bytes = Buffer.from(FIXTURES[name], 'base64');
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

/** Values the GDAL fixtures were written with (see the generator notes above FIXTURES). */
const W = 20;
const H = 18;
const fval = (c: number, r: number) => r * 100 + c * 1.5 - 50;
const ival = (c: number, r: number) => r * 1000 + c * 7 - 300;
const uval = (c: number, r: number) => r * 1000 + c * 7;
const bval = (c: number, r: number) => (r * 7 + c) % 200;

const expectGrid = (data: Float32Array, fn: (c: number, r: number) => number, skip = -1) => {
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const i = r * W + c;
      if (i === skip) continue;
      if (data[i] !== Math.fround(fn(c, r))) throw new Error(`pixel (${c}, ${r}) = ${data[i]}, expected ${fn(c, r)}`);
    }
  }
};

/** Read the IFD of a little-endian classic TIFF into {tag: {type, count, valueField}}. */
const readIfd = (buffer: ArrayBuffer) => {
  const view = new DataView(buffer);
  const ifd = view.getUint32(4, true);
  const count = view.getUint16(ifd, true);
  const entries: {tag: number; type: number; count: number; field: number}[] = [];
  for (let i = 0; i < count; i++) {
    const p = ifd + 2 + i * 12;
    entries.push({tag: view.getUint16(p, true), type: view.getUint16(p + 2, true), count: view.getUint32(p + 4, true), field: p + 8});
  }
  return {view, entries, nextIfd: view.getUint32(ifd + 2 + count * 12, true)};
};

type TestEntry = {tag: number; type: number; values: number[] | string};

/**
 * Tiny classic-TIFF writer for hand-made test files in either byte order.
 * Tag 273 (StripOffsets) is filled in with the positions of `strips`.
 */
const buildTiff = (le: boolean, entries: TestEntry[], strips: Uint8Array[]): ArrayBuffer => {
  const sizes: {[type: number]: number} = {1: 1, 2: 1, 3: 2, 4: 4, 11: 4, 12: 8};
  const sorted = entries.slice().sort((a, b) => a.tag - b.tag);
  const ifdSize = 2 + sorted.length * 12 + 4;
  const lengths = sorted.map(e => (typeof e.values === 'string' ? e.values.length + 1 : e.values.length) * sizes[e.type]);
  let cursor = 8 + ifdSize;
  const extraOffsets = lengths.map(len => {
    if (len <= 4) return -1;
    const o = cursor;
    cursor += (len + 1) & ~1;
    return o;
  });
  const stripOffsets = strips.map(s => {
    const o = cursor;
    cursor += (s.length + 1) & ~1;
    return o;
  });
  const buffer = new ArrayBuffer(cursor);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  bytes[0] = bytes[1] = le ? 0x49 : 0x4d;
  view.setUint16(2, 42, le);
  view.setUint32(4, 8, le);
  view.setUint16(8, sorted.length, le);
  sorted.forEach((e, i) => {
    const p = 10 + i * 12;
    const values = e.tag === 273 ? stripOffsets : typeof e.values === 'string'
      ? Array.from(e.values + '\0').map(ch => ch.charCodeAt(0)) : e.values;
    view.setUint16(p, e.tag, le);
    view.setUint16(p + 2, e.type, le);
    view.setUint32(p + 4, values.length, le);
    let o = extraOffsets[i] < 0 ? p + 8 : extraOffsets[i];
    if (extraOffsets[i] >= 0) view.setUint32(p + 8, o, le);
    for (const v of values) {
      if (e.type === 1 || e.type === 2) view.setUint8(o, v);
      else if (e.type === 3) view.setUint16(o, v, le);
      else if (e.type === 4) view.setUint32(o, v, le);
      else if (e.type === 11) view.setFloat32(o, v, le);
      else if (e.type === 12) view.setFloat64(o, v, le);
      o += sizes[e.type];
    }
  });
  strips.forEach((s, i) => bytes.set(s, stripOffsets[i]));
  return buffer;
};

/** Pack codes MSB-first at the given bit widths, as TIFF LZW does. */
const packCodes = (codes: number[], widths: number[]) => {
  const bits: number[] = [];
  codes.forEach((code, i) => {
    for (let b = widths[i] - 1; b >= 0; b--) bits.push((code >> b) & 1);
  });
  const out = new Uint8Array(Math.ceil(bits.length / 8));
  bits.forEach((bit, i) => { out[i >> 3] |= bit << (7 - (i & 7)); });
  return out;
};

describe('encodeGeoTiff', () => {
  const width = 37;
  const height = 23;
  const data = new Float32Array(width * height).map((_, i) => Math.sin(i / 7) * 1234.5 + i * 0.25);
  data[5] = -9999;
  data[6] = -11034.25;
  data[7] = 8848.86;
  const bounds3857 = {left: 9573000.5, top: 3250000.25, pixelSizeX: 30.5, pixelSizeY: 29.75};

  test.each([false, true])('round-trips heights and georeferencing (compress=%s)', compress => {
    const buffer = encodeGeoTiff({width, height, data, bounds3857, noData: -9999, compress});
    const decoded = decodeTiff(buffer);
    expect(decoded.width).toBe(width);
    expect(decoded.height).toBe(height);
    expect(Array.from(decoded.data)).toEqual(Array.from(data));
    expect(decoded.noData).toBe(-9999);
    expect(decoded.geo.epsg).toBe(3857);
    expect(decoded.geo.modelType).toBe('projected');
    expect(decoded.geo.rasterType).toBe('area');
    expect(decoded.geo.geoTransform).toEqual([9573000.5, 30.5, 0, 3250000.25, 0, -29.75]);
  });

  test('deflate output is smaller than uncompressed for smooth terrain', () => {
    const w = 256;
    const smooth = new Float32Array(w * w).map((_, i) => (i % w) * 2 + Math.floor(i / w) * 3);
    const raw = encodeGeoTiff({width: w, height: w, data: smooth, bounds3857, compress: false});
    const packed = encodeGeoTiff({width: w, height: w, data: smooth, bounds3857, compress: true});
    expect(packed.byteLength).toBeLessThan(raw.byteLength / 4);
    expect(Array.from(decodeTiff(packed).data)).toEqual(Array.from(smooth));
  });

  test('splits large images into ~256 KB strips', () => {
    const w = 1000;
    const h = 300;
    const big = new Float32Array(w * h).map((_, i) => i);
    for (const compress of [false, true]) {
      const buffer = encodeGeoTiff({width: w, height: h, data: big, bounds3857, compress});
      const {view, entries} = readIfd(buffer);
      const rowsPerStrip = view.getUint32(entries.find(e => e.tag === 278).field, true);
      expect(rowsPerStrip).toBe(65); // floor(262144 / 4000)
      expect(entries.find(e => e.tag === 273).count).toBe(5);
      expect(entries.find(e => e.tag === 279).count).toBe(5);
      const decoded = decodeTiff(buffer).data;
      expect(decoded[0]).toBe(0);
      expect(decoded[w * h - 1]).toBe(w * h - 1);
      expect(decoded[123456]).toBe(123456);
    }
  });

  test('writes the GeoTIFF 1.1 tags byte for byte', () => {
    const buffer = encodeGeoTiff({width, height, data, bounds3857, noData: -9999, compress: true});
    const bytes = new Uint8Array(buffer);
    expect(Array.from(bytes.subarray(0, 8))).toEqual([0x49, 0x49, 42, 0, 8, 0, 0, 0]);
    const {view, entries, nextIfd} = readIfd(buffer);
    expect(nextIfd).toBe(0);
    const tags = entries.map(e => e.tag);
    expect(tags).toEqual([256, 257, 258, 259, 262, 273, 277, 278, 279, 284, 317, 339, 33550, 33922, 34735, 42113]);
    const short = (tag: number) => {
      const e = entries.find(x => x.tag === tag);
      expect(e.type).toBe(3);
      return view.getUint16(e.field, true);
    };
    const long = (tag: number) => {
      const e = entries.find(x => x.tag === tag);
      expect(e.type).toBe(4);
      return view.getUint32(e.field, true);
    };
    expect(long(256)).toBe(width);
    expect(long(257)).toBe(height);
    expect(short(258)).toBe(32);
    expect(short(259)).toBe(8);
    expect(short(262)).toBe(1);
    expect(short(277)).toBe(1);
    expect(short(284)).toBe(1);
    expect(short(317)).toBe(3);
    expect(short(339)).toBe(3);

    const doubles = (tag: number) => {
      const e = entries.find(x => x.tag === tag);
      expect(e.type).toBe(12);
      const offset = view.getUint32(e.field, true);
      expect(offset % 2).toBe(0);
      return Array.from({length: e.count}, (_, i) => view.getFloat64(offset + i * 8, true));
    };
    expect(doubles(33550)).toEqual([30.5, 29.75, 0]);
    expect(doubles(33922)).toEqual([0, 0, 0, 9573000.5, 3250000.25, 0]);

    const keys = entries.find(e => e.tag === 34735);
    const keyOffset = view.getUint32(keys.field, true);
    expect(Array.from({length: keys.count}, (_, i) => view.getUint16(keyOffset + i * 2, true))).toEqual([
      1, 1, 1, 4,
      1024, 0, 1, 1, // GTModelTypeGeoKey = ModelTypeProjected
      1025, 0, 1, 1, // GTRasterTypeGeoKey = RasterPixelIsArea
      3072, 0, 1, 3857, // ProjectedCSTypeGeoKey
      3076, 0, 1, 9001, // ProjLinearUnitsGeoKey = metre
    ]);

    const noData = entries.find(e => e.tag === 42113);
    expect(noData.type).toBe(2);
    expect(noData.count).toBe(6);
    const noDataOffset = view.getUint32(noData.field, true);
    expect(String.fromCharCode(...Array.from(bytes.subarray(noDataOffset, noDataOffset + 6)))).toBe('-9999\0');

    // Strip data lies inside the file, word aligned
    const offsets = entries.find(e => e.tag === 273);
    const counts = entries.find(e => e.tag === 279);
    expect(offsets.count).toBe(1);
    const stripOffset = view.getUint32(offsets.field, true);
    expect(stripOffset % 2).toBe(0);
    expect(stripOffset + view.getUint32(counts.field, true)).toBe(buffer.byteLength);
  });

  test('omits the predictor and no-data tags when not asked for', () => {
    const buffer = encodeGeoTiff({width, height, data, bounds3857});
    const {view, entries} = readIfd(buffer);
    expect(entries.map(e => e.tag)).not.toContain(317);
    expect(entries.map(e => e.tag)).not.toContain(42113);
    expect(view.getUint16(entries.find(e => e.tag === 259).field, true)).toBe(1);
    expect(decodeTiff(buffer).noData).toBeNull();
  });

  test('round-trips NaN no-data and NaN heights', () => {
    const withNaN = data.slice();
    withNaN[3] = NaN;
    const decoded = decodeTiff(encodeGeoTiff({width, height, data: withNaN, bounds3857, noData: NaN, compress: true}));
    expect(decoded.noData).toBeNaN();
    expect(decoded.data[3]).toBeNaN();
    expect(decoded.data[4]).toBe(withNaN[4]);
  });

  test('rejects data that is too short', () => {
    expect(() => encodeGeoTiff({width: 4, height: 4, data: new Float32Array(15), bounds3857})).toThrow(/4×4/);
  });
});

describe('lzwDecode', () => {
  test('decodes the TIFF 6.0 specification example', () => {
    // 7 7 7 8 8 7 7 6 6  ->  Clear 7 258 8 8 258 6 6 EOI, all 9 bits
    const codes = [256, 7, 258, 8, 8, 258, 6, 6, 257];
    const input = packCodes(codes, codes.map(() => 9));
    expect(Array.from(lzwDecode(input, 9))).toEqual([7, 7, 7, 8, 8, 7, 7, 6, 6]);
  });

  test('handles a code that refers to the entry being built (KwKwK)', () => {
    const codes = [256, 65, 258, 257];
    expect(Array.from(lzwDecode(packCodes(codes, [9, 9, 9, 9]), 3))).toEqual([65, 65, 65]);
  });

  test('switches to 10-bit codes once the table reaches 511 entries', () => {
    // Every code after the first adds an entry; distinct pairs keep the table growing
    const codes = [256];
    const widths = [9];
    const expected: number[] = [];
    let next = 258;
    let width = 9;
    for (let i = 0; i < 300; i++) {
      const byte = i % 256;
      codes.push(byte);
      widths.push(width);
      expected.push(byte);
      if (i > 0) {
        next++;
        if (next >= 511 && width === 9) width = 10;
      }
    }
    codes.push(257);
    widths.push(width);
    expect(width).toBe(10);
    expect(Array.from(lzwDecode(packCodes(codes, widths), expected.length))).toEqual(expected);
  });

  test('decodes a long GDAL-written strip with 12-bit codes and table resets', () => {
    const decoded = decodeTiff(fixture('u8_lzw_long'));
    expect(decoded.width).toBe(120);
    expect(decoded.height).toBe(100);
    // Same LCG as the generator
    let seed = 12345;
    for (let i = 0; i < 120 * 100; i++) {
      seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
      const expected = Math.floor(seed / 65536) % 13;
      if (decoded.data[i] !== expected) throw new Error(`pixel ${i} = ${decoded.data[i]}, expected ${expected}`);
    }
  });
});

describe('packBitsDecode', () => {
  test('decodes literal and repeat runs', () => {
    // From Apple's PackBits technote
    const input = Uint8Array.from([0xfe, 0xaa, 0x02, 0x80, 0x00, 0x2a, 0xfd, 0xaa, 0x03, 0x80, 0x00, 0x2a, 0x22, 0xf7, 0xaa]);
    expect(Array.from(packBitsDecode(input, 24))).toEqual([
      0xaa, 0xaa, 0xaa, 0x80, 0x00, 0x2a, 0xaa, 0xaa, 0xaa, 0xaa, 0x80, 0x00, 0x2a, 0x22,
      0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa,
    ]);
  });
});

describe('decodeTiff on GDAL-written files', () => {
  const geo4326 = [86, 0.01, 0, 28, 0, -0.01];

  test('float32, LZW + floating-point predictor, big-endian, 16×16 tiles', () => {
    const d = decodeTiff(fixture('f32_lzw_p3_be_tiled'));
    expect([d.width, d.height]).toEqual([W, H]);
    expectGrid(d.data, fval, W + 2);
    expect(d.data[W + 2]).toBe(-9999);
    expect(d.noData).toBe(-9999);
    expect(d.geo.epsg).toBe(4326);
    expect(d.geo.modelType).toBe('geographic');
    expect(d.geo.geoTransform.map(v => +v.toFixed(9))).toEqual(geo4326);
  });

  test('float32, Deflate + floating-point predictor, little-endian strips', () => {
    expectGrid(decodeTiff(fixture('f32_deflate_p3_le')).data, fval);
  });

  test('int16, Deflate + horizontal predictor, EPSG:3857', () => {
    const d = decodeTiff(fixture('i16_deflate_p2_le'));
    expectGrid(d.data, ival, W + 2);
    expect(d.data[W + 2]).toBe(-32768);
    expect(d.noData).toBe(-32768);
    expect(d.geo.epsg).toBe(3857);
    expect(d.geo.modelType).toBe('projected');
    expect(d.geo.geoTransform).toEqual([9573000, 30, 0, 3250000, 0, -30]);
  });

  test('uint16, LZW + horizontal predictor, big-endian', () => {
    expectGrid(decodeTiff(fixture('u16_lzw_p2_be')).data, uval);
  });

  test('int32, PackBits, big-endian', () => {
    expectGrid(decodeTiff(fixture('i32_packbits_be')).data, ival);
  });

  test('float64, uncompressed, big-endian, PixelIsPoint', () => {
    const d = decodeTiff(fixture('f64_none_be_point'));
    expectGrid(d.data, fval);
    expect(d.geo.rasterType).toBe('point');
    // GDAL stores the centre of the first pixel; we report its corner, as GDAL does
    expect(d.geo.geoTransform.map(v => +v.toFixed(9))).toEqual(geo4326);
  });

  test('3-band pixel-interleaved bytes: takes the first band', () => {
    const d = decodeTiff(fixture('u8_3band_pixel'));
    expectGrid(d.data, bval);
  });

  test('3-band band-interleaved tiles: takes the first band', () => {
    const d = decodeTiff(fixture('u8_3band_band_tiled'));
    expectGrid(d.data, bval);
  });

  test('BigTIFF with Deflate', () => {
    const d = decodeTiff(fixture('f32_bigtiff_deflate'));
    expectGrid(d.data, fval);
    expect(d.geo.epsg).toBe(4326);
  });

  test('rejects JPEG compression with a helpful message', () => {
    expect(() => decodeTiff(fixture('u8_jpeg'))).toThrow(/JPEG.*isn't supported.*Deflate/);
  });
});

describe('decodeTiff on hand-made files', () => {
  test('big-endian int16 with horizontal predictor, ModelTransformation and GeoAsciiParams', () => {
    const width = 5;
    const height = 3;
    const values = [10, 12, 15, 11, -4, 100, 101, 99, 98, 300, -32768, 0, 1, 2, 3];
    // Predictor 2: store each row's differences
    const strip = new Uint8Array(width * height * 2);
    const view = new DataView(strip.buffer);
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const i = r * width + c;
        const diff = c === 0 ? values[i] : values[i] - values[i - 1];
        view.setInt16(i * 2, diff, false);
      }
    }
    const buffer = buildTiff(false, [
      {tag: 256, type: 3, values: [width]},
      {tag: 257, type: 3, values: [height]},
      {tag: 258, type: 3, values: [16]},
      {tag: 259, type: 3, values: [1]},
      {tag: 262, type: 3, values: [1]},
      {tag: 273, type: 4, values: [0]},
      {tag: 277, type: 3, values: [1]},
      {tag: 278, type: 3, values: [height]},
      {tag: 279, type: 4, values: [strip.length]},
      {tag: 317, type: 3, values: [2]},
      {tag: 339, type: 3, values: [2]},
      {tag: 34264, type: 12, values: [2, 0, 0, 1000, 0, -2, 0, 5000, 0, 0, 0, 0, 0, 0, 0, 1]},
      {tag: 34735, type: 3, values: [
        1, 1, 0, 4,
        1024, 0, 1, 1,
        1026, 34737, 12, 0,
        3072, 0, 1, 32767,
        3076, 34736, 1, 0, // nonsense location, just to check doubles resolve
      ]},
      {tag: 34736, type: 12, values: [0.3048]},
      {tag: 34737, type: 2, values: 'My own CRS|'},
      {tag: 42113, type: 2, values: '-32768'},
    ], [strip]);
    expect(isTiff(buffer)).toBe(true);
    const d = decodeTiff(buffer);
    expect(Array.from(d.data)).toEqual(values);
    expect(d.noData).toBe(-32768);
    expect(d.geo.geoTransform).toEqual([1000, 2, 0, 5000, 0, -2]);
    expect(d.geo.epsg).toBeNull(); // user-defined
    expect(d.geo.modelType).toBe('projected');
    expect(d.geo.citation).toBe('My own CRS');
    expect(d.geo.geoKeys[3076]).toBe(0.3048);
  });

  test('big-endian float32 with floating-point predictor, two strips', () => {
    const width = 3;
    const values = [1.5, -2.25, 1000.125, 0, 3.4e38, -7, 8848.5, 1, 2];
    const rows = [values.slice(0, 6), values.slice(6)];
    // Floating-point predictor: byte planes (MSB first) per row, then byte differences
    const strips = rows.map(rowValues => {
      const out = new Uint8Array(rowValues.length * 4);
      for (let r = 0; r < rowValues.length / width; r++) {
        const plane = new Uint8Array(width * 4);
        for (let c = 0; c < width; c++) {
          const b = new Uint8Array(4);
          new DataView(b.buffer).setFloat32(0, rowValues[r * width + c], false);
          for (let k = 0; k < 4; k++) plane[k * width + c] = b[k];
        }
        for (let i = plane.length - 1; i > 0; i--) plane[i] = (plane[i] - plane[i - 1]) & 0xff;
        out.set(plane, r * width * 4);
      }
      return out;
    });
    const buffer = buildTiff(false, [
      {tag: 256, type: 4, values: [width]},
      {tag: 257, type: 4, values: [3]},
      {tag: 258, type: 3, values: [32]},
      {tag: 259, type: 3, values: [1]},
      {tag: 273, type: 4, values: [0, 0]},
      {tag: 278, type: 4, values: [2]},
      {tag: 279, type: 4, values: strips.map(s => s.length)},
      {tag: 317, type: 3, values: [3]},
      {tag: 339, type: 3, values: [3]},
    ], strips);
    const d = decodeTiff(buffer);
    expect(Array.from(d.data)).toEqual(values.map(Math.fround));
    expect(d.geo.geoTransform).toBeNull();
    expect(d.noData).toBeNull();
  });

  test('little-endian uint8 with tiepoint not at the origin', () => {
    const buffer = buildTiff(true, [
      {tag: 256, type: 3, values: [2]},
      {tag: 257, type: 3, values: [2]},
      {tag: 258, type: 3, values: [8]},
      {tag: 273, type: 4, values: [0]},
      {tag: 279, type: 4, values: [4]},
      {tag: 33550, type: 12, values: [0.5, 0.25, 0]},
      {tag: 33922, type: 12, values: [1, 1, 0, 10, 20, 0]},
      {tag: 34735, type: 3, values: [1, 1, 0, 2, 1024, 0, 1, 2, 2048, 0, 1, 4269]},
    ], [Uint8Array.from([1, 2, 3, 4])]);
    const d = decodeTiff(buffer);
    expect(Array.from(d.data)).toEqual([1, 2, 3, 4]);
    expect(d.geo.epsg).toBe(4269);
    expect(d.geo.modelType).toBe('geographic');
    expect(d.geo.geoTransform).toEqual([9.5, 0.5, 0, 20.25, 0, -0.25]);
  });

  test('rejects things that are not TIFFs or not supported', () => {
    expect(() => decodeTiff(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer)).toThrow(/Not a TIFF/);
    expect(isTiff(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBe(false);
    const half = buildTiff(true, [
      {tag: 256, type: 3, values: [1]},
      {tag: 257, type: 3, values: [1]},
      {tag: 258, type: 3, values: [16]},
      {tag: 273, type: 4, values: [0]},
      {tag: 279, type: 4, values: [2]},
      {tag: 339, type: 3, values: [3]},
    ], [new Uint8Array(2)]);
    expect(() => decodeTiff(half)).toThrow(/16-bit floating-point/);
    const lerc = buildTiff(true, [
      {tag: 256, type: 3, values: [1]},
      {tag: 257, type: 3, values: [1]},
      {tag: 258, type: 3, values: [32]},
      {tag: 259, type: 3, values: [34887]},
      {tag: 273, type: 4, values: [0]},
      {tag: 279, type: 4, values: [4]},
      {tag: 339, type: 3, values: [3]},
    ], [new Uint8Array(4)]);
    expect(() => decodeTiff(lerc)).toThrow(/LERC/);
  });
});

/*
 * Fixtures written by GDAL 3 (osgeo.gdal, GTiff driver) on a 20 × 18 grid,
 * geotransform [86, 0.01, 0, 28, 0, -0.01] in EPSG:4326 unless noted:
 *   float:  r * 100 + c * 1.5 - 50     int16/int32: r * 1000 + c * 7 - 300
 *   uint16: r * 1000 + c * 7           uint8: (r * 7 + c) % 200 (+3 per extra band)
 * Pixel (2, 1) holds the no-data value where one is set. i16_deflate_p2_le is
 * EPSG:3857 with geotransform [9573000, 30, 0, 3250000, 0, -30]. u8_lzw_long
 * is 120 × 100 bytes from an LCG (seed 12345, glibc constants, (s >> 16) % 13).
 */
const FIXTURES: {[name: string]: string} = {
  f32_bigtiff_deflate:
    'SUkrAAgAAAAQAAAAAAAAABEAAAAAAAAAAAEDAAEAAAAAAAAAFAAAAAAAAAABAQMAAQAAAAAAAAASAAAAAAAAAAIBAwABAAAAAAAAACAAAAAAAAAAAwEDAAEA' +
    'AAAAAAAACAAAAAAAAAAGAQMAAQAAAAAAAAABAAAAAAAAABEBEAABAAAAAAAAAAwCAAAAAAAAFQEDAAEAAAAAAAAAAQAAAAAAAAAWAQMAAQAAAAAAAAASAAAA' +
    'AAAAABcBEAABAAAAAAAAAGYCAAAAAAAAHAEDAAEAAAAAAAAAAQAAAAAAAAA9AQMAAQAAAAAAAAABAAAAAAAAAFMBAwABAAAAAAAAAAMAAAAAAAAADoMMAAMA' +
    'AAAAAAAAdAEAAAAAAACChAwABgAAAAAAAACMAQAAAAAAAK+HAwAgAAAAAAAAALwBAAAAAAAAsIcMAAIAAAAAAAAA/AEAAAAAAACxhwIACAAAAAAAAABXR1Mg' +
    'ODR8AAAAAAAAAAAAexSuR+F6hD97FK5H4XqEPwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAVUAAAAAAAAA8QAAAAAAAAAAAAQABAAAA' +
    'BwAABAAAAQACAAEEAAABAAEAAAgAAAEA5hABCLGHBwAAAAYIAAABAI4jCQiwhwEAAQALCLCHAQAAAIhtdJYdpHJAAAAAQKZUWEF4nA3Ny6+dUxgG8HckQbFj' +
    '4BaXld60CGVgoljO2YOOxKComnwjI5dPGQjRLG1PlSbsIpGI8g1dmthK2+OWrFZN+To3WHWpuu+BP8Bv8MuTJ8+7siK2nYpYYit3soWbWM/1XMXlrOECgv9O' +
    'RpznR0ZOs8oRti1F3M92dtLxGI+zi+fYzR5WOMBBXuMQb/E273CYK5ajXLkccbW8Rl4rr5M3yCTXynVyg9woN8nN8mZ5i7xV3iZvl3fI5+UL8kW5W5blqJSX' +
    'liPv0ffqlH36ir5fp7ysH9Bf0Smv6gf1T3TKXP9UP6pTPtM/14/plOP6CX1Vp3yhf6l/pVO+1r/Rz+qUn/Sf9V90yq/6Of03nXJe/13/Q6f8qf+l/61T/tH/' +
    'lRdOo5EvmsZAXDyNjkpaM41CI19iJy61U0mX2WnkiZ2yViev04n17qmkDXYaeaOduNFOJW2y08ib7ZS7dPJWnbjbPZV0j51GvtdOZDuVdJ+dRl6yU7br5Ad1' +
    '4iH3VNLDdhp5h514xE4l7bTTyI/aKU/o5Cd14in3VFJvp5GfthO77FTSM3Ya+Vk7ee80egZGYt80ttAxo7IgrUzjAQpzGpP93tMzMFJfd0+auacwpzE55J6e' +
    'gZF4w390zKgsSG96T37XPQMjcdg9HTMqC9J77inMaUze956egZH6gXvSh+4pzGlMPnJPz8BIfOw/OmZUFqQj3pOPuWdgJI67p2NGZUE64Z7CnMZk1Xt6Bkbq' +
    'SfekU+4pzGlMvnVPz8BInPYfHTMqC9J33pO/d8/ASPzgno4ZlQVpdE9hTmNyxnt6BsYz0/8B9tapew==',
  f32_deflate_p3_le:
    'SUkqAAgAAAARAAABAwABAAAAFAAAAAEBAwABAAAAEgAAAAIBAwABAAAAIAAAAAMBAwABAAAACAAAAAYBAwABAAAAAQAAABEBBAAEAAAA4gAAABUBAwABAAAA' +
    'AQAAABYBAwABAAAABQAAABcBAwAEAAAA2gAAABwBAwABAAAAAQAAAD0BAwABAAAAAwAAAFMBAwABAAAAAwAAAA6DDAADAAAA8gAAAIKEDAAGAAAACgEAAK+H' +
    'AwAgAAAAOgEAALCHDAACAAAAegEAALGHAgAIAAAAigEAAAAAAABPAD8ARQAwAJIBAADhAQAAIAIAAGUCAAB7FK5H4XqEP3sUrkfheoQ/AAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIBVQAAAAAAAADxAAAAAAAAAAAABAAEAAAAHAAAEAAABAAIAAQQAAAEAAQAACAAAAQDmEAEIsYcHAAAABggAAAEA' +
    'jiMJCLCHAQABAAsIsIcBAAAAiG10lh2kckAAAABAplRYQVdHUyA4NHwAeJw7xIAE/kOo9l9I4AsEhDAQB5ywiLHBAQszDCQTaZ4zFrHLjEwY8FwDFkCkeeYg' +
    'ExgYGRmRcClI/wE0QKR5OWhmgbAzulk4zAMANTBBAXicc2bABPMYGBkZ0bDgASwAi14XLGJHGYAmMEAQjC5IwAKINO8eFvPCKTDvOxbz7CgwTwCLeapEmgcA' +
    'e9QzAXicc2HABJoMjEAIQTCaJwELwKLXBYuYPQPYEBgJJnYZYAFEmueNZA7MXF0sxm0g0rwILO5bSIH7UrC4T4RI9wEAFU0cAXicc2HABIVAzAhmMcKJDgMs' +
    'AIteFyxitUjmwMz9jcW4DUSa14XFfflEug8APuAQAQ==',
  f32_lzw_p3_be_tiled:
    'TU0AKgAABCYAEgEAAAMAAAABABQAAAEBAAMAAAABABIAAAECAAMAAAABACAAAAEDAAMAAAABAAUAAAEGAAMAAAABAAEAAAEVAAMAAAABAAEAAAEcAAMAAAAB' +
    'AAEAAAE9AAMAAAABAAMAAAFCAAMAAAABABAAAAFDAAMAAAABABAAAAFEAAQAAAAEAAAA7gFFAAMAAAAEAAAA5gFTAAMAAAABAAMAAIMOAAwAAAADAAAA/oSC' +
    'AAwAAAAGAAABFoevAAMAAAAgAAABRoewAAwAAAACAAABhoexAAIAAAAIAAABlgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/hHrhR64Uez+EeuFHrhR7' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAVYAAAAAAAEA8AAAAAAAAAAAAAAAAAAAAAQABAAAABwQAAAAAAQACBAEAAAABAAEIAAAAAAEQ5ggB' +
    'h7EABwAACAYAAAABI44ICYewAAEAAQgLh7AAAQAAQHKkHZZ0bYhBWFSmQAAAAFdHUyA4NHwAgDCAEDgkFgb/gaHfULhkNhb0iAkg0TikVgxCACEPkWggGAzO' +
    'H0ekQGAgDk0mN4AHjEjktihDl0EaYBAU0m01nE2aiAnk9n0/QExgcwoQ3m4AANJpFKpJ4nzAqFRqVQoQAokxNlLANarlJI1TsFTqtXlyertMtAUsNrYFVIlV' +
    'YtIuVzrdbpBxMF5vV7vjgt1Vb1yu2DuhYvmHvd+oVvoT3wUDwmDH+IymKmOMmIQx90ugmymIy0uzEuFObyOQBufw+hlujlo/gl22MFAK6GG33G53Twv9CJdz' +
    'yG0ggu3XF3Jw3sxLGz4WxUPG6G8xdVMnA62yCvQ43I6dCOPM8FIRHa4vSmMBgDBAEDH8Dg0HgbQekLKkIh0PiERiBCgy+iQASgDjRji8dj0PIcGXsXFwBAQB' +
    'Z0dQErQEfj0hgcjiSJAABAJ1jrAnTAl0dmAAmURXc1AM/iM7nk9iU/oMQdtECM5ndKiREgy8i4PmoAeEXQBgsBgqkRq0DrESFFba9esNiscPsoAs8RINbi0S' +
    'r9ht9wq8XLVbUtsvV7hFxucQOdbRmCsGEwt9iSGgx6i5AGGXGGOg+Gi6SrZti7AzCwzUGzkST8GMOVzGZ0oA08RVdbhsS0WX0mv2MQXEGJGszGvAEBCAEQAQ' +
    'OCQWDH0AAGCwqCQwAPwYRGJROKHCDReCwKMRhFQ2DQ6Em+KSOJvCNyeUSmVSuWS2XS+YTGZTOaTWbTecTmdTueT2fT+gUGhUOiUWjUekUKAggBEAEDXkDg0H' +
    'gbEAABAA7hEPYAwiSwh8Vi0PgUEi8DaMGF8bABAiUSkElk0nlEplUrlktl0vmExmUzmk1m03nE5nU7nk9n0/oFBoVDok5gIAABMBAAADAAAAAQAUAAABAQAD' +
    'AAAAAQASAAABAgADAAAAAQAgAAABAwADAAAAAQAFAAABBgADAAAAAQABAAABFQADAAAAAQABAAABHAADAAAAAQABAAABPQADAAAAAQADAAABQgADAAAAAQAQ' +
    'AAABQwADAAAAAQAQAAABRAAEAAAABAAABRgBRQADAAAABAAABRABUwADAAAAAQADAACDDgAMAAAAAwAABSiEggAMAAAABgAABUCHrwADAAAAIAAABXCHsAAM' +
    'AAAAAgAABbCHsQACAAAACAAABcCkgQACAAAABgAABcgAAAAAAQUA3QBVAFAAAAGeAAACowAAA4AAAAPVP4R64UeuFHs/hHrhR64UewAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAQFWAAAAAAABAPAAAAAAAAAAAAAAAAAAAAAEAAQAAAAcEAAAAAAEAAgQBAAAAAQABCAAAAAABEOYIAYexAAcAAAgGAAAAASOO' +
    'CAmHsAABAAEIC4ewAAEAAEBypB2WdG2IQVhUpkAAAABXR1MgODR8AC05OTk5AA==',
  f64_none_be_point:
    'TU0AKgAAAAgAEAEAAAMAAAABABQAAAEBAAMAAAABABIAAAECAAMAAAABAEAAAAEDAAMAAAABAAEAAAEGAAMAAAABAAEAAAERAAQAAAABAAABbgEVAAMAAAAB' +
    'AAEAAAEWAAMAAAABABIAAAEXAAQAAAABAAALQAEcAAMAAAABAAEAAAFTAAMAAAABAAMAAIMOAAwAAAADAAAAzoSCAAwAAAAGAAAA5oevAAMAAAAgAAABFoew' +
    'AAwAAAACAAABVoexAAIAAAAIAAABZgAAAAA/hHrhR64Uez+EeuFHrhR7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAVYBR64UeuEA7/rhR64Uf' +
    'AAAAAAAAAAAAAQABAAAABwQAAAAAAQACBAEAAAABAAIIAAAAAAEQ5ggBh7EABwAACAYAAAABI44ICYewAAEAAQgLh7AAAQAAQHKkHZZ0bYhBWFSmQAAAAFdH' +
    'UyA4NHwAwEkAAAAAAADASEAAAAAAAMBHgAAAAAAAwEbAAAAAAADARgAAAAAAAMBFQAAAAAAAwESAAAAAAADAQ8AAAAAAAMBDAAAAAAAAwEJAAAAAAADAQYAA' +
    'AAAAAMBAwAAAAAAAwEAAAAAAAADAPoAAAAAAAMA9AAAAAAAAwDuAAAAAAADAOgAAAAAAAMA4gAAAAAAAwDcAAAAAAADANYAAAAAAAEBJAAAAAAAAQEnAAAAA' +
    'AABASoAAAAAAAEBLQAAAAAAAQEwAAAAAAABATMAAAAAAAEBNgAAAAAAAQE5AAAAAAABATwAAAAAAAEBPwAAAAAAAQFBAAAAAAABAUKAAAAAAAEBRAAAAAAAA' +
    'QFFgAAAAAABAUcAAAAAAAEBSIAAAAAAAQFKAAAAAAABAUuAAAAAAAEBTQAAAAAAAQFOgAAAAAABAYsAAAAAAAEBi8AAAAAAAQGMgAAAAAABAY1AAAAAAAEBj' +
    'gAAAAAAAQGOwAAAAAABAY+AAAAAAAEBkEAAAAAAAQGRAAAAAAABAZHAAAAAAAEBkoAAAAAAAQGTQAAAAAABAZQAAAAAAAEBlMAAAAAAAQGVgAAAAAABAZZAA' +
    'AAAAAEBlwAAAAAAAQGXwAAAAAABAZiAAAAAAAEBmUAAAAAAAQG9AAAAAAABAb3AAAAAAAEBvoAAAAAAAQG/QAAAAAABAcAAAAAAAAEBwGAAAAAAAQHAwAAAA' +
    'AABAcEgAAAAAAEBwYAAAAAAAQHB4AAAAAABAcJAAAAAAAEBwqAAAAAAAQHDAAAAAAABAcNgAAAAAAEBw8AAAAAAAQHEIAAAAAABAcSAAAAAAAEBxOAAAAAAA' +
    'QHFQAAAAAABAcWgAAAAAAEB14AAAAAAAQHX4AAAAAABAdhAAAAAAAEB2KAAAAAAAQHZAAAAAAABAdlgAAAAAAEB2cAAAAAAAQHaIAAAAAABAdqAAAAAAAEB2' +
    'uAAAAAAAQHbQAAAAAABAdugAAAAAAEB3AAAAAAAAQHcYAAAAAABAdzAAAAAAAEB3SAAAAAAAQHdgAAAAAABAd3gAAAAAAEB3kAAAAAAAQHeoAAAAAABAfCAA' +
    'AAAAAEB8OAAAAAAAQHxQAAAAAABAfGgAAAAAAEB8gAAAAAAAQHyYAAAAAABAfLAAAAAAAEB8yAAAAAAAQHzgAAAAAABAfPgAAAAAAEB9EAAAAAAAQH0oAAAA' +
    'AABAfUAAAAAAAEB9WAAAAAAAQH1wAAAAAABAfYgAAAAAAEB9oAAAAAAAQH24AAAAAABAfdAAAAAAAEB96AAAAAAAQIEwAAAAAABAgTwAAAAAAECBSAAAAAAA' +
    'QIFUAAAAAABAgWAAAAAAAECBbAAAAAAAQIF4AAAAAABAgYQAAAAAAECBkAAAAAAAQIGcAAAAAABAgagAAAAAAECBtAAAAAAAQIHAAAAAAABAgcwAAAAAAECB' +
    '2AAAAAAAQIHkAAAAAABAgfAAAAAAAECB/AAAAAAAQIIIAAAAAABAghQAAAAAAECEUAAAAAAAQIRcAAAAAABAhGgAAAAAAECEdAAAAAAAQISAAAAAAABAhIwA' +
    'AAAAAECEmAAAAAAAQISkAAAAAABAhLAAAAAAAECEvAAAAAAAQITIAAAAAABAhNQAAAAAAECE4AAAAAAAQITsAAAAAABAhPgAAAAAAECFBAAAAAAAQIUQAAAA' +
    'AABAhRwAAAAAAECFKAAAAAAAQIU0AAAAAABAh3AAAAAAAECHfAAAAAAAQIeIAAAAAABAh5QAAAAAAECHoAAAAAAAQIesAAAAAABAh7gAAAAAAECHxAAAAAAA' +
    'QIfQAAAAAABAh9wAAAAAAECH6AAAAAAAQIf0AAAAAABAiAAAAAAAAECIDAAAAAAAQIgYAAAAAABAiCQAAAAAAECIMAAAAAAAQIg8AAAAAABAiEgAAAAAAECI' +
    'VAAAAAAAQIqQAAAAAABAipwAAAAAAECKqAAAAAAAQIq0AAAAAABAisAAAAAAAECKzAAAAAAAQIrYAAAAAABAiuQAAAAAAECK8AAAAAAAQIr8AAAAAABAiwgA' +
    'AAAAAECLFAAAAAAAQIsgAAAAAABAiywAAAAAAECLOAAAAAAAQItEAAAAAABAi1AAAAAAAECLXAAAAAAAQItoAAAAAABAi3QAAAAAAECNsAAAAAAAQI28AAAA' +
    'AABAjcgAAAAAAECN1AAAAAAAQI3gAAAAAABAjewAAAAAAECN+AAAAAAAQI4EAAAAAABAjhAAAAAAAECOHAAAAAAAQI4oAAAAAABAjjQAAAAAAECOQAAAAAAA' +
    'QI5MAAAAAABAjlgAAAAAAECOZAAAAAAAQI5wAAAAAABAjnwAAAAAAECOiAAAAAAAQI6UAAAAAABAkGgAAAAAAECQbgAAAAAAQJB0AAAAAABAkHoAAAAAAECQ' +
    'gAAAAAAAQJCGAAAAAABAkIwAAAAAAECQkgAAAAAAQJCYAAAAAABAkJ4AAAAAAECQpAAAAAAAQJCqAAAAAABAkLAAAAAAAECQtgAAAAAAQJC8AAAAAABAkMIA' +
    'AAAAAECQyAAAAAAAQJDOAAAAAABAkNQAAAAAAECQ2gAAAAAAQJH4AAAAAABAkf4AAAAAAECSBAAAAAAAQJIKAAAAAABAkhAAAAAAAECSFgAAAAAAQJIcAAAA' +
    'AABAkiIAAAAAAECSKAAAAAAAQJIuAAAAAABAkjQAAAAAAECSOgAAAAAAQJJAAAAAAABAkkYAAAAAAECSTAAAAAAAQJJSAAAAAABAklgAAAAAAECSXgAAAAAA' +
    'QJJkAAAAAABAkmoAAAAAAECTiAAAAAAAQJOOAAAAAABAk5QAAAAAAECTmgAAAAAAQJOgAAAAAABAk6YAAAAAAECTrAAAAAAAQJOyAAAAAABAk7gAAAAAAECT' +
    'vgAAAAAAQJPEAAAAAABAk8oAAAAAAECT0AAAAAAAQJPWAAAAAABAk9wAAAAAAECT4gAAAAAAQJPoAAAAAABAk+4AAAAAAECT9AAAAAAAQJP6AAAAAABAlRgA' +
    'AAAAAECVHgAAAAAAQJUkAAAAAABAlSoAAAAAAECVMAAAAAAAQJU2AAAAAABAlTwAAAAAAECVQgAAAAAAQJVIAAAAAABAlU4AAAAAAECVVAAAAAAAQJVaAAAA' +
    'AABAlWAAAAAAAECVZgAAAAAAQJVsAAAAAABAlXIAAAAAAECVeAAAAAAAQJV+AAAAAABAlYQAAAAAAECVigAAAAAAQJaoAAAAAABAlq4AAAAAAECWtAAAAAAA' +
    'QJa6AAAAAABAlsAAAAAAAECWxgAAAAAAQJbMAAAAAABAltIAAAAAAECW2AAAAAAAQJbeAAAAAABAluQAAAAAAECW6gAAAAAAQJbwAAAAAABAlvYAAAAAAECW' +
    '/AAAAAAAQJcCAAAAAABAlwgAAAAAAECXDgAAAAAAQJcUAAAAAABAlxoAAAAAAECYOAAAAAAAQJg+AAAAAABAmEQAAAAAAECYSgAAAAAAQJhQAAAAAABAmFYA' +
    'AAAAAECYXAAAAAAAQJhiAAAAAABAmGgAAAAAAECYbgAAAAAAQJh0AAAAAABAmHoAAAAAAECYgAAAAAAAQJiGAAAAAABAmIwAAAAAAECYkgAAAAAAQJiYAAAA' +
    'AABAmJ4AAAAAAECYpAAAAAAAQJiqAAAAAABAmcgAAAAAAECZzgAAAAAAQJnUAAAAAABAmdoAAAAAAECZ4AAAAAAAQJnmAAAAAABAmewAAAAAAECZ8gAAAAAA' +
    'QJn4AAAAAABAmf4AAAAAAECaBAAAAAAAQJoKAAAAAABAmhAAAAAAAECaFgAAAAAAQJocAAAAAABAmiIAAAAAAECaKAAAAAAAQJouAAAAAABAmjQAAAAAAECa' +
    'OgAAAAAA',
  i16_deflate_p2_le:
    'SUkqABoCAAAQAAABAwABAAAAFAAAAAEBAwABAAAAEgAAAAIBAwABAAAAEAAAAAMBAwABAAAACAAAAAYBAwABAAAAAQAAABEBBAAFAAAA2AAAABUBAwABAAAA' +
    'AQAAABYBAwABAAAABAAAABcBAwAFAAAAzgAAABwBAwABAAAAAQAAAD0BAwABAAAAAgAAAFMBAwABAAAAAgAAAA6DDAADAAAA7AAAAIKEDAAGAAAABAEAAK+H' +
    'AwAgAAAANAEAALGHAgAhAAAAdAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+QAAAAAAAAD5AAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAUUJiQQAAAACoy0hBAAAAAAAAAAABAAEAAAAHAAAEAAABAAEAAQQAAAEAAQACBLGHGQAAAAEIsYcHABkABggAAAEAjiMADAAA' +
    'AQARDwQMAAABACkjV0dTIDg0IC8gUHNldWRvLU1lcmNhdG9yfFdHUyA4NHwAeJy78o+dgRi4h4mdwbb2YhMhdUvYiDOvh4s4dQBS0gfkeJwr4WNnIAbGCBGn' +
    'zkWMOHU6UsSpAwBSfwOleJwTkWNnIAb+USRO3RNV4tSd0SROHQDEUgVieJzbosvOQAycY0icuhZT4tTlWBKnDgDmcwUheJwLsWVnIAbaOBKnDgBqOgIZABEA' +
    'AAEDAAEAAAAUAAAAAQEDAAEAAAASAAAAAgEDAAEAAAAQAAAAAwEDAAEAAAAIAAAABgEDAAEAAAABAAAAEQEEAAUAAAD2AgAAFQEDAAEAAAABAAAAFgEDAAEA' +
    'AAAEAAAAFwEDAAUAAADsAgAAHAEDAAEAAAABAAAAPQEDAAEAAAACAAAAUwEDAAEAAAACAAAADoMMAAMAAAAKAwAAgoQMAAYAAAAiAwAAr4cDACAAAABSAwAA' +
    'sYcCACEAAACSAwAAgaQCAAcAAAC0AwAAAAAAACEAGwAbABsAEgCVAQAAtgEAANEBAADsAQAABwIAAAAAAAAAAD5AAAAAAAAAPkAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAABRQmJBAAAAAKjLSEEAAAAAAAAAAAEAAQAAAAcAAAQAAAEAAQABBAAAAQABAAIEsYcZAAAAAQixhwcAGQAGCAAAAQCOIwAM' +
    'AAABABEPBAwAAAEAKSNXR1MgODQgLyBQc2V1ZG8tTWVyY2F0b3J8V0dTIDg0fAAALTMyNzY4AA==',
  i32_packbits_be:
    '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',
  u16_lzw_p2_be:
    'TU0AKgAAAAgAEQEAAAMAAAABABQAAAEBAAMAAAABABIAAAECAAMAAAABABAAAAEDAAMAAAABAAUAAAEGAAMAAAABAAEAAAERAAQAAAABAAABegEVAAMAAAAB' +
    'AAEAAAEWAAMAAAABABIAAAEXAAQAAAABAAAAbwEcAAMAAAABAAEAAAE9AAMAAAABAAIAAAFTAAMAAAABAAEAAIMOAAwAAAADAAAA2oSCAAwAAAAGAAAA8oev' +
    'AAMAAAAgAAABIoewAAwAAAACAAABYoexAAIAAAAIAAABcgAAAAA/hHrhR64Uez+EeuFHrhR7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAVYAA' +
    'AAAAAEA8AAAAAAAAAAAAAAAAAAAAAQABAAAABwQAAAAAAQACBAEAAAABAAEIAAAAAAEQ5ggBh7EABwAACAYAAAABI44ICYewAAEAAQgLh7AAAQAAQHKkHZZ0' +
    'bYhBWFSmQAAAAFdHUyA4NHwAgAAgQHAEEg0FhEHhUJhkLA4DdENiUOicVA4HaEWjUUjgLXEbkEchIPUEhk0cCaIk8rhQXOEsmAHDZYmMsD5AmsihwjFE5k4n' +
    'CE+nUJFT4oUhFzgo9DA4yZFLjY2WFQnQ6TFUiw+QFYjhCNFcicBA',
  u8_3band_band_tiled:
    'SUkqAAgAAAARAAABAwABAAAAFAAAAAEBAwABAAAAEgAAAAIBAwADAAAA2gAAAAMBAwABAAAAAQAAAAYBAwABAAAAAgAAABUBAwABAAAAAwAAABwBAwABAAAA' +
    'AgAAAEIBAwABAAAAEAAAAEMBAwABAAAAEAAAAEQBBAAMAAAA+AAAAEUBAwAMAAAA4AAAAFMBAwADAAAAKAEAAA6DDAADAAAALgEAAIKEDAAGAAAARgEAAK+H' +
    'AwAgAAAAdgEAALCHDAACAAAAtgEAALGHAgAIAAAAxgEAAAAAAAAIAAgACAAAAQABAAEAAQABAAEAAQABAAEAAQABAAHOAQAAzgIAAM4DAADOBAAAzgUAAM4G' +
    'AADOBwAAzggAAM4JAADOCgAAzgsAAM4MAAABAAEAAQB7FK5H4XqEP3sUrkfheoQ/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIBVQAAA' +
    'AAAAADxAAAAAAAAAAAABAAEAAAAHAAAEAAABAAIAAQQAAAEAAQAACAAAAQDmEAEIsYcHAAAABggAAAEAjiMJCLCHAQABAAsIsIcBAAAAiG10lh2kckAAAABA' +
    'plRYQVdHUyA4NHwAAAECAwQFBgcICQoLDA0ODwcICQoLDA0ODxAREhMUFRYODxAREhMUFRYXGBkaGxwdFRYXGBkaGxwdHh8gISIjJBwdHh8gISIjJCUmJygp' +
    'KisjJCUmJygpKissLS4vMDEyKissLS4vMDEyMzQ1Njc4OTEyMzQ1Njc4OTo7PD0+P0A4OTo7PD0+P0BBQkNERUZHP0BBQkNERUZHSElKS0xNTkZHSElKS0xN' +
    'Tk9QUVJTVFVNTk9QUVJTVFVWV1hZWltcVFVWV1hZWltcXV5fYGFiY1tcXV5fYGFiY2RlZmdoaWpiY2RlZmdoaWprbG1ub3BxaWprbG1ub3BxcnN0dXZ3eBAR' +
    'EhMAAAAAAAAAAAAAAAAXGBkaAAAAAAAAAAAAAAAAHh8gIQAAAAAAAAAAAAAAACUmJygAAAAAAAAAAAAAAAAsLS4vAAAAAAAAAAAAAAAAMzQ1NgAAAAAAAAAA' +
    'AAAAADo7PD0AAAAAAAAAAAAAAABBQkNEAAAAAAAAAAAAAAAASElKSwAAAAAAAAAAAAAAAE9QUVIAAAAAAAAAAAAAAABWV1hZAAAAAAAAAAAAAAAAXV5fYAAA' +
    'AAAAAAAAAAAAAGRlZmcAAAAAAAAAAAAAAABrbG1uAAAAAAAAAAAAAAAAcnN0dQAAAAAAAAAAAAAAAHl6e3wAAAAAAAAAAAAAAABwcXJzdHV2d3h5ent8fX5/' +
    'd3h5ent8fX5/gIGCg4SFhgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgIGCgwAAAAAAAAAAAAAAAIeIiYoAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMEBQYHCAkKCwwNDg8QERIKCwwNDg8QERITFBUWFxgZERITFBUWFxgZGhsc' +
    'HR4fIBgZGhscHR4fICEiIyQlJicfICEiIyQlJicoKSorLC0uJicoKSorLC0uLzAxMjM0NS0uLzAxMjM0NTY3ODk6Ozw0NTY3ODk6Ozw9Pj9AQUJDOzw9Pj9A' +
    'QUJDREVGR0hJSkJDREVGR0hJSktMTU5PUFFJSktMTU5PUFFSU1RVVldYUFFSU1RVVldYWVpbXF1eX1dYWVpbXF1eX2BhYmNkZWZeX2BhYmNkZWZnaGlqa2xt' +
    'ZWZnaGlqa2xtbm9wcXJzdGxtbm9wcXJzdHV2d3h5ensTFBUWAAAAAAAAAAAAAAAAGhscHQAAAAAAAAAAAAAAACEiIyQAAAAAAAAAAAAAAAAoKSorAAAAAAAA' +
    'AAAAAAAALzAxMgAAAAAAAAAAAAAAADY3ODkAAAAAAAAAAAAAAAA9Pj9AAAAAAAAAAAAAAAAAREVGRwAAAAAAAAAAAAAAAEtMTU4AAAAAAAAAAAAAAABSU1RV' +
    'AAAAAAAAAAAAAAAAWVpbXAAAAAAAAAAAAAAAAGBhYmMAAAAAAAAAAAAAAABnaGlqAAAAAAAAAAAAAAAAbm9wcQAAAAAAAAAAAAAAAHV2d3gAAAAAAAAAAAAA' +
    'AAB8fX5/AAAAAAAAAAAAAAAAc3R1dnd4eXp7fH1+f4CBgnp7fH1+f4CBgoOEhYaHiIkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAIOEhYYAAAAAAAAAAAAAAACKi4yNAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGBwgJCgsMDQ4P' +
    'EBESExQVDQ4PEBESExQVFhcYGRobHBQVFhcYGRobHB0eHyAhIiMbHB0eHyAhIiMkJSYnKCkqIiMkJSYnKCkqKywtLi8wMSkqKywtLi8wMTIzNDU2NzgwMTIz' +
    'NDU2Nzg5Ojs8PT4/Nzg5Ojs8PT4/QEFCQ0RFRj4/QEFCQ0RFRkdISUpLTE1FRkdISUpLTE1OT1BRUlNUTE1OT1BRUlNUVVZXWFlaW1NUVVZXWFlaW1xdXl9g' +
    'YWJaW1xdXl9gYWJjZGVmZ2hpYWJjZGVmZ2hpamtsbW5vcGhpamtsbW5vcHFyc3R1dndvcHFyc3R1dnd4eXp7fH1+FhcYGQAAAAAAAAAAAAAAAB0eHyAAAAAA' +
    'AAAAAAAAAAAkJSYnAAAAAAAAAAAAAAAAKywtLgAAAAAAAAAAAAAAADIzNDUAAAAAAAAAAAAAAAA5Ojs8AAAAAAAAAAAAAAAAQEFCQwAAAAAAAAAAAAAAAEdI' +
    'SUoAAAAAAAAAAAAAAABOT1BRAAAAAAAAAAAAAAAAVVZXWAAAAAAAAAAAAAAAAFxdXl8AAAAAAAAAAAAAAABjZGVmAAAAAAAAAAAAAAAAamtsbQAAAAAAAAAA' +
    'AAAAAHFyc3QAAAAAAAAAAAAAAAB4eXp7AAAAAAAAAAAAAAAAf4CBggAAAAAAAAAAAAAAAHZ3eHl6e3x9fn+AgYKDhIV9fn+AgYKDhIWGh4iJiouMAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACGh4iJAAAAAAAAAAAAAAAAjY6PkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  u8_3band_pixel:
    'SUkqAAgAAAARAAABAwABAAAAFAAAAAEBAwABAAAAEgAAAAIBAwADAAAA2gAAAAMBAwABAAAACAAAAAYBAwABAAAAAgAAABEBBAABAAAAhgEAABUBAwABAAAA' +
    'AwAAABYBAwABAAAAEgAAABcBBAABAAAAaQAAABwBAwABAAAAAQAAAD0BAwABAAAAAgAAAFMBAwADAAAA4AAAAA6DDAADAAAA5gAAAIKEDAAGAAAA/gAAAK+H' +
    'AwAgAAAALgEAALCHDAACAAAAbgEAALGHAgAIAAAAfgEAAAAAAAAIAAgACAABAAEAAQB7FK5H4XqEP3sUrkfheoQ/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAIBVQAAAAAAAADxAAAAAAAAAAAABAAEAAAAHAAAEAAABAAIAAQQAAAEAAQAACAAAAQDmEAEIsYcHAAAABggAAAEAjiMJCLCHAQABAAsI' +
    'sIcBAAAAiG10lh2kckAAAABAplRYQVdHUyA4NHwAeJxjYGZjJBewc/GSrZdPUIRsvaIS0mTrlZFXIluvspom2Xq1dA3I1mtoYk62XgtrO7L12ju5kq3XzdOH' +
    'bL2+AcFk6w0JjyJbb3RcItl6k1IzyNabmZNPtt6C4jKy9ZZX1ZKtFwBydxEy',
  u8_jpeg:
    'SUkqAAgAAAARAAABAwABAAAAEAAAAAEBAwABAAAAEAAAAAIBAwABAAAACAAAAAMBAwABAAAABwAAAAYBAwABAAAAAQAAABEBBAABAAAAxAEAABUBAwABAAAA' +
    'AQAAABYBAwABAAAAEAAAABcBBAABAAAAWQAAABwBAwABAAAAAQAAAFMBAwABAAAAAQAAAFsBBwBJAAAA2gAAAA6DDAADAAAAJAEAAIKEDAAGAAAAPAEAAK+H' +
    'AwAgAAAAbAEAALCHDAACAAAArAEAALGHAgAIAAAAvAEAAAAAAAD/2P/bAEMACAYGBwYFCAcHBwkJCAoMFA0MCwsMGRITDxQdGh8eHRocHCAkLicgIiwjHBwo' +
    'NyksMDE0NDQfJzk9ODI8LjM0Mv/ZAHsUrkfheoQ/exSuR+F6hD8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgFVAAAAAAAAAPEAAAAAA' +
    'AAAAAAEAAQAAAAcAAAQAAAEAAgABBAAAAQABAAAIAAABAOYQAQixhwcAAAAGCAAAAQCOIwkIsIcBAAEACwiwhwEAAACIbXSWHaRyQAAAAECmVFhBV0dTIDg0' +
    'fAD/2P/AAAsIABAAEAEBEQD/xAAWAAEBAQAAAAAAAAAAAAAAAAAEBgf/xAAXEAADAQAAAAAAAAAAAAAAAAAAAgVi/9oACAEBAAA/AMbSVkQkrJYJKyISVk//' +
    '2Q==',
  u8_lzw_long:
    'SUkqAAgAAAARAAABAwABAAAAeAAAAAEBAwABAAAAZAAAAAIBAwABAAAACAAAAAMBAwABAAAABQAAAAYBAwABAAAAAQAAABEBBAACAAAA4gAAABUBAwABAAAA' +
    'AQAAABYBAwABAAAARAAAABcBBAACAAAA2gAAABwBAwABAAAAAQAAAD0BAwABAAAAAQAAAFMBAwABAAAAAQAAAA6DDAADAAAA6gAAAIKEDAAGAAAAAgEAAK+H' +
    'AwAgAAAAMgEAALCHDAACAAAAcgEAALGHAgAIAAAAggEAAAAAAABvEgAAEwkAAIoBAAD5EwAAexSuR+F6hD97FK5H4XqEPwAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAACAVUAAAAAAAAA8QAAAAAAAAAAAAQABAAAABwAABAAAAQACAAEEAAABAAEAAAgAAAEA5hABCLGHBwAAAAYIAAABAI4jCQiwhwEA' +
    'AQALCLCHAQAAAIhtdJYdpHJAAAAAQKZUWEFXR1MgODR8AIABQIBACAQGBwMDAEDAICACBQXCgPDgHCQICgODAMBwOCwXDQQCgGAgCCASBgGCQIDAAAQPKwWC' +
    'QFMwCCQUC4eBQHA49CIWAgRM5QCQCAgIBQSCANIoxGAGAAMAgOAY+BIiBQUCgKCJeBQPOwXAq9IwXL6yBYUAgADJtJoRK6BWKNGwZI7bRaCAwGAQMCALar4B' +
    'apMgVUpxfqSAgXI7WDIZD6DAsLDoVDwMCQXWQSAJvMgZApsAbYAgMAL1O5PE6nUwZmYWCpkB84CQLWNLSQVGtNRANCYrHYeCdpiMFnARKaAB6IC6hA7/OrXH' +
    'MVR6hCAVA6jguV16sB8KAIWBQNBgRFIRSqPyfLR41IwHgq3LABtQJvYyAq8CQHSgHGpI2SwqeAaMASl6GvGBTEM4sL5r0tQFPG5YAJO/QCKe2CWKaACJpasr' +
    'xJwhrMr6BaSPGi8SAMgiFgM8S1qEAijOEhENgE/a+s4iqBPqBKNKC0SYuYAyPpCBilJ0xbPpuxaqOOva6xI5jcpOpb4Q28SggI8ACO9CyjoihABrKy4Fwik6' +
    'DRRCyoqisrFr6/qNwe2qUACBTBqwtaQtMrSkTCmYAAWBC1oNMLFrU0j+RrD0CuPJSSqlQypACzitgQBiJwCvyXAAkyVoGokworHiDqssspqSna9UZALVrCiN' +
    'FvE0rZJQ5jFKXSyPN8hKpqAkq9K8o4DtqiMSL/MD6patVdoXTakyEiAFPnGqRRTTdLJtQCGKm2kSIIgSOOZGCdJev1ApOATYKOvijwGhCC2Costw3CDFOsoK' +
    '2LWk8s0AjMGqyASiUDP6tJTVIEIa00yIiusNqihqSpcoqsK0meDAYrSNwG0r6qKxTNpkAMLWglLNzIz73zoiEtrZKjNWDOrMKSjKPrQkjaI24URuu5gAXlFi' +
    'TqRBks4OkjHL9S2eIKkzQgA7r55jTUyXOkbxq4kLcrgxelLDIrSNzUeVKeBlJIq97cvmwU6uuhSKqLED9T+mUogLploJ+n7crYvSRPwzakNbC2/OColoNhGq' +
    '2bndkis5iyOswrCdLa479KzgzYR4h9DUkoqE0q8aoJIsKbqBGCRKxEk/gOxUE4ayGRrRhrFL8hqsvGnDxv2vThKf1D306oz8K9FkvpXtKNrzO2rp0z86JwgU' +
    'F54mavxpQDRSy4/NL7StoJKlUeIY5KS3i8FN0Cz6EsxLaY03aCGpU+aaq/Mjjpo8UPqQAiiIXHipo3LczuXNaoFBJwiSlbbmZ9IpCCOoZJWfZGDWUEkrV6Wg' +
    'ohsj9EmbEbpY5jkskcL4S0ni9ibE6IwT9niW1eMGKWVlqJfzynidGZ8pJDy9uyNI3MtR5TAr/TqZdQJJj+tdNkfgg5AiEl9M6U81xFSHFyMaft/B1y2tMQsn' +
    'Qrh9SBOyL0TVEKECFE6K2TFZ69oFmtSgSx8y/3UsuXOTduB9SRrTL+8Yup9X8IDIIV8rRHX5J5TDCojRuXUv6iwTl2JLS9EvNKfk2pXS1pqjCoBHawSZpLOk' +
    'wQ8BpDBkaTg4UxaYDjlIasSp0JX0hRoJukU65S2eM3OEQwhr9VYrtaKbRuZJSWExI6nMjiYV0L/T+QolDISdlbdSWUlhHI+EkMEQY/BnCBlKLUY51JVDSkeP' +
    '+oE/rPFzL5M3DUxbKSilUJScp/CZGUFTP6paW5+mHnNQGUgzZ4FoGbOvB9CCKW8E6UCd5gxHikI0IQkIqyPCuEnMygVJSWzvFUM4iwvhsi0IeRAhgh5hUan6' +
    'JkfNpiBSDmkQmv8tjgElF1aUlkzBSzjtObESIyxDmnE2PGfg5igU1FSTUWE5aV0eLMMWr5uhl0BkVI+alCxpigFSaYWVCBmjgn8T+QSVhEyskpK4X9Aqlivm' +
    'yQSV0kBLgEJBNyQZIrxjrvzWuRVpidDxkdLypRCc9TLmlPmkkpbIGxOCJUVIriYSazNJQiUwsa57wXQISRhxFqyEOMyZmBqwS+osKs+Mvpm5NIcRISEgxUXU' +
    'oFhSS6hNGomsnImjBY6BzYOlnkaYr8447HPJabQk6lVJNiXOXVKkHyYmOMun9kDizRG5JIwYiFc1TzhZJE1ZyPaLv4sWVAxZHknsrMyeUjxO0Um9f02kzJpk' +
    'JpkaoaUvzRDymcKMlWWkQyBI1IgREit2SsEhh4sNihWyCleKoRhzrHGeMLpCUs0i/yEk4nTPRyxCyCJmd6w0jLYlglII2qU15HySEjQBWVf7ei9tzJsS1BKj' +
    'lJFKeyUeB8X6HRiLeaXEz+C1m5NgRklSYSZIfOUkEnDhWVLlhecompSTNkKU2fNGEiaooTLGVEthIqPJZe4Q6O2GyjNMUJGIy5my+KSLUixW8KJMuqRSjB7p' +
    '+CXFSIY2ZEkHkBoQToSAi7eSUszIu71TZMy/keQsREvpBUyRwv4cpP6JFU32X2ZghRkWQOpK2ls993SwneMwSNXhKzj1hIKp4up+6NlHZTPxG5UTClZLq7oj' +
    'E4aOYPeraY6515FGKPATIp7UtG1hj20QlpJSuJCwEsYn7t0YI1OopbKNeCasZNyb0uxRT9P3KDmJkCqDoOzXsTcuhF5WEkNIZt9KwSPlLNpljDqVyUGwnial' +
    'Pef9cP4LUTsr9YTvGmJqucxq93MKUNg9Uz5+M1Y9o2jRkCzS63sw23BSydUBuRLMe8z7lVJT6xFuFIp8dDnsSEpW6pRlAJhT+ZQi+yKUE4X+d1IBaioTQWoW' +
    'onRB7GPUMJR4xRLKw0oMJWEv5hUxxcPAQ4jhSlgn1rmdxa5tSdwFZ4myXygEUGYO8f19ylSJsWNaeAnb7CPyqIvhU2hGlgRRnWdvpJU2GdPqIe4ixLI5kJMg' +
    'RdTJ+lAFb4zhYg6fYxEpUt1gkJNikmgN4Vue5brgwzPOR8vnZjcK6I+tA/hf9/kDbEXtmam3+4Eznp8g+N0hIAJo+o0xDD5kZNlog5VpUw2VJdCVFJCESU4V' +
    'csFfhMEElGJTnFQSdGLlRnWVwz5mcr+BomWwjSKD+RuMWbRCdNjeqWYMhPzr3n8FE+Mbcl7Z0Bl8cniqs5fIeowcw+yBRtW46HwGgtMxzPe84NEcfic6OzNX' +
    'giUDt+rCjJZMdVp3aEClG6lYZisMmCrW0IwQYwRKhIRTZMJ0ycpISzY1rPIiY/QoBaC7Jk5cygbJw16vLLDBokQjpLLUZYL2z4o87pzNSfjoClwz6Nbp5gKh' +
    'gghP5Q7frdKhBBJRivoqRFpDY4RpwjJOooo67ILOI/YiYtDdYzBnRHYiLeCFioqLYp5g7B67A2A447y8ClA7om4moy4rykT4QzA/Ar4o43orAqa0wggkJFIv' +
    'hsRjZ5YtaqIkxCA8TBqILRDzKnQ+CZq+5MhGj6oxwpAjIqhf6iLYELy5jxYoIvpuYrIwryY/qF5c4q0JK8o+p8xKI9wkInQ7IrbZJYQwT3pXwxRQBib2wj4v' +
    'Rzw5JAqHAmxLZQI0g8bPIuhSolQwUThngrRP4rYpZQo+sQwy4gqnCmhUSY4vbqLbTbrSaPZAoqYnQgiPL8wkZIp+RlaVsPEDBDZsTtRTTXo3K6LqYxSZsH7G' +
    'Iii96sJIo/R3I0A/ZkDdDA7PwkTRbCRQ6TIhxOhdo0RgTAjng+pQ7SCLYlh1RvC8YoKXbVIkxFIr0H8KiXTMg9TcRIpgwmzJMHqLiea+5b4wp0w0Q07kYmQ4' +
    'Q8TRakKpEXI0Q5Y7wl4r54K1IlIv7O45x5QmZ1QjhIskokww5opp0eoqgqgupv5bMHJMIo4tqwY8ra4rZUZuImBCo+r48SZS5m4pA2r10TglxkIyS8KqpsSu' +
    'bz7mxGBngip9qA8ZaMJigjEGgoBeRFQ5SJQhZ0I2pd0FUfJEAvhqxXizIp5URizYxzoyi/RVBBI3SpglcYrhAlYpAkpPTjL4QqhHcZSBQ4yaKKAjL0I96wKv' +
    'rWQvRz4zIrSzZLQjBtbwy0w0hIJLJDZd4qScAlTO4oJszJjuR/0kTRZchCwxyG4+ZQAlpI4s42zrxwZfxAkkYzkkQliu6mA4Qrgm64pPitp/grQhidbwCSRK' +
    'BNwpIlkUzW57w/ZixroqLYYnRscLRg5MgrxYM5xuI+asJco7o0UHycpM4mIlx6R9ooh97M5So3SFwrLfqIrIAqxf6IyqxsQj51I8BK4rgh6chOq2xyzCIwQk' +
    'MG4wUYhkEb89JPRjbPzjxTZ5QsQvo7wjSGUlpLIlCyItheBLUWgjxdTnjW6IZkx2sDZJC+DSTiU4Tx0Lxl4mYvb545yeJYEBAqJQKqSOqFEloyg3ojaLIg6+' +
    '5/RN63ohojo75ApFRcE50Mp7TNLnEcgrMAU6ayAjA5RZ795Y4pMNAp7FQvjCx+CQLu73CBZyAl7XxHgpbRC25J8mQoL2IgyEqD6o6fUIh1IrhAyjZHj7gsok' +
    'YkyFRRxTZ1JTzJj47kyAiBMrJDaIAgxUhxop5FojUpUKtDhZI/Q5QlhCiH89h6omcHCREFKKSQAhMdMMo4RaBiwg4+wjUBR6S+JJp0g0s/BSUFS8QqApQkRS' +
    'pCdTImQ8olIlq+Rmr/IhyVYjEH4lotccgjbwwhhhRNw1xmaVb98kRY5SRYZHwjihTSZ0YnBxRcVZsvpizoyVojooUKpmEwBswr9Vwp7BqPiu9b5KAoEgp6Io' +
    'zIA0Q0Q/CG4hwtw+oxaqRFLtSEgkhBM/heiEgvQtLOwy4hpc4tDcRQAjYmq/VT52qjQlKuYopcc44pYvrkwiaKBqY0aTJlZSogcNEeJbKeZ41hazp5guQ/qN' +
    'z2knR3SMwpTG4m7gog5IpOiiK9k7qRwzLTCO68SQcdMbbaRMAwxqQoxiI69MRDiE5fj8xOhxy/cfJDogcBUuYlL/w9ogbNQwiNY5Q5YlTIEzFJJKZOsNAxza' +
    'QoihRdYi88LW4/YsItDvQoyrgmQuZNMBR2Q61fjuQ44i59wrEPA+JnYqwiDighTgZT59REp4xiSbAl4gsAazicNLJ75uYvy7Chw/aPYjBg4mpPMPJ0ghqJi0' +
    'sUxWhOq5BQYrRRgnZ2Qgh5sMtlxLEsJAtXK7xnSI68Tuw8AgpHl0g8Q4KiSXpZpMMBAnA7xzw1tiJDwhY4ER7QrKRgzyahNN16LzZCAqBsYrA2lPIxxbCrIu' +
    'Zw7dBGDUxa4spQY0g+8XK6DhMaQpRtpGsSSzztgwpcAjoiAus447xww7BBZAdCSlogZSQzS3YgpMaeRGasY8pOogdhaALsSvJhokJdiaDbBfOCR7hdBxxtqA' +
    '5kCNqe5rKGYjbI1buCgmL5cxj4RkwxcrA4A3qYI5jgo0hjZ0AhZXpf7qcLxbDGsr4pKOzYA/aA4vbJgj5DdB4/oqhrbbcciHIrQghwh7RQQhi6eJpCw4RHhc' +
    'wlFY03sRBCcZz219aDok1xouFNIrxPNHAiJSqzWLU3A0kdUrFDczCNAwRjprxph0CD0PQ8JIRCJ9scxT1vq+TAieZgisJ4xEivKO5GrMZaEdpAooohSGZHlJ' +
    'AphEbNJi1Po8Y1oibiZGBFkAwvbwLsxv5SQjo8CXZ81YIgqzYgr6o5kLx3sTBTNkSJhpTSjertjCZplUyZkQxc7MWAyrA8BhQiLYY15/MX2LyoZh5kBqhjy1' +
    'rD45ivZnjd1/CtrxBJ4vcC4lA2spTwCp1LqBDtEeJl0MJ1cmrpTypYI1CBBFDCo8BiwiB/Rp0T6Iwv402f73giIm4jg3oqo66gN0wnba9uNIA0znj1BtA+Ui' +
    'QkVnwhJyDUYvJPA0Q9ooxkR6rGEytZpm42A0xFhCAw42uMRFIhzKo/tlJukigjwnB97RdNoiQpmcAjwlQlyYR/JL5zaS98EMB1MWIjxPUYyriLjNq1lg497n' +
    'eRxOpQxUoz0cMVg/KRJIpLZFKogvMLQ2iO4rU7hNZdxLI5665M1gAy44ChpZUQsb4oq77kT80UpP9ihpULTYpFghb82e9Roo721bBuqfonQoAzaYYg+cY3i6' +
    'NdosKv4nA/SiCvaIY1BsJfEiQsuZcrBIpS1jSMD+Qmsyi2LEaldBL6VZcKw/orzh4joioz5+ppmUicZGUb6BYzUQZAgi4laeIzVuMnxpJSQk+rTuafyYd5+c' +
    'Q6WFTtkzwjItEmqVRVoy4xwk8F5XckDkeo8XxPlJKv5jic8vivo7QjmlCxDOhgBHQvbQgiImDbZ9Ykz5BLENgm5GDgZgh+5DhMKyB+U4Rss6ZIRECRp/En2r' +
    'Yx+ihpDloog+BHabh8q21qkMuWpEZuYl7bC+xieO1KRaCxpDpWimBbODQtb5ZlYtTVyH8kozFupWh/DGqBYqClI6hgAs4lwgIIAAwEAwGAQMBAGBQQCgEBAI' +
    'CgCDAUBoiCwQBQWAgUBARDgCBwEBQLBIUBQJGQOBQACAWCQWAYaAgECQSBgQB5uDABEYiAJ2CASBQYDAJMpnNgTMpYCYvL4VOgPAgMCwUCgABwMCaKAJ1LZA' +
    'CgGBwXWYTFgKAQSDAOAAWBJoAwBEwMAASAwJQ6iB71QwEBgOCpuCwYCMHOoROAFOwZIQLdQGBpkDLQBI/DYFOrfc8BN6SDLbDAKAgXCQLVgBcAZNQYA8HLAJ' +
    'fwJCsTU9XQrDbKjLARHwVXgBr4xvYkBQMCr+Cd/xAXYgHHYIB9XeruBrPYopVQZCsFI4x2QYBuoC9/ccpLrZNKvAoFGNjYgJFACAQRYeRM4NJpPG4Zg5bLAC' +
    'lqZNeyQApUBL/rixrWJgvQDgC964JWkCTAUxbAII+YBMG0rPAOmiRAM7IEJs7bUxAyEDLcqq2AC4wArC7iOrOBCdrmhK6tS5oErAhCDMCqLiwcoiiLCiSCxY' +
    'ADGoWkDvtDGcQAGtq9QpHKmKujS6oMv6xx0laGrAhsHL6vyrNY7zwJ8i8oJdFyLAUlUOogqiKJwmC6IWuaDsWsSgoYA0iASqK7Jug8DL+mDegWwVEviqycAU' +
    'rTBuQtSbAQvqsMhDrYuC8TOupSSiK49aqgEtCgAFEVAIjUcDNOqSyREwbcK05qL0qg0MgIAE/MWoTfzciLdrinEdJCnFcgKlKJIQACjNG3sDMMAMaAG4y+qI' +
    'saBVI5C1pei4BOhJybLvZCHpFcyhKGtChx04z5qpUzZI47Ncou2y/JTZkKIi1MdLsmb5z9Bzd0vPSRKSiirtlAymAGtKeNSyjjpWoT0RAhCBok0YERFEUMzc' +
    'xsXJoma6zdCiMKBRLtxBAiVyQuKCuXFytowrlmKvYeGoIweBRHdDOrS36xNTYqCp8rCHoix7EyRd7PSYwU5wywjJI5DuUxEA6TpUgT5JMmq6Mk56pNZPyOrq' +
    'kbXy4sEcuomSguXXSuYYlzlpGi6rgWkbxQA5q1o8mysuKnSNI+5aooQi6bLPtq1N7ECRIZCjsvEsPIomuKFzFKDRtS3DPWPZiPrO8UGsg+KaKmgqasIqdAPm' +
    'kqWL3KDvr0gyWuQjax48yiG6OrKPrpKCgJTy++se6iEq4ylpLbRKMdKqdKp0lcYqC6CDv+gaWK4oCmOBqC9NOmU1VbtsHV1CicIldeg9+ka1r1qSM1qmncoi' +
    'rKcLEoFHpdd1YnxMIgs1K0jVtBOIWAmpFSskcSQXU5BbUFkaO+wIuqpCVHFYajpAprFAEaRATdERHzikpUCcQlcAybLSJBAEh5uywPEK0SlahCikpuayvdZZ' +
    '1DKFxSCixU6ei7kdIOQgtRozHk7RcaldruGGnUKGYtjZVy0LSKKYQrRAzBGXPyswjJYDrk4IWROKLUiCmrKKY0vxIk2GiJcpJhxuCWGSJedAmi2yxkcKS6Qh' +
    'bXVAFaIuWI0RaDkFcNGcsyRWTEkYOaUJFhY1sOXQIolKrsynGLLut8vpRVSK5NeQ8sCiSuEbcLGYsROzHlpNEfMqxQjpmhXEYA+SPEoEjNYQmMLWX0mSLkRN' +
    '65H1AFVJUbEtBBy/lfI4fMwaj0TkGORHUm5PiqqcS0c095F15m7iEQ6ThH2kHZJSSUxrly1m7Lmg0uDryOEhRAWMiJLjiFQUuVqX8TTWOlLQaEhjHEGqmSA0' +
    'laRVTXpbKwaUuhVXfrckuuwoJdn1lnI4bFAxbSCF3MOrqK5IS2HfJehYqpGy1SnoacRmCyHgFZRkXYmhzianLlq0d2yuj/MXLuQVaiLChROLvEUhpSCHluks' +
    'lA+xcSWzRc+XwzBYCYF2cua82Bxm9EgJOTUkRGSMqnIQ2mWxAkBFSJ8S0rJVzwGfREWebxOkewLKIjN8ZWEOmJRapWqyIiGFwPQi5R5YyokWSgeAgRaSJlpO' +
    '2bstR3CXl+J2YB7EC5ykIWoQ8ixhDEQ3Y2TkiFjpNoTKfKBm6UEKGQJOqcwJDSMmDLmYmtU3nomPemtJSrv3ukpKLV4vKICdmUKydlViuVpF1bycxEBnjRl9' +
    'kweApLWS/qkJaXYos9S4GQbIQtZBbY/HBoe2tZC2TjG9IMYsiJDyGm/LdNY4xQSaEvNESokJdzJmAJMfItSvqNHETYRYxJMEZviViR1rJHVHmLLxGYlaDloF' +
    '0XyYsmZv3Zlpm0TsnZLyfMMUma8+aHVdHfJ2aWgL2F0mnLGQo8FgyvoZV0upurnDTKnt2aJx7homFaiQgRg5hCGHvL6ch5LeVi1/by3sqqajjJtnWUN9pTiB' +
    '01L2Ts0Sizsmie47dZDG0OGnUeUA1LebYtYdERk2JkI7rfRSaBEB1msnvPESrDj6WyHQLgvglSbksWjMmauI5ojYwuNYvQu5SbRQtnTccq5PjILBrJTOhagC' +
    '4EJVARo0pzS4qnQkTVFqBk3SZZufG/ZYDsn7IUVw710lukpkceCcx738rUILDothMoFkQro0YiL+SaFDN6RoiZQ0ZnOIfofAyK6UzILQSEiZYWqqJV/ES4ps' +
    'W8lBQIc+CaRmsNBKSUBXM31qYOKixgqzeSINZ2IUXUhJ7wxOY2WIkcUqKLfKwR9qhxjoRe24XMzslz4kaREW1b+BN7KlionbH5G5UIZJEQXA5BC2wnIciCv7' +
    'XixIUi850+5bGN4wdWqctJcJLwpNYYIohfiPnNUYf4lJNniakWQQev5j00313Gn46hU3gkaQA2hahczVlTTcRwv1qjdkOekgRwpHT/oiLC0udaLyToHRYS7k' +
    'yICZLSWpWMvUQiCE7hkxvFREqO6GN6Q6I5bTQ3IWRrUmaFj6kmN0Vp3hpSSnvIoykiDK1AG17Mb9kVASFGwLcS07626zEUK0QY3tcIjKaj8YNehOmDEfgIy0' +
    '8CUzPtleizFkbeShKkP+VNrJqyITQJYshZETyOmCIQVa9y8iueeimv2Gxr+EHiM0SevZCiTqcSR0c1alSIE3PjLHZaLMfmhLociD6MzSkZUIkhdfFCIIESSV' +
    'QvKBcAvcVzclXJWZVFr8ufgwhQJalxNSUJ2JgjE1S42SYqdriBV3PesgsSAL3KkVqwE3sNAFkBA=',
};
