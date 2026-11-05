import {
  computeAmbientOcclusion,
  computeDerivedMaps,
  computeFlowAccumulation,
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
    expect(wantsDerivedMaps({...noDerivedMaps, ao: true})).toBe(true);
    expect(wantsDerivedMaps({...noDerivedMaps, flow: true})).toBe(true);
    expect(wantsDerivedMaps({...noDerivedMaps, aspect: true})).toBe(true);
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

  describe('aspect', () => {
    const aspectDegrees = (v: number) => (v - 1 + 0.5) / 255 * 360;

    test('ground sloping down towards the north faces north', () => {
      // Row 0 is north, so heights rising with y fall away northwards
      const h = ramp(5, 5, (_x, y) => y * 10);
      const [aspect, northness] = computeDerivedMaps(h, 5, 5, {...noDerivedMaps, aspect: true}, {x: 10, y: 10});
      expect(aspect.name).toBe('aspect');
      expect(northness.name).toBe('northness');
      expect(aspectDegrees(px(aspect.data, 5, 2, 2)[0])).toBeLessThan(2);
      expect(px(northness.data, 5, 2, 2)[0]).toBe(255);
    });

    test('east and south facing slopes', () => {
      const east = ramp(5, 5, (x) => -x * 10);
      const [aspect, northness] = computeDerivedMaps(east, 5, 5, {...noDerivedMaps, aspect: true}, {x: 10, y: 10});
      expect(aspectDegrees(px(aspect.data, 5, 2, 2)[0])).toBeCloseTo(90, 0);
      expect(px(northness.data, 5, 2, 2)[0]).toBe(128);
      const south = ramp(5, 5, (_x, y) => -y * 10);
      const [southAspect, southNorthness] = computeDerivedMaps(south, 5, 5, {...noDerivedMaps, aspect: true}, {x: 10, y: 10});
      expect(aspectDegrees(px(southAspect.data, 5, 2, 2)[0])).toBeCloseTo(180, 0);
      expect(px(southNorthness.data, 5, 2, 2)[0]).toBe(0);
    });

    test('flat ground has aspect 0 and neutral northness', () => {
      const [aspect, northness] = computeDerivedMaps(ramp(3, 3, () => 7), 3, 3, {...noDerivedMaps, aspect: true}, {x: 1, y: 1});
      expect(px(aspect.data, 3, 1, 1)).toEqual([0]);
      expect(px(northness.data, 3, 1, 1)).toEqual([128]);
    });
  });

  describe('ambient occlusion', () => {
    test('flat ground is fully open', () => {
      const [ao] = computeDerivedMaps(ramp(20, 20, () => 100), 20, 20, {...noDerivedMaps, ao: true}, {x: 10, y: 10});
      expect(ao.name).toBe('ao');
      expect(Array.from(ao.data).every(v => v === 255)).toBe(true);
    });

    test('a pit is darker than a peak', () => {
      const bowl = (sign: number) => ramp(41, 41, (x, y) => sign * Math.hypot(x - 20, y - 20) * 5);
      const pit = computeAmbientOcclusion(bowl(1), 41, 41, {x: 10, y: 10}, 200);
      const peak = computeAmbientOcclusion(bowl(-1), 41, 41, {x: 10, y: 10}, 200);
      expect(px(peak, 41, 20, 20)[0]).toBe(255);
      expect(px(pit, 41, 20, 20)[0]).toBeLessThan(200);
    });

    test('a wall only shades pixels within the radius', () => {
      // 100 m cliff along the east edge
      const h = ramp(60, 3, (x) => (x >= 55 ? 100 : 0));
      const ao = computeAmbientOcclusion(h, 60, 3, {x: 1, y: 1}, 20);
      expect(px(ao, 60, 50, 1)[0]).toBeLessThan(255);
      expect(px(ao, 60, 20, 1)[0]).toBe(255);
    });
  });

  describe('flow accumulation', () => {
    test('a V-shaped valley collects along its floor', () => {
      // Valley floor along x = 10, draining north (towards row 0)
      const w = 21;
      const h = ramp(w, 30, (x, y) => Math.abs(x - 10) * 5 + y);
      const {cells} = computeFlowAccumulation(h, w, 30, {x: 10, y: 10});
      const floor = (y: number) => cells[y * w + 10];
      expect(floor(1)).toBeGreaterThan(floor(15));
      expect(floor(15)).toBeGreaterThan(floor(28));
      expect(floor(1)).toBeGreaterThan(w * 20);
      // Hillsides carry next to nothing
      expect(cells[15 * w + 3]).toBeLessThan(5);
      const [flow] = computeDerivedMaps(h, w, 30, {...noDerivedMaps, flow: true}, {x: 10, y: 10});
      expect(flow.name).toBe('flow');
      expect(px(flow.data, w, 10, 1)[0]).toBeGreaterThan(px(flow.data, w, 3, 15)[0]);
    });

    test('a depression is filled and drained through its spill point', () => {
      // Plane falling west with a pit in the middle; everything must still reach the west edge
      const w = 15;
      const h = ramp(w, 9, (x, y) => (x >= 6 && x <= 8 && y >= 3 && y <= 5 ? 0 : x * 2 + 10));
      const {cells, receiver} = computeFlowAccumulation(h, w, 9);
      const pitCentre = 4 * w + 7;
      expect(receiver[pitCentre]).toBeGreaterThanOrEqual(0);
      // Follow the pit's water out of the map
      let c = pitCentre;
      let spill = -1;
      let steps = 0;
      while (receiver[c] >= 0 && steps++ < w * 9) {
        c = receiver[c];
        if (spill < 0 && c % w < 6) {
          spill = c;
        }
      }
      expect(receiver[c]).toBe(-1);
      expect(c % w).toBe(0);
      // The whole pit drains through the first cell past its rim
      expect(cells[spill]).toBeGreaterThan(9);
    });

    test('every cell is counted exactly once at the outlets of a tilted plane', () => {
      const w = 17;
      const ht = 11;
      const h = ramp(w, ht, (x, y) => x * 3 + y * 1.5);
      const {cells, receiver} = computeFlowAccumulation(h, w, ht, {x: 30, y: 30});
      let outflow = 0;
      for (let i = 0; i < w * ht; i++) {
        if (receiver[i] < 0) {
          outflow += cells[i];
        }
      }
      expect(outflow).toBe(w * ht);
    });

    test('flow map uses a fixed area scale', () => {
      const h = ramp(5, 5, (x, y) => x + y);
      const a = computeDerivedMaps(h, 5, 5, {...noDerivedMaps, flow: true}, {x: 10, y: 10})[0];
      // A ridge cell with nothing upstream is 0
      expect(px(a.data, 5, 4, 4)).toEqual([0]);
    });
  });
});
