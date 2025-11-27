import fs from 'fs';
import path from 'path';
import PNG from '../src/png';
import { decodeExr } from '../src/exr-decode';

const resourcesDir = path.resolve(__dirname, '../tests/resources');
const pngPath = path.join(resourcesDir, 'heightmap_16bit.png');
const exrPath = path.join(resourcesDir, 'heightmap_32bit.exr');

const loadUint16Data = () => {
  const buffer = fs.readFileSync(pngPath);
  const png = PNG.fromBuffer(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  return png.getImageData() as Uint16Array;
};

const loadExrData = () => {
  const buffer = fs.readFileSync(exrPath);
  const exr = decodeExr(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
  const [firstChannel] = exr.channels;
  if (!firstChannel) {
    throw new Error('EXR file did not contain channels');
  }
  return firstChannel.data as Float32Array;
};

const pngData = loadUint16Data();
const exrData = loadExrData();

if (pngData.length !== exrData.length) {
  throw new Error('Fixture data length mismatch');
}

const sampleCount = 65536;
const sums = new Float64Array(sampleCount);
const counts = new Uint32Array(sampleCount);

for (let i = 0; i < pngData.length; i++) {
  const sample = pngData[i];
  sums[sample] += exrData[i];
  counts[sample] += 1;
}

const lut = new Float32Array(sampleCount);
for (let i = 0; i < sampleCount; i++) {
  if (counts[i] > 0) {
    lut[i] = sums[i] / counts[i];
  } else {
    lut[i] = Number.NaN;
  }
}

let lastKnownIndex = -1;
for (let i = 0; i < sampleCount; i++) {
  if (!Number.isNaN(lut[i])) {
    lastKnownIndex = i;
    continue;
  }
  let nextIndex = i + 1;
  while (nextIndex < sampleCount && Number.isNaN(lut[nextIndex])) {
    nextIndex++;
  }
  const prevValue = lastKnownIndex >= 0 ? lut[lastKnownIndex] : lut[nextIndex];
  const nextValue = nextIndex < sampleCount ? lut[nextIndex] : prevValue;
  if (lastKnownIndex < 0 || nextIndex >= sampleCount) {
    lut[i] = prevValue;
  } else {
    const ratio = (i - lastKnownIndex) / (nextIndex - lastKnownIndex);
    lut[i] = prevValue + (nextValue - prevValue) * ratio;
  }
}

const buffer = Buffer.from(lut.buffer);
const base64 = buffer.toString('base64');

const output = `const decodeBase64 = (value: string): Uint8Array => {\n  if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {\n    return new Uint8Array(Buffer.from(value, 'base64'));\n  }\n  if (typeof atob === 'function') {\n    const binary = atob(value);\n    const bytes = new Uint8Array(binary.length);\n    for (let i = 0; i < binary.length; i++) {\n      bytes[i] = binary.charCodeAt(i);\n    }\n    return bytes;\n  }\n  throw new Error('Base64 decoder not available');\n};\n\nconst LUT_BASE64 = '${base64}';\nconst LUT_BYTES = decodeBase64(LUT_BASE64);\nexport const EXR_LUT = new Float32Array(LUT_BYTES.buffer, LUT_BYTES.byteOffset, LUT_BYTES.byteLength / 4);\n`;

const targetPath = path.resolve(__dirname, '../src/exr-lut.ts');
fs.writeFileSync(targetPath, output);
console.log('Generated LUT at', targetPath);
