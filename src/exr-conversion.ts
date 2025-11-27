import { EXR_LUT } from './exr-lut';

const UINT16_MAX = 65535;

const clampToUint16 = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= UINT16_MAX) {
    return UINT16_MAX;
  }
  return Math.floor(value);
};

export const mapHeightSamplesToExr = (data: Float32Array): Float32Array => {
  const result = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const sample = clampToUint16(data[i]);
    result[i] = EXR_LUT[sample];
  }
  return result;
};
