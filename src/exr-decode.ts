export type ChannelSampleArray = Uint16Array | Float32Array | Uint32Array;

export type ExrChannel = {
  name: string;
  pixelType: number;
  data: ChannelSampleArray;
};

export type ExrImage = {
  width: number;
  height: number;
  channels: ExrChannel[];
};

const readCString = (view: DataView, offset: number) => {
  let cursor = offset;
  while (view.getUint8(cursor) !== 0) {
    cursor++;
  }
  const value = Buffer.from(view.buffer, view.byteOffset + offset, cursor - offset).toString('ascii');
  return { value, nextOffset: cursor + 1 };
};

export const decodeExr = (buffer: Uint8Array): ExrImage => {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 0;
  const readUint32 = () => {
    const value = view.getUint32(offset, true);
    offset += 4;
    return value;
  };
  const readInt32 = () => {
    const value = view.getInt32(offset, true);
    offset += 4;
    return value;
  };

  const magic = readUint32();
  if (magic !== 20000630) {
    throw new Error('Invalid EXR magic number');
  }
  const version = readUint32();
  if (version === 0) {
    throw new Error('Unsupported EXR version');
  }

  type ChannelHeader = { name: string; pixelType: number };
  const channelHeaders: ChannelHeader[] = [];
  let dataWindow: { xMin: number; yMin: number; xMax: number; yMax: number } | null = null;

  while (true) {
    const { value: attrName, nextOffset } = readCString(view, offset);
    offset = nextOffset;
    if (attrName.length === 0) {
      break;
    }
    const typeInfo = readCString(view, offset);
    offset = typeInfo.nextOffset;
    const size = readUint32();
    const attrStart = offset;

    if (attrName === 'channels' && typeInfo.value === 'chlist') {
      while (offset < attrStart + size) {
        const channelNameInfo = readCString(view, offset);
        offset = channelNameInfo.nextOffset;
        if (channelNameInfo.value.length === 0) {
          break;
        }
        const pixelType = readInt32();
        offset += 1 + 3; // pLinear + reserved
        offset += 4; // xSampling
        offset += 4; // ySampling
        channelHeaders.push({ name: channelNameInfo.value, pixelType });
      }
      offset = attrStart + size;
    } else if (attrName === 'dataWindow' && typeInfo.value === 'box2i') {
      const xMin = view.getInt32(offset, true);
      const yMin = view.getInt32(offset + 4, true);
      const xMax = view.getInt32(offset + 8, true);
      const yMax = view.getInt32(offset + 12, true);
      dataWindow = { xMin, yMin, xMax, yMax };
      offset = attrStart + size;
    } else {
      offset += size;
    }
  }

  if (!dataWindow) {
    throw new Error('EXR missing dataWindow');
  }

  const width = dataWindow.xMax - dataWindow.xMin + 1;
  const height = dataWindow.yMax - dataWindow.yMin + 1;

  const chunkOffsets: number[] = [];
  for (let i = 0; i < height; i++) {
    const low = view.getUint32(offset, true);
    const high = view.getUint32(offset + 4, true);
    chunkOffsets.push(low + high * 0x100000000);
    offset += 8;
  }

  const channels: ExrChannel[] = channelHeaders.map((header) => {
    if (header.pixelType === 1) {
      return { name: header.name, pixelType: header.pixelType, data: new Uint16Array(width * height) };
    }
    if (header.pixelType === 2) {
      return { name: header.name, pixelType: header.pixelType, data: new Float32Array(width * height) };
    }
    return { name: header.name, pixelType: header.pixelType, data: new Uint32Array(width * height) };
  });

  const readHalfSample = (pos: number) => view.getUint16(pos, true);
  const readFloatSample = (pos: number) => view.getFloat32(pos, true);
  const readUintSample = (pos: number) => view.getUint32(pos, true);

  for (const chunkOffset of chunkOffsets) {
    const y = view.getInt32(chunkOffset, true);
    const rowIndex = y - dataWindow.yMin;
    const dataSize = view.getUint32(chunkOffset + 4, true);
    let cursor = chunkOffset + 8;
    const rowStart = rowIndex * width;

    channels.forEach((channel) => {
      if (channel.pixelType === 1) {
        const dest = channel.data as Uint16Array;
        for (let x = 0; x < width; x++) {
          dest[rowStart + x] = readHalfSample(cursor);
          cursor += 2;
        }
      } else if (channel.pixelType === 2) {
        const dest = channel.data as Float32Array;
        for (let x = 0; x < width; x++) {
          dest[rowStart + x] = readFloatSample(cursor);
          cursor += 4;
        }
      } else {
        const dest = channel.data as Uint32Array;
        for (let x = 0; x < width; x++) {
          dest[rowStart + x] = readUintSample(cursor);
          cursor += 4;
        }
      }
    });

    const consumed = cursor - (chunkOffset + 8);
    if (consumed !== dataSize) {
      throw new Error('Unexpected EXR chunk size mismatch');
    }
  }

  return { width, height, channels };
};
