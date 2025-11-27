import PNG from '../src/png';

const bytesToArray = (buffer: Uint8Array) => Array.from(buffer);

describe('PNG conversion helpers', () => {
  it('encodes Float32 samples to big-endian 16-bit buffers', () => {
    const samples = new Float32Array([0, 1, 255, 256, 513.9]);
    const encoded = PNG.Float32ArrayToPng16Bit(samples);

    expect(bytesToArray(encoded)).toEqual([
      0x00, 0x00,
      0x00, 0x01,
      0x00, 0xff,
      0x01, 0x00,
      0x02, 0x01,
    ]);
  });

  it('encodes Uint16 samples without reallocating', () => {
    const buffer = new Uint16Array([0, 65535, 42]);
    const encoded = PNG.Uint16ArrayToPng16Bit(buffer);

    expect(bytesToArray(encoded)).toEqual([
      0x00, 0x00,
      0xff, 0xff,
      0x00, 0x2a,
    ]);
  });
});
