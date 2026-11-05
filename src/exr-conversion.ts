/**
 * Turn heightmap samples into the float values written to an OpenEXR file.
 *
 * Heights are data, not colour, so they are written linearly:
 * - 'normalised': samples are 0–65535 normalised heights (as written to the
 *   16-bit PNG) and become 0.0–1.0, black = lowest point, white = highest.
 * - 'metres': samples are already heights in metres (normalisation off) and
 *   are written unchanged, including values below sea level.
 *
 * Earlier versions mapped samples through a lookup table fitted to an EXR
 * saved by Photoshop. Photoshop treats a grayscale PNG as gamma-encoded and
 * converts it to linear light (gamma ≈ 1.74), which bent the terrain: mid
 * heights came out too low in every tool that reads EXR values as data.
 */
export type ExrHeightMode = 'normalised' | 'metres';

const UINT16_MAX = 65535;

export const mapHeightSamplesToExr = (data: Float32Array, mode: ExrHeightMode = 'normalised'): Float32Array => {
  const result = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const sample = data[i];
    if (!Number.isFinite(sample)) {
      result[i] = 0;
    } else if (mode === 'metres') {
      result[i] = sample;
    } else {
      result[i] = Math.min(1, Math.max(0, sample / UINT16_MAX));
    }
  }
  return result;
};
