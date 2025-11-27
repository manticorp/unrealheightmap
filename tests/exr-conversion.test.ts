const LUT_SIZE = 65536;
const buildLut = () => {
  const data = new Float32Array(LUT_SIZE);
  for (let i = 0; i < LUT_SIZE; i++) {
    data[i] = i / LUT_SIZE;
  }
  return data;
};

jest.mock('../src/exr-lut', () => ({
  EXR_LUT: buildLut(),
}));

import { mapHeightSamplesToExr } from '../src/exr-conversion';

describe('mapHeightSamplesToExr', () => {
  it('clamps inputs and maps through the LUT', () => {
    const input = new Float32Array([
      -10,
      0,
      1,
      42.8,
      65535,
      99999,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]);

    const mapped = mapHeightSamplesToExr(input);

    expect(mapped[0]).toBe(0);
    expect(mapped[1]).toBe(0);
    expect(mapped[2]).toBeCloseTo(1 / LUT_SIZE);
    expect(mapped[3]).toBeCloseTo(42 / LUT_SIZE);
    expect(mapped[4]).toBeCloseTo(65535 / LUT_SIZE);
    expect(mapped[5]).toBeCloseTo(65535 / LUT_SIZE);
    expect(mapped[6]).toBe(0);
    expect(mapped[7]).toBe(0);
  });
});
