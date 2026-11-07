import {haversine, niceStep, profileCsv, profileStats, profileZoom, samplePath, sampleTile, tilePosition, tilesForSamples} from '../src/profile';

describe('profile sampling', () => {
  test('haversine matches a known distance', () => {
    // One degree of latitude is ~111.2 km
    expect(haversine({lat: 0, lng: 0}, {lat: 1, lng: 0})).toBeCloseTo(111195, -2);
  });

  test('samplePath spaces samples evenly across legs and keeps both ends', () => {
    const pts = [{lat: 0, lng: 0}, {lat: 0, lng: 1}, {lat: 0, lng: 3}];
    const s = samplePath(pts, 7);
    expect(s).toHaveLength(7);
    expect(s[0]).toMatchObject({lat: 0, lng: 0, distance: 0});
    expect(s[6].lng).toBeCloseTo(3, 9);
    for (let i = 1; i < s.length; i++) {
      expect(s[i].lng - s[i - 1].lng).toBeCloseTo(0.5, 6);
    }
  });

  test('tilesForSamples groups samples per tile', () => {
    const tiles = tilesForSamples([{lat: 0.1, lng: 0.1}, {lat: 0.2, lng: 0.2}, {lat: -0.1, lng: -0.1}], 4);
    expect(tiles).toHaveLength(2);
    expect(tiles.reduce((n, t) => n + t.indices.length, 0)).toBe(3);
  });

  test('sampleTile interpolates a ramp', () => {
    const heights = new Float32Array(256 * 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) heights[y * 256 + x] = x;
    const z = 10;
    const p = tilePosition(10, 20, z);
    const tx = Math.floor(p.x), ty = Math.floor(p.y);
    const expected = (p.x - tx) * 256 - 0.5;
    expect(sampleTile(heights, tx, ty, 10, 20, z)).toBeCloseTo(Math.max(0, Math.min(255, expected)), 3);
  });

  test('profileStats ignores small noise in gain/loss', () => {
    const samples = samplePath([{lat: 0, lng: 0}, {lat: 0, lng: 0.01}], 6);
    const heights = [100, 101, 100, 150, 120, 121];
    const stats = profileStats(samples, heights, 2);
    expect(stats.min).toBe(100);
    expect(stats.max).toBe(150);
    expect(stats.gain).toBe(50);
    expect(stats.loss).toBe(30);
    expect(stats.maxGradePercent).toBeGreaterThan(0);
  });

  test('profileZoom picks a zoom near the sample spacing and respects the cap', () => {
    expect(profileZoom(10000, 101, 0, 15)).toBeGreaterThanOrEqual(10);
    expect(profileZoom(100, 1001, 0, 12)).toBe(12);
  });

  test('niceStep and csv', () => {
    expect(niceStep(1000, 5)).toBe(200);
    expect(niceStep(37, 5)).toBe(5);
    expect(niceStep(45, 5)).toBe(10);
    const samples = samplePath([{lat: 0, lng: 0}, {lat: 0, lng: 0.001}], 2);
    expect(profileCsv(samples, [1, 2]).split('\n')[0]).toBe('distance_m,latitude,longitude,elevation_m');
  });
});
