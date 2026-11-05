import { mapHeightSamplesToExr } from '../src/exr-conversion';

describe('mapHeightSamplesToExr', () => {
  it('maps normalised 16-bit samples linearly to 0–1 and clamps', () => {
    const input = new Float32Array([-10, 0, 16383.75, 32767.5, 49151.25, 65535, 65536, 99999, Number.NaN, Number.POSITIVE_INFINITY]);
    const mapped = mapHeightSamplesToExr(input);
    expect(mapped[0]).toBe(0);
    expect(mapped[1]).toBe(0);
    expect(mapped[2]).toBeCloseTo(0.25, 6);
    expect(mapped[3]).toBeCloseTo(0.5, 6);
    expect(mapped[4]).toBeCloseTo(0.75, 6);
    expect(mapped[5]).toBe(1);
    expect(mapped[6]).toBe(1);
    expect(mapped[7]).toBe(1);
    expect(mapped[8]).toBe(0);
    expect(mapped[9]).toBe(0);
  });

  it('defaults to normalised mode', () => {
    expect(mapHeightSamplesToExr(new Float32Array([32767.5]))[0]).toBeCloseTo(0.5, 6);
  });

  it('keeps heights in metres unchanged, including below sea level', () => {
    const mapped = mapHeightSamplesToExr(new Float32Array([-412.5, 0, 1234.56, 8848.86, Number.NaN]), 'metres');
    expect(mapped[0]).toBeCloseTo(-412.5, 4);
    expect(mapped[1]).toBe(0);
    expect(mapped[2]).toBeCloseTo(1234.56, 3);
    expect(mapped[3]).toBeCloseTo(8848.86, 3);
    expect(mapped[4]).toBe(0);
  });
});
