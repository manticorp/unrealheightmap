export type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

const nextZero = (data : TypedArray, p: number) => { while (data[p] != 0) p++; return p; };
const readUshort = (buff : TypedArray, p: number) => { return (buff[p] << 8) | buff[p + 1]; };
const writeUshort = (buff : TypedArray, p: number, n: number) => { buff[p] = (n >> 8) & 255; buff[p + 1] = n & 255; };
const readUint = (buff : TypedArray, p: number) => { return (buff[p] * (256 * 256 * 256)) + ((buff[p + 1] << 16) | (buff[p + 2] << 8) | buff[p + 3]); };
const writeUint = (buff : TypedArray, p: number, n: number) => { buff[p] = (n >> 24) & 255; buff[p + 1] = (n >> 16) & 255; buff[p + 2] = (n >> 8) & 255; buff[p + 3] = n & 255; };
const readASCII = (buff : TypedArray, p: number, l: number) => { let s = ''; for (let i = 0; i < l; i++) s += String.fromCharCode(buff[p + i]); return s; };
const writeASCII = (data : TypedArray, p: number, s: string) => { for (let i = 0; i < s.length; i++) data[p + i] = s.charCodeAt(i); };
const readBytes = (buff : TypedArray, p: number, l: number) => { const arr = []; for (let i = 0; i < l; i++) arr.push(buff[p + i]); return arr; };
const pad = (n: string) => { return n.length < 2 ? '0' + n : n; };
const readUTF8 = (buff : TypedArray, p: number, l: number) => {
  let s = ''; let ns;
  for (let i = 0; i < l; i++) s += '%' + pad(buff[p + i].toString(16));
  try { ns = decodeURIComponent(s); } catch (e) { return readASCII(buff, p, l); }
  return ns;
};

const bufferReader = {
  nextZero,
  readUshort,
  writeUshort,
  readUint,
  writeUint,
  readASCII,
  writeASCII,
  readBytes,
  pad,
  readUTF8,
};

export default bufferReader;