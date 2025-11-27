const MAGIC_NUMBER = 20000630;
const VERSION_FIELD = 2; // version 2, no additional flags
const COMPRESSION_NONE = 0;
const LINE_ORDER_INCREASING_Y = 0;
const CHANNEL_NAMES = ["B", "G", "R"]; // Stored alphabetically per OpenEXR spec

export enum ExrPixelType {
  Half = 1,
  Float = 2
}

export type ExrEncodeOptions = {
  width: number;
  height: number;
  data: Float32Array;
  pixelType: ExrPixelType;
};

class ByteWriter {
  private bytes: number[] = [];

  writeUint8(value: number) {
    this.bytes.push(value & 0xff);
  }

  writeUint16(value: number) {
    const v = value & 0xffff;
    this.bytes.push(v & 0xff, (v >> 8) & 0xff);
  }

  writeInt32(value: number) {
    const v = value | 0;
    this.bytes.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff);
  }

  writeUint32(value: number) {
    const v = value >>> 0;
    this.bytes.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff);
  }

  writeFloat32(value: number) {
    const buffer = new ArrayBuffer(4);
    new DataView(buffer).setFloat32(0, value, true);
    this.writeBytes(new Uint8Array(buffer));
  }

  writeStringZero(value: string) {
    for (let i = 0; i < value.length; i++) {
      this.writeUint8(value.charCodeAt(i));
    }
    this.writeUint8(0);
  }

  writeBytes(data: ArrayLike<number>) {
    for (let i = 0; i < data.length; i++) {
      this.bytes.push(data[i] & 0xff);
    }
  }

  toUint8Array() {
    return Uint8Array.from(this.bytes);
  }

  get length() {
    return this.bytes.length;
  }
}

const floatBuffer = new Float32Array(1);
const uintBuffer = new Uint32Array(floatBuffer.buffer);

const float32ToHalf = (value: number): number => {
  if (!Number.isFinite(value)) {
    if (Number.isNaN(value)) {
      return 0x7e00;
    }
    return value > 0 ? 0x7c00 : 0xfc00;
  }
  floatBuffer[0] = value;
  const x = uintBuffer[0];

  const sign = (x >> 16) & 0x8000;
  let exponent = ((x >> 23) & 0xff) - 127 + 15;
  let mantissa = x & 0x7fffff;

  if (exponent <= 0) {
    if (exponent < -10) {
      return sign; // Underflow to zero
    }
    mantissa = (mantissa | 0x800000) >> (1 - exponent);
    return sign | ((mantissa + 0x1000) >> 13);
  } else if (exponent >= 31) {
    if (mantissa === 0) {
      return sign | 0x7c00; // Infinity
    }
    mantissa = (mantissa >> 13) | 0x200;
    return sign | 0x7c00 | mantissa; // NaN
  }

  return sign | (exponent << 10) | ((mantissa + 0x1000) >> 13);
};

const writeAttribute = (
  writer: ByteWriter,
  name: string,
  type: string,
  fill: (valueWriter: ByteWriter) => void
) => {
  writer.writeStringZero(name);
  writer.writeStringZero(type);
  const temp = new ByteWriter();
  fill(temp);
  writer.writeUint32(temp.length);
  writer.writeBytes(temp.toUint8Array());
};

const buildHeader = (width: number, height: number, pixelType: ExrPixelType): Uint8Array => {
  const writer = new ByteWriter();

  writeAttribute(writer, "channels", "chlist", (valueWriter) => {
    for (const name of CHANNEL_NAMES) {
      valueWriter.writeStringZero(name);
      valueWriter.writeInt32(pixelType);
      valueWriter.writeUint8(0); // pLinear
      valueWriter.writeUint8(0);
      valueWriter.writeUint8(0);
      valueWriter.writeUint8(0);
      valueWriter.writeInt32(1); // xSampling
      valueWriter.writeInt32(1); // ySampling
    }
    valueWriter.writeUint8(0); // list terminator
  });

  writeAttribute(writer, "compression", "compression", (valueWriter) => {
    valueWriter.writeUint8(COMPRESSION_NONE);
  });

  const writeBox2i = (valueWriter: ByteWriter) => {
    valueWriter.writeInt32(0);
    valueWriter.writeInt32(0);
    valueWriter.writeInt32(width - 1);
    valueWriter.writeInt32(height - 1);
  };

  writeAttribute(writer, "dataWindow", "box2i", writeBox2i);
  writeAttribute(writer, "displayWindow", "box2i", writeBox2i);

  writeAttribute(writer, "lineOrder", "lineOrder", (valueWriter) => {
    valueWriter.writeUint8(LINE_ORDER_INCREASING_Y);
  });

  writeAttribute(writer, "pixelAspectRatio", "float", (valueWriter) => {
    valueWriter.writeFloat32(1.0);
  });

  writeAttribute(writer, "screenWindowCenter", "v2f", (valueWriter) => {
    valueWriter.writeFloat32(0);
    valueWriter.writeFloat32(0);
  });

  writeAttribute(writer, "screenWindowWidth", "float", (valueWriter) => {
    valueWriter.writeFloat32(1.0);
  });

  writer.writeUint8(0); // end of header

  return writer.toUint8Array();
};

const writeUint64LE = (view: DataView, offset: number, value: number) => {
  const low = value >>> 0;
  const high = Math.floor(value / 0x100000000);
  view.setUint32(offset, low, true);
  view.setUint32(offset + 4, high, true);
};

export const encodeExr = ({ width, height, data, pixelType }: ExrEncodeOptions): Uint8Array => {
  if (data.length !== width * height) {
    throw new Error("EXR encoding requires width * height data samples");
  }

  const header = buildHeader(width, height, pixelType);
  const bytesPerSample = pixelType === ExrPixelType.Half ? 2 : 4;
  const channelsPerPixel = CHANNEL_NAMES.length;
  const scanlineDataSize = channelsPerPixel * width * bytesPerSample;
  const chunkSize = 8 + scanlineDataSize; // y coordinate + data size + data
  const totalSize =
    8 + // magic + version
    header.length +
    height * 8 + // line offset table
    chunkSize * height;

  const buffer = new ArrayBuffer(totalSize);
  const uint8 = new Uint8Array(buffer);
  const view = new DataView(buffer);

  let offset = 0;
  view.setUint32(offset, MAGIC_NUMBER, true);
  offset += 4;
  view.setUint32(offset, VERSION_FIELD, true);
  offset += 4;

  uint8.set(header, offset);
  offset += header.length;

  const lineTableStart = offset;
  offset += height * 8; // reserve space for offset table

  let chunkOffset = offset;
  for (let y = 0; y < height; y++) {
    writeUint64LE(view, lineTableStart + y * 8, chunkOffset);

    view.setInt32(offset, y, true);
    offset += 4;
    view.setUint32(offset, scanlineDataSize, true);
    offset += 4;

    const rowOffset = y * width;
    for (let channelIndex = 0; channelIndex < CHANNEL_NAMES.length; channelIndex++) {
      for (let x = 0; x < width; x++) {
        const sample = data[rowOffset + x] ?? 0;
        if (pixelType === ExrPixelType.Half) {
          view.setUint16(offset, float32ToHalf(sample), true);
          offset += 2;
        } else {
          view.setFloat32(offset, sample, true);
          offset += 4;
        }
      }
    }

    chunkOffset += chunkSize;
  }

  return uint8;
};
