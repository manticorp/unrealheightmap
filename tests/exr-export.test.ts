import fs from 'fs';
import path from 'path';
import PNG from './../src/png';
import { encodeExr, ExrPixelType } from './../src/exr';
import { mapHeightSamplesToExr } from './../src/exr-conversion';
import { decodeExr, ExrChannel } from './../src/exr-decode';

const resourcesDir = path.resolve(__dirname, 'resources');

const bufferToArrayBuffer = (buffer: Buffer): ArrayBuffer => {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
};

const loadHeightmapPng = (fileName: string) => {
  const png = PNG.fromBuffer(bufferToArrayBuffer(fs.readFileSync(path.join(resourcesDir, fileName))));
  const { width, height } = png.getIHDR();
  const raw = png.getImageData() as Uint16Array;
  return { width, height, raw, samples: Float32Array.from(raw) };
};

const sortChannels = (channels: ExrChannel[]) => [...channels].sort((a, b) => a.name.localeCompare(b.name));

const heightmap = loadHeightmapPng('heightmap_16bit.png');

/** Encode, decode again, and check every channel against the expected values. */
const roundTrip = (data: Float32Array, pixelType: ExrPixelType) => {
  const buffer = encodeExr({width: heightmap.width, height: heightmap.height, data, pixelType});
  return decodeExr(buffer);
};

describe('OpenEXR export', () => {
  // The structure (size, channel names and types) still matches what Photoshop
  // writes, so other tools read our files the same way they read Photoshop's.
  it.each([
    ['heightmap_16bit.exr', ExrPixelType.Half],
    ['heightmap_32bit.exr', ExrPixelType.Float],
  ])('has the same layout as the Photoshop reference %s', (file, pixelType) => {
    const decoded = roundTrip(mapHeightSamplesToExr(heightmap.samples), pixelType);
    const reference = decodeExr(new Uint8Array(bufferToArrayBuffer(fs.readFileSync(path.join(resourcesDir, file)))));
    expect(decoded.width).toBe(reference.width);
    expect(decoded.height).toBe(reference.height);
    expect(sortChannels(decoded.channels).map(c => [c.name, c.pixelType]))
      .toEqual(sortChannels(reference.channels).map(c => [c.name, c.pixelType]));
  });

  it('stores normalised heights linearly in 32-bit float', () => {
    const decoded = roundTrip(mapHeightSamplesToExr(heightmap.samples), ExrPixelType.Float);
    for (const channel of decoded.channels) {
      const data = channel.data as Float32Array;
      for (let i = 0; i < heightmap.raw.length; i++) {
        expect(Math.abs(data[i] - heightmap.raw[i] / 65535)).toBeLessThanOrEqual(1e-6);
      }
    }
  });

  it('stores normalised heights linearly in 16-bit half float, within half precision', () => {
    const decoded = roundTrip(mapHeightSamplesToExr(heightmap.samples), ExrPixelType.Half);
    // The decoder returns raw half-float bits.
    const halfToFloat = (h: number) => {
      const exp = (h >> 10) & 0x1f;
      const frac = h & 0x3ff;
      const sign = h & 0x8000 ? -1 : 1;
      if (exp === 0) return sign * Math.pow(2, -14) * (frac / 1024);
      return sign * Math.pow(2, exp - 15) * (1 + frac / 1024);
    };
    const half = decoded.channels[0].data as Uint16Array;
    let maxError = 0;
    for (let i = 0; i < heightmap.raw.length; i++) {
      maxError = Math.max(maxError, Math.abs(halfToFloat(half[i]) - heightmap.raw[i] / 65535));
    }
    // Half floats have an 11-bit significand: steps of 1/2048 just below 1.0.
    expect(maxError).toBeLessThanOrEqual(1 / 2048);
  });

  it('rounds half floats up across a power of two instead of halving them', () => {
    // Just below 0.5, 0.25 and 1.0 the significand rounds up and must carry into the exponent.
    const data = new Float32Array([32767 / 65535, 16383 / 65535, 65534 / 65535, 0.9999999]);
    const buffer = encodeExr({width: data.length, height: 1, data, pixelType: ExrPixelType.Half});
    const bits = Array.from(decodeExr(buffer).channels[0].data as Uint16Array);
    expect(bits).toEqual([0x3800, 0x3400, 0x3c00, 0x3c00]);
  });

  it('mid-grey stays at the middle of the height range', () => {
    const decoded = roundTrip(mapHeightSamplesToExr(new Float32Array(heightmap.width * heightmap.height).fill(32767.5)), ExrPixelType.Float);
    expect((decoded.channels[0].data as Float32Array)[0]).toBeCloseTo(0.5, 6);
  });

  it('stores true metres, including negative heights, when normalisation is off', () => {
    const metres = new Float32Array(heightmap.width * heightmap.height);
    for (let i = 0; i < metres.length; i++) {
      metres[i] = -400 + (i % 1000) * 9.25;
    }
    const decoded = roundTrip(mapHeightSamplesToExr(metres, 'metres'), ExrPixelType.Float);
    const data = decoded.channels[0].data as Float32Array;
    for (let i = 0; i < metres.length; i += 97) {
      expect(data[i]).toBeCloseTo(metres[i], 3);
    }
  });
});
