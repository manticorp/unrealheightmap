import {
  computeDerivedMaps,
  computeHeightBands,
  flattenBelow,
  noDerivedMaps,
  parseHeightBands,
  wantsDerivedMaps,
} from '../src/derived-maps';

const ramp = (width: number, height: number, fn: (x: number, y: number) => number) => {
  const data = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[y * width + x] = fn(x, y);
    }
  }
  return data;
};

const px = (map: Uint8Array, width: number, x: number, y: number, channels = 1) =>
  Array.from(map.subarray((y * width + x) * channels, (y * width + x + 1) * channels));

describe('derived maps', () => {
  test('parseHeightBands sorts, dedupes and drops junk', () => {
    expect(parseHeightBands('1500, 500 ,abc;500  2500')).toEqual([500, 1500, 2500]);
    expect(parseHeightBands('')).toEqual([]);
  });

  test('wantsDerivedMaps is false when nothing is selected', () => {
    expect(wantsDerivedMaps(undefined)).toBe(false);
    expect(wantsDerivedMaps(noDerivedMaps)).toBe(false);
    expect(wantsDerivedMaps({...noDerivedMaps, slope: true})).toBe(true);
  });

  test('flattenBelow raises only samples under the level', () => {
    const h = new Float32Array([-50, -1, 0, 10]);
    flattenBelow(h, 0);
    expect(Array.from(h)).toEqual([0, 0, 0, 10]);
  });

  test('flat ground gives a straight-up normal, zero slope and mid curvature', () => {
    const h = ramp(4, 4, () => 100);
    const maps = computeDerivedMaps(h, 4, 4, {...noDerivedMaps, normal: 'opengl', slope: true, curvature: true}, {x: 10, y: 10});
    const [normal, slope, curvature] = maps;
    expect(px(normal.data, 4, 1, 1, 3)).toEqual([128, 128, 255]);
    expect(px(slope.data, 4, 1, 1)).toEqual([0]);
    expect(px(curvature.data, 4, 1, 1)).toEqual([128]);
  });

  test('45 degree slope rising east', () => {
    // Rises 10 m per 10 m pixel towards +x
    const h = ramp(5, 3, (x) => x * 10);
    const [normal, slope] = computeDerivedMaps(h, 5, 3, {...noDerivedMaps, normal: 'opengl', slope: true}, {x: 10, y: 10});
    // Normal leans west (red below mid), no north/south tilt
    const [r, g] = px(normal.data, 5, 2, 1, 3);
    expect(r).toBeLessThan(128);
    expect(g).toBe(128);
    expect(px(slope.data, 5, 2, 1)[0]).toBe(Math.round(45 / 90 * 255));
  });

  test('DirectX flips green relative to OpenGL', () => {
    // Rises towards the bottom of the image (south)
    const h = ramp(3, 5, (_x, y) => y * 5);
    const gl = computeDerivedMaps(h, 3, 5, {...noDerivedMaps, normal: 'opengl'}, {x: 10, y: 10})[0];
    const dx = computeDerivedMaps(h, 3, 5, {...noDerivedMaps, normal: 'directx'}, {x: 10, y: 10})[0];
    expect(gl.name).toBe('normal_gl');
    expect(dx.name).toBe('normal_dx');
    const glG = px(gl.data, 3, 1, 2, 3)[1];
    const dxG = px(dx.data, 3, 1, 2, 3)[1];
    // Surface faces north (up the image), so OpenGL green is above mid
    expect(glG).toBeGreaterThan(128);
    expect(dxG).toBeLessThan(128);
    expect(glG + dxG).toBeCloseTo(255, -1);
  });

  test('curvature is bright on a peak and dark in a pit', () => {
    const peak = ramp(3, 3, (x, y) => (x === 1 && y === 1 ? 5 : 0));
    const pit = ramp(3, 3, (x, y) => (x === 1 && y === 1 ? -5 : 0));
    const opts = {...noDerivedMaps, curvature: true};
    expect(px(computeDerivedMaps(peak, 3, 3, opts, {x: 10, y: 10})[0].data, 3, 1, 1)[0]).toBeGreaterThan(128);
    expect(px(computeDerivedMaps(pit, 3, 3, opts, {x: 10, y: 10})[0].data, 3, 1, 1)[0]).toBeLessThan(128);
  });

  test('water mask marks samples at or below the water level', () => {
    const h = new Float32Array([-10, 0, 0.5, 20]);
    const [mask] = computeDerivedMaps(h, 4, 1, {...noDerivedMaps, waterMask: true}, {x: 1, y: 1}, 0);
    expect(mask.name).toBe('watermask');
    expect(Array.from(mask.data)).toEqual([255, 255, 0, 0]);
  });

  test('height bands cover every pixel and blend at edges', () => {
    const h = new Float32Array([0, 499, 500, 501, 1000, 1499, 1500, 3000]);
    const bands = computeHeightBands(h, [1500, 500]);
    expect(bands.map(b => b.name)).toEqual(['band_00_below_500m', 'band_01_500m-1500m', 'band_02_above_1500m']);
    for (let i = 0; i < h.length; i++) {
      const total = bands.reduce((sum, b) => sum + b.data[i], 0);
      expect(Math.abs(total - 255)).toBeLessThanOrEqual(1);
    }
    // Well inside each band = full weight
    expect(bands[0].data[0]).toBe(255);
    expect(bands[1].data[4]).toBe(255);
    expect(bands[2].data[7]).toBe(255);
    // Right on an edge = half and half
    expect(bands[0].data[2]).toBe(128);
    expect(bands[1].data[2]).toBe(128);
  });
});
