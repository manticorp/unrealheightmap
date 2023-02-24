var nextZero = function (data, p) { while (data[p] != 0)
    p++; return p; };
var readUshort = function (buff, p) { return (buff[p] << 8) | buff[p + 1]; };
var writeUshort = function (buff, p, n) { buff[p] = (n >> 8) & 255; buff[p + 1] = n & 255; };
var readUint = function (buff, p) { return (buff[p] * (256 * 256 * 256)) + ((buff[p + 1] << 16) | (buff[p + 2] << 8) | buff[p + 3]); };
var writeUint = function (buff, p, n) { buff[p] = (n >> 24) & 255; buff[p + 1] = (n >> 16) & 255; buff[p + 2] = (n >> 8) & 255; buff[p + 3] = n & 255; };
var readASCII = function (buff, p, l) { var s = ''; for (var i = 0; i < l; i++)
    s += String.fromCharCode(buff[p + i]); return s; };
var writeASCII = function (data, p, s) { for (var i = 0; i < s.length; i++)
    data[p + i] = s.charCodeAt(i); };
var readBytes = function (buff, p, l) { var arr = []; for (var i = 0; i < l; i++)
    arr.push(buff[p + i]); return arr; };
var pad = function (n) { return n.length < 2 ? '0' + n : n; };
var readUTF8 = function (buff, p, l) {
    var s = '';
    var ns;
    for (var i = 0; i < l; i++)
        s += '%' + pad(buff[p + i].toString(16));
    try {
        ns = decodeURIComponent(s);
    }
    catch (e) {
        return readASCII(buff, p, l);
    }
    return ns;
};
var bufferReader = {
    nextZero: nextZero,
    readUshort: readUshort,
    writeUshort: writeUshort,
    readUint: readUint,
    writeUint: writeUint,
    readASCII: readASCII,
    writeASCII: writeASCII,
    readBytes: readBytes,
    pad: pad,
    readUTF8: readUTF8,
};
export default bufferReader;
//# sourceMappingURL=buffer.js.map