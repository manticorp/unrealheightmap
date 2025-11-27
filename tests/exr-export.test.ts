import fs from 'fs';
import path from 'path';
import PNG from './../src/png';
import { encodeExr, ExrPixelType } from './../src/exr';
import { mapHeightSamplesToExr } from './../src/exr-conversion';
import { decodeExr, ChannelSampleArray, ExrImage, ExrChannel } from './../src/exr-decode';

const resourcesDir = path.resolve(__dirname, 'resources');

const bufferToArrayBuffer = (buffer: Buffer): ArrayBuffer => {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

const loadHeightmapPng = (fileName: string) => {
  const pngBuffer = fs.readFileSync(path.join(resourcesDir, fileName));
  const png = PNG.fromBuffer(bufferToArrayBuffer(pngBuffer));
  const { width, height } = png.getIHDR();
  const raw = png.getImageData() as Uint16Array;
  const floatData = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    floatData[i] = raw[i];
  }
  const exrInput = mapHeightSamplesToExr(floatData);
  const gamma = png.getgAMA() ?? 1;
  const srgb = png.getsRGB?.() ?? null;
  const icc = png.getiCCP?.();
  const chroma = png.getcHRM?.();
  return { width, height, pngData: raw, exrInput, gamma, srgb, iccProfile: icc, chroma };
};


const expectTypedArraysEqual = (actual: ChannelSampleArray, expected: ChannelSampleArray, pixelType: number) => {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    const expectedValue = expected[i as number];
    const actualValue = actual[i as number];
    if (Number.isNaN(expectedValue as number)) {
      expect(Number.isNaN(actualValue as number)).toBe(true);
    } else {
      const diff = Math.abs((actualValue as number) - (expectedValue as number));
      if (pixelType === ExrPixelType.Half) {
        expect(diff).toBeLessThanOrEqual(1);
      } else if (pixelType === ExrPixelType.Float) {
        expect(diff).toBeLessThanOrEqual(1e-4);
      } else {
        expect(diff).toBe(0);
      }
    }
  }
};

const assertExrMatchesReference = (generated: Uint8Array, referencePath: string) => {
  const reference = fs.readFileSync(path.join(resourcesDir, referencePath));
  const decodedActual = decodeExr(generated);
  const decodedReference = decodeExr(new Uint8Array(bufferToArrayBuffer(reference)));

  expect(decodedActual.width).toBe(decodedReference.width);
  expect(decodedActual.height).toBe(decodedReference.height);

  const sortChannels = (channels: ExrChannel[]) =>
    [...channels].sort((a, b) => a.name.localeCompare(b.name));

  const actualChannels = sortChannels(decodedActual.channels);
  const expectedChannels = sortChannels(decodedReference.channels);

  expect(actualChannels.map((c) => c.name)).toEqual(expectedChannels.map((c) => c.name));

  for (let i = 0; i < actualChannels.length; i++) {
    expect(actualChannels[i].pixelType).toBe(expectedChannels[i].pixelType);
    expectTypedArraysEqual(actualChannels[i].data, expectedChannels[i].data, actualChannels[i].pixelType);
  }
};

const heightmap = loadHeightmapPng('heightmap_16bit.png');
// Optional debug aids while iterating locally.
if (process.env.DEBUG_EXR_FIXTURES === "1") {
  // eslint-disable-next-line no-console
  console.log('heightmap sample', {
    gamma: heightmap.gamma,
    srgb: heightmap.srgb,
    iccName: heightmap.iccProfile?.profileName,
    chroma: heightmap.chroma,
    values: Array.from(heightmap.pngData.slice(0, 8))
  });
  const reference32 = fs.readFileSync(path.join(resourcesDir, 'heightmap_32bit.exr'));
  const decodedReference = decodeExr(new Uint8Array(bufferToArrayBuffer(reference32)));
  const refChannels = decodedReference.channels;
  refChannels.forEach((channel) => {
    const data = channel.data as Float32Array;
    // eslint-disable-next-line no-console
    console.log(`reference ${channel.name} channel`, Array.from(data.slice(0, 8)));
  });
  const refSamples = refChannels[0].data as Float32Array;
  const ratios = [] as number[];
  const gammas = [] as number[];
  let numerator = 0;
  let denominator = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  let count = 0;
  for (let i = 0; i < 8; i++) {
    ratios.push(refSamples[i] / heightmap.pngData[i]);
    const norm = heightmap.pngData[i] / 65535;
    gammas.push(Math.log(refSamples[i]) / Math.log(norm));
  }
  let maxDiff = 0;
  let maxLinearDiff = 0;
  let maxModelDiff = 0;
  const approxGamma = 1.7371113906991213;
  let bestGamma = approxGamma;
  let bestError = Number.POSITIVE_INFINITY;
  for (let i = 0; i < refSamples.length; i++) {
    const norm = heightmap.pngData[i] / 65535;
    const val = refSamples[i];
    if (norm > 0 && val > 0) {
      const lnNorm = Math.log(norm);
      numerator += Math.log(val) * lnNorm;
      denominator += lnNorm * lnNorm;
      const lnVal = Math.log(val);
      sumX += lnNorm;
      sumY += lnVal;
      sumXX += lnNorm * lnNorm;
      sumXY += lnNorm * lnVal;
      count++;
    }
    const approx = Math.pow(norm, approxGamma);
    maxDiff = Math.max(maxDiff, Math.abs(approx - val));
    maxLinearDiff = Math.max(maxLinearDiff, Math.abs(norm - val));
  }
  for (let gammaCandidate = 1.4; gammaCandidate <= 2.2; gammaCandidate += 0.001) {
    let candidateError = 0;
    for (let i = 0; i < refSamples.length; i++) {
      const norm = heightmap.pngData[i] / 65535;
      const val = refSamples[i];
      const approx = Math.pow(norm, gammaCandidate);
      candidateError = Math.max(candidateError, Math.abs(approx - val));
      if (candidateError >= bestError) {
        break;
      }
    }
    if (candidateError < bestError) {
      bestError = candidateError;
      bestGamma = gammaCandidate;
    }
  }
  // eslint-disable-next-line no-console
  console.log('value ratios', ratios);
  // eslint-disable-next-line no-console
  console.log('gamma estimates', gammas);
  // eslint-disable-next-line no-console
  console.log('gamma aggregate', numerator / denominator);
  const gamma = (count * sumXY - sumX * sumY) / (count * sumXX - sumX * sumX);
  const lnA = (sumY - gamma * sumX) / count;
  const scale = Math.exp(lnA);
  for (let i = 0; i < refSamples.length; i++) {
    const norm = heightmap.pngData[i] / 65535;
    const model = scale * Math.pow(norm, gamma);
    maxModelDiff = Math.max(maxModelDiff, Math.abs(model - refSamples[i]));
  }
  // eslint-disable-next-line no-console
  console.log('regression', { gamma, scale, maxDiff, maxLinearDiff, maxModelDiff, bestGamma, bestError });
}

describe('OpenEXR export', () => {
  it('matches Photoshop 16-bit half EXR output', () => {
    const exrBuffer = encodeExr({
      width: heightmap.width,
      height: heightmap.height,
      data: heightmap.exrInput,
      pixelType: ExrPixelType.Half,
    });
    assertExrMatchesReference(exrBuffer, 'heightmap_16bit.exr');
  });

  it('matches Photoshop 32-bit float EXR output', () => {
    const exrBuffer = encodeExr({
      width: heightmap.width,
      height: heightmap.height,
      data: heightmap.exrInput,
      pixelType: ExrPixelType.Float,
    });
    assertExrMatchesReference(exrBuffer, 'heightmap_32bit.exr');
  });
});
