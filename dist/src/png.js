var pako = require('pako');
var pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
var ColorType;
(function (ColorType) {
    ColorType[ColorType["Grayscale"] = 0] = "Grayscale";
    ColorType[ColorType["Rgb"] = 2] = "Rgb";
    ColorType[ColorType["Palette"] = 3] = "Palette";
    ColorType[ColorType["GrayscaleAlpha"] = 4] = "GrayscaleAlpha";
    ColorType[ColorType["Rgba"] = 6] = "Rgba";
})(ColorType || (ColorType = {}));
var sRGBTypes;
(function (sRGBTypes) {
    sRGBTypes[sRGBTypes["Perceptual"] = 0] = "Perceptual";
    sRGBTypes[sRGBTypes["RelativeColorimetric"] = 1] = "RelativeColorimetric";
    sRGBTypes[sRGBTypes["Saturation"] = 2] = "Saturation";
    sRGBTypes[sRGBTypes["AbsoluteColorimetric"] = 3] = "AbsoluteColorimetric";
})(sRGBTypes || (sRGBTypes = {}));
;
var ResolutionUnit;
(function (ResolutionUnit) {
    ResolutionUnit[ResolutionUnit["Unknown"] = 0] = "Unknown";
    ResolutionUnit[ResolutionUnit["Meter"] = 1] = "Meter";
})(ResolutionUnit || (ResolutionUnit = {}));
;
var PngLineFilter;
(function (PngLineFilter) {
    PngLineFilter[PngLineFilter["None"] = 0] = "None";
    PngLineFilter[PngLineFilter["Sub"] = 1] = "Sub";
    PngLineFilter[PngLineFilter["Up"] = 2] = "Up";
    PngLineFilter[PngLineFilter["Average"] = 3] = "Average";
    PngLineFilter[PngLineFilter["Paeth"] = 4] = "Paeth";
})(PngLineFilter || (PngLineFilter = {}));
;
var PNG = /** @class */ (function () {
    function PNG() {
        this.offset = 0;
    }
    PNG.prototype.construct = function () { };
    PNG.fromBuffer = function (buffer) {
        return (new PNG).fromBuffer(buffer);
    };
    PNG.prototype.assertHasData = function () {
        this.assertHasDataview();
        this.assertHasBuffer();
    };
    PNG.prototype.assertHasBuffer = function () {
        if (!this.buffer) {
            throw new Error('Missing buffer');
        }
    };
    PNG.prototype.assertHasDataview = function () {
        if (!this.dataview) {
            throw new Error('Missing dataview');
        }
    };
    PNG.prototype.fromBuffer = function (buffer) {
        if (!this.isPngBuffer(buffer)) {
            throw new Error('Buffer was not a valid PNG');
        }
        this.buffer = buffer;
        this.dataview = new DataView(buffer);
        delete this.chunks;
        delete this.ihdr;
        return this;
    };
    PNG.prototype.checkTypedArrayEquality = function (view1, view2) {
        if (view1.byteLength != view1.byteLength)
            return false;
        if (view1.length != view1.length)
            return false;
        for (var i = 0; i != view1.length; i++) {
            if (view1[i] != view1[i])
                return false;
        }
        return true;
    };
    PNG.prototype.isPngBuffer = function (buffer) {
        return this.checkTypedArrayEquality(pngHeader, new Uint8Array(buffer, 0, 8));
    };
    PNG.prototype.readAscii = function (length) {
        if (length === void 0) { length = 1; }
        this.assertHasData();
        var str = [];
        if (length < 0)
            throw new Error('Cannot have negative length');
        for (var i = 0; i < length; i++) {
            str.push(String.fromCharCode(this.dataview.getUint8(this.offset + i)));
        }
        this.offset += length;
        return str.join("");
    };
    PNG.prototype.readAsciiUntilNull = function (maxLength) {
        if (maxLength === void 0) { maxLength = 100000000; }
        this.assertHasData();
        var str = [];
        if (length < 0)
            throw new Error('Cannot have negative length');
        var i = 0;
        while (i++ < maxLength) {
            var byte = this.dataview.getUint8(this.offset);
            this.offset++;
            if (byte > 0) {
                str.push(String.fromCharCode(byte));
            }
            else {
                break;
            }
        }
        return str.join("");
    };
    PNG.prototype.asciiSafeByteStr = function (byte) {
        if (byte === 9) {
            return "\\t";
        }
        if (byte === 12) {
            return "\\0x0C";
        }
        if (byte === 13) {
            return "\\r";
        }
        if (byte === 10) {
            return "\\n";
        }
        if ((byte <= 31 &&
            byte !== 10) ||
            (byte >= 127 &&
                byte <= 159)) {
            return '';
        }
        return String.fromCharCode(byte);
    };
    PNG.prototype.readSafeAsciiUntilNull = function (maxLength) {
        if (maxLength === void 0) { maxLength = 100000000; }
        this.assertHasData();
        var str = [];
        if (length < 0)
            throw new Error('Cannot have negative length');
        var i = 0;
        while (i++ < maxLength) {
            var byte = this.dataview.getUint8(this.offset);
            this.offset++;
            if (byte > 0) {
                str.push(this.asciiSafeByteStr(byte));
            }
            else {
                break;
            }
        }
        return str.join("");
    };
    PNG.prototype.readUTF8UntilNull = function (maxLength) {
        if (maxLength === void 0) { maxLength = 10000000; }
        this.assertHasData();
        var len = 0;
        var byte = 0;
        do {
            byte = this.dataview.getUint8(this.offset + len);
            len++;
        } while (byte !== 0 && len < maxLength);
        var result = new TextDecoder().decode(new Uint8Array(this.buffer, this.offset, len));
        this.offset += len;
        return result;
    };
    PNG.prototype.readUint8 = function () {
        this.assertHasData();
        this.offset += 1;
        return this.dataview.getUint8(this.offset - 1);
    };
    PNG.prototype.readInt8 = function () {
        this.assertHasData();
        this.offset += 1;
        return this.dataview.getInt8(this.offset - 1);
    };
    PNG.prototype.readInt16 = function () {
        this.assertHasData();
        this.offset += 2;
        return this.dataview.getInt16(this.offset - 2, false);
    };
    PNG.prototype.readUint16 = function () {
        this.assertHasData();
        this.offset += 2;
        return this.dataview.getUint16(this.offset - 2, false);
    };
    PNG.prototype.readInt32 = function () {
        this.assertHasData();
        this.offset += 4;
        return this.dataview.getInt32(this.offset - 4, false);
    };
    PNG.prototype.readUint32 = function () {
        this.assertHasData();
        this.offset += 4;
        return this.dataview.getUint32(this.offset - 4, false);
    };
    PNG.prototype.readBigInt64 = function () {
        this.assertHasData();
        this.offset += 8;
        return this.dataview.getBigInt64(this.offset - 8, false);
    };
    PNG.prototype.readBigUint64 = function () {
        this.assertHasData();
        this.offset += 8;
        return this.dataview.getBigUint64(this.offset - 8, false);
    };
    PNG.prototype.readFloat32 = function () {
        this.assertHasData();
        this.offset += 4;
        return this.dataview.getFloat32(this.offset - 4, false);
    };
    PNG.prototype.readFloat64 = function () {
        this.assertHasData();
        this.offset += 8;
        return this.dataview.getFloat64(this.offset - 8, false);
    };
    PNG.prototype.isTypedArray = function (data) {
        return ((data instanceof Int8Array) ||
            (data instanceof Uint8Array) ||
            (data instanceof Uint8ClampedArray) ||
            (data instanceof Int16Array) ||
            (data instanceof Uint16Array) ||
            (data instanceof Int32Array) ||
            (data instanceof Uint32Array) ||
            (data instanceof Float32Array) ||
            (data instanceof Float64Array));
    };
    PNG.prototype.chunkIsIHDR = function (chunk) {
        if (typeof chunk !== 'undefined' && chunk !== null) {
            return true;
        }
        return false;
    };
    PNG.prototype.chunkIsPLTE = function (chunk) {
        return (chunk instanceof Uint8Array);
    };
    PNG.prototype.chunkIstRNS = function (chunk) {
        return this.isTypedArray(chunk);
    };
    PNG.prototype.chunkIssRGB = function (chunk) {
        return (typeof chunk === 'number' && chunk in sRGBTypes);
    };
    PNG.prototype.chunkIsgAMA = function (chunk) {
        return typeof chunk === 'number';
    };
    PNG.prototype.chunkIscHRM = function (chunk) {
        if (typeof chunk !== 'undefined' &&
            chunk !== null &&
            typeof chunk === 'object') {
            return (typeof chunk.whitePointX === 'number' &&
                typeof chunk.whitePointY === 'number' &&
                typeof chunk.redX === 'number' &&
                typeof chunk.redY === 'number' &&
                typeof chunk.greenX === 'number' &&
                typeof chunk.greenY === 'number' &&
                typeof chunk.blueX === 'number' &&
                typeof chunk.blueY === 'number');
        }
        return false;
    };
    PNG.prototype.chunkIsiCCP = function (chunk) {
        if (typeof chunk !== 'undefined' &&
            chunk !== null &&
            typeof chunk === 'object') {
            return (typeof chunk.profileName === 'string' &&
                typeof chunk.compressionMethod === 'number' &&
                this.isTypedArray(chunk.profile) &&
                this.isTypedArray(chunk.compressedProfile));
        }
        return false;
    };
    PNG.prototype.chunkIstEXt = function (chunk) {
        if (typeof chunk !== 'undefined' &&
            chunk !== null &&
            typeof chunk === 'object') {
            return (typeof chunk.keyword === 'string' &&
                typeof chunk.text === 'string');
        }
        return false;
    };
    PNG.prototype.chunkIszTXt = function (chunk) {
        if (typeof chunk !== 'undefined' &&
            chunk !== null &&
            typeof chunk === 'object') {
            return (typeof chunk.keyword === 'string' &&
                typeof chunk.compressionMethod === 'number' &&
                this.isTypedArray(chunk.compressedText) &&
                typeof chunk.text === 'string');
        }
        return false;
    };
    PNG.prototype.chunkIsiTXt = function (chunk) {
        if (typeof chunk !== 'undefined' &&
            chunk !== null &&
            typeof chunk === 'object') {
            return (typeof chunk.keyword === 'string' &&
                typeof chunk.compressionMethod === 'number' &&
                typeof chunk.compressionFlag === 'boolean' &&
                typeof chunk.languageTag === 'string' &&
                typeof chunk.translatedKeyword === 'string' &&
                typeof chunk.text === 'string');
        }
        return false;
    };
    PNG.prototype.chunkIsbKGD = function (chunk) {
        return this.isTypedArray(chunk) || typeof chunk === 'number';
    };
    PNG.prototype.chunkIspHYs = function (chunk) {
        if (typeof chunk !== 'undefined' &&
            chunk !== null &&
            typeof chunk === 'object') {
            return (typeof chunk.x === 'number' &&
                typeof chunk.y === 'number' &&
                chunk.unit in ResolutionUnit);
        }
        return false;
    };
    PNG.prototype.chunkIstIME = function (chunk) {
        if (typeof chunk !== 'undefined' &&
            chunk !== null &&
            typeof chunk === 'object') {
            return (typeof chunk.year === 'number' &&
                typeof chunk.month === 'number' &&
                typeof chunk.day === 'number' &&
                typeof chunk.hour === 'number' &&
                typeof chunk.minute === 'number' &&
                typeof chunk.second === 'number');
        }
        return false;
    };
    PNG.prototype.getIHDR = function () {
        this.assertHasData();
        if (!this.ihdr) {
            this.offset = 8;
            var dataview = this.dataview;
            var size = this.readUint32();
            var header = this.readAscii(4);
            return this.ihdr = {
                size: size,
                header: header,
                width: this.readUint32(),
                height: this.readUint32(),
                bitDepth: this.readUint8(),
                colorType: this.readUint8(),
                compressionMethod: this.readUint8(),
                filterMethod: this.readUint8(),
                interlaceMethod: this.readUint8()
            };
        }
        return this.ihdr;
    };
    PNG.prototype.getWidth = function () {
        return this.getIHDR().width;
    };
    PNG.prototype.getHeight = function () {
        return this.getIHDR().height;
    };
    PNG.prototype.getArea = function () {
        return this.getWidth() * this.getHeight();
    };
    PNG.prototype.getChunksByType = function () {
        var types = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            types[_i] = arguments[_i];
        }
        var ntypes = types.flat(2);
        return this.getChunkData().filter(function (a) { return ntypes.indexOf(a.type) !== -1; });
    };
    PNG.prototype.getPLTE = function () {
        var chunks = this.getChunksByType('PLTE');
        if (chunks.length > 1) {
            throw new Error('Cannot have more than 1 PLTE chunk.');
        }
        if (chunks.length === 1) {
            if (chunks[0].length % 3 !== 0) {
                throw new Error('Cannot have PLTE not a multiple of 3, length was ' + chunks[0].length);
            }
            var chunkData = chunks[0].data;
            if (!this.chunkIsPLTE(chunkData)) {
                chunkData = new Uint8Array(this.buffer, chunks[0].dataOffset, chunks[0].length);
                chunks[0].data = chunkData;
            }
            return chunkData;
        }
        return null;
    };
    PNG.prototype.gettRNS = function () {
        var ihdr = this.getIHDR();
        var chunks = this.getChunksByType('tRNS');
        if (chunks.length > 1) {
            throw new Error('Cannot have more than 1 tRNS chunk.');
        }
        if (chunks.length === 1) {
            var chunkData = chunks[0].data;
            if (this.chunkIstRNS(chunkData)) {
                return chunkData;
            }
            else {
                var trns = null;
                if (ihdr.colorType === ColorType.Palette) {
                    trns = new Uint8Array(this.buffer, chunks[0].dataOffset, chunks[0].length);
                }
                else if (ihdr.colorType === ColorType.Grayscale) {
                    if (ihdr.bitDepth === 8) {
                        trns = this.dataview.getUint8(chunks[0].dataOffset + 1);
                    }
                    else if (ihdr.bitDepth === 16) {
                        trns = this.dataview.getUint16(chunks[0].dataOffset);
                    }
                }
                else if (ihdr.colorType === ColorType.Rgb) {
                    trns = new Uint16Array(this.buffer, chunks[0].dataOffset, chunks[0].length);
                }
                else {
                    trns = null;
                    throw new Error("Color type ".concat(ihdr.colorType, " cannot have transparency"));
                }
                chunks[0].data = trns;
                return trns;
            }
        }
        return null;
    };
    PNG.prototype.getgAMA = function () {
        var ihdr = this.getIHDR();
        var chunks = this.getChunksByType('gAMA');
        if (chunks.length > 1) {
            throw new Error('Cannot have more than 1 gAMA chunk.');
        }
        if (chunks.length === 1) {
            var gama = chunks[0].data;
            if (!this.chunkIsgAMA(gama)) {
                gama = (this.dataview.getUint32(chunks[0].dataOffset, false)) / 100000;
                chunks[0].data = gama;
            }
            return gama;
        }
        return null;
    };
    PNG.prototype.getcHRM = function () {
        var ihdr = this.getIHDR();
        var chunks = this.getChunksByType('cHRM');
        if (chunks.length > 1) {
            throw new Error('Cannot have more than 1 cHRM chunk.');
        }
        if (chunks.length === 1) {
            var chunkData = chunks[0].data;
            if (!this.chunkIscHRM(chunkData)) {
                var off = chunks[0].dataOffset;
                var chrm = {
                    whitePointX: (this.dataview.getUint32(off + (4 * 0), false) / 100000),
                    whitePointY: (this.dataview.getUint32(off + (4 * 1), false) / 100000),
                    redX: (this.dataview.getUint32(off + (4 * 2), false) / 100000),
                    redY: (this.dataview.getUint32(off + (4 * 3), false) / 100000),
                    greenX: (this.dataview.getUint32(off + (4 * 4), false) / 100000),
                    greenY: (this.dataview.getUint32(off + (4 * 5), false) / 100000),
                    blueX: (this.dataview.getUint32(off + (4 * 6), false) / 100000),
                    blueY: (this.dataview.getUint32(off + (4 * 7), false) / 100000),
                };
                chunkData = chrm;
                chunks[0].data = chunkData;
            }
            return chunkData;
        }
        return null;
    };
    PNG.prototype.getsRGB = function () {
        var chunks = this.getChunksByType('sRGB');
        if (chunks.length > 1) {
            throw new Error('Cannot have more than 1 sRGB chunk.');
        }
        if (chunks.length === 1) {
            var chunkData = chunks[0].data;
            if (!this.chunkIssRGB(chunkData)) {
                chunkData = this.dataview.getUint8(chunks[0].dataOffset);
                chunks[0].data = chunkData;
            }
            return chunkData;
        }
        return null;
    };
    PNG.prototype.getiCCP = function () {
        var ihdr = this.getIHDR();
        var chunks = this.getChunksByType('iCCP');
        if (chunks.length > 1) {
            throw new Error('Cannot have more than 1 iCCP chunk.');
        }
        if (chunks.length === 1) {
            var iccp = chunks[0].data;
            if (!this.chunkIsiCCP(iccp)) {
                this.offset = chunks[0].dataOffset;
                var profileName = this.readSafeAsciiUntilNull();
                var compressionMethod = this.readUint8();
                var dataLength = chunks[0].length - (this.offset - chunks[0].dataOffset);
                var compressedProfile = new Uint8Array(this.buffer, this.offset, dataLength);
                var profile = pako.inflate(compressedProfile);
                iccp = {
                    profileName: profileName,
                    compressionMethod: compressionMethod,
                    compressedProfile: compressedProfile,
                    profile: profile
                };
                chunks[0].data = iccp;
            }
            return iccp;
        }
        return null;
    };
    PNG.prototype.gettEXt = function () {
        var _this = this;
        var ihdr = this.getIHDR();
        var chunks = this.getChunksByType('tEXt');
        var textChunks = [];
        chunks.forEach(function (chunk) {
            var textChunk = chunk.data;
            if (!_this.chunkIstEXt(textChunk)) {
                _this.offset = chunk.dataOffset;
                var keyword = _this.readSafeAsciiUntilNull(chunk.length);
                var length_1 = chunk.length - (_this.offset - chunk.dataOffset);
                var text = _this.readSafeAsciiUntilNull(length_1);
                textChunk = {
                    keyword: keyword,
                    text: text
                };
                chunk.data = textChunk;
            }
            textChunks.push(textChunk);
        });
        return textChunks;
    };
    PNG.prototype.getzTXt = function () {
        var _this = this;
        var ihdr = this.getIHDR();
        var chunks = this.getChunksByType('zTXt');
        var textChunks = [];
        chunks.forEach(function (chunk) {
            var textChunk = chunk.data;
            if (!_this.chunkIszTXt(textChunk)) {
                _this.offset = chunk.dataOffset;
                var keyword = _this.readSafeAsciiUntilNull();
                var compressionMethod = _this.readUint8();
                var dataLength = chunk.length - (_this.offset - chunk.dataOffset);
                var compressedText = new Uint8Array(_this.buffer, _this.offset, dataLength);
                var text = pako.inflate(compressedText, { to: 'string' });
                textChunk = {
                    keyword: keyword,
                    compressionMethod: compressionMethod,
                    compressedText: compressedText,
                    text: text
                };
                chunk.data = textChunk;
            }
            textChunks.push(textChunk);
        });
        return textChunks;
    };
    PNG.prototype.getiTXt = function () {
        var _this = this;
        var ihdr = this.getIHDR();
        var chunks = this.getChunksByType('iTXt');
        var textChunks = [];
        chunks.forEach(function (chunk) {
            var textChunk = chunk.data;
            if (!_this.chunkIsiTXt(textChunk)) {
                _this.offset = chunk.dataOffset;
                var keyword = _this.readSafeAsciiUntilNull();
                var compressionFlag = _this.readUint8() > 0 ? true : false;
                var compressionMethod = _this.readUint8();
                var languageTag = _this.readSafeAsciiUntilNull();
                var translatedKeyword = _this.readUTF8UntilNull();
                var dataLength = chunk.length - (_this.offset - chunk.dataOffset);
                var text = '';
                if (compressionFlag) {
                    var compressedText = new Uint8Array(_this.buffer, _this.offset, dataLength);
                    text = pako.inflate(compressedText, { to: 'string' });
                }
                else {
                    text = _this.readUTF8UntilNull(dataLength);
                }
                var itxt = textChunk = {
                    keyword: keyword,
                    compressionFlag: compressionFlag,
                    compressionMethod: compressionMethod,
                    languageTag: languageTag,
                    translatedKeyword: translatedKeyword,
                    text: text,
                };
                chunk.data = textChunk;
            }
            textChunks.push(textChunk);
        });
        return textChunks;
    };
    PNG.prototype.getbKGD = function () {
        var ihdr = this.getIHDR();
        var chunks = this.getChunksByType('bKGD');
        if (chunks.length > 1) {
            throw new Error('Cannot have more than 1 tRNS chunk.');
        }
        if (chunks.length === 1) {
            var chunkData = chunks[0].data;
            if (this.chunkIsbKGD(chunkData)) {
                return chunkData;
            }
            else {
                var bkgd = null;
                if (ihdr.colorType === ColorType.Palette) {
                    bkgd = new Uint8Array(this.buffer, chunks[0].dataOffset, chunks[0].length);
                }
                else if (ihdr.colorType === ColorType.Grayscale || ihdr.colorType === ColorType.GrayscaleAlpha) {
                    if (ihdr.bitDepth === 8) {
                        bkgd = this.dataview.getUint8(chunks[0].dataOffset + 1);
                    }
                    else if (ihdr.bitDepth === 16) {
                        bkgd = this.dataview.getUint16(chunks[0].dataOffset);
                    }
                }
                else if (ihdr.colorType === ColorType.Rgb || ihdr.colorType === ColorType.Rgba) {
                    bkgd = new Uint16Array(this.buffer, chunks[0].dataOffset, chunks[0].length);
                }
                else {
                    throw new Error("Color type ".concat(ihdr.colorType, " cannot have bKGD"));
                }
                chunks[0].data = bkgd;
                return bkgd;
            }
        }
        return null;
    };
    PNG.prototype.getpHYs = function () {
        var chunks = this.getChunksByType('pHYs');
        if (chunks.length > 1) {
            throw new Error('Cannot have more than 1 pHYs chunk.');
        }
        if (chunks.length === 1) {
            var phys = chunks[0].data;
            if (!this.chunkIspHYs(phys)) {
                this.offset = chunks[0].dataOffset;
                var x = this.readUint32();
                var y = this.readUint32();
                var unit = this.readUint8();
                phys = {
                    x: x,
                    y: y,
                    unit: unit
                };
                chunks[0].data = phys;
            }
            return phys;
        }
        return null;
    };
    PNG.prototype.gettIME = function () {
        var chunks = this.getChunksByType('tIME');
        if (chunks.length > 1) {
            throw new Error('Cannot have more than 1 tIME chunk.');
        }
        if (chunks.length === 1) {
            var time = chunks[0].data;
            if (!this.chunkIstIME(time)) {
                this.offset = chunks[0].dataOffset;
                var year = this.readUint16();
                var month = this.readUint8();
                var day = this.readUint8();
                var hour = this.readUint8();
                var minute = this.readUint8();
                var second = this.readUint8();
                time = {
                    year: year,
                    month: month,
                    day: day,
                    hour: hour,
                    minute: minute,
                    second: second,
                };
                chunks[0].data = time;
            }
            return time;
        }
        return null;
    };
    PNG.prototype.getChunkData = function () {
        this.assertHasData();
        if (!this.chunks) {
            this.chunks = [];
            this.offset = 8;
            var MAX = 100000;
            var i = 0;
            while (this.offset < this.buffer.byteLength && i++ < MAX) {
                var startOff = this.offset;
                var chunk = {
                    length: this.readUint32(),
                    type: this.readAscii(4),
                    startOffset: startOff,
                    dataOffset: startOff + 8
                };
                this.offset = startOff + 8 + 4 + chunk.length;
                this.chunks.push(chunk);
            }
        }
        return this.chunks;
    };
    PNG.prototype.populateChunks = function () {
        this.getChunkData();
        this.getPLTE();
        this.gettRNS();
        this.getgAMA();
        this.getcHRM();
        this.getsRGB();
        this.getiCCP();
        this.gettEXt();
        this.getzTXt();
        this.getiTXt();
        this.getbKGD();
        this.getpHYs();
        this.gettIME();
        return this;
    };
    PNG.prototype.getImageDataRaw = function () {
        var idats = this.getChunksByType('IDAT');
        var imdataLength = idats.reduce(function (a, b) { return a + b.length; }, 0);
        var intermediateBuffer = new ArrayBuffer(imdataLength);
        var intermediateArray = new Uint8Array(intermediateBuffer);
        var curOff = 0;
        for (var _i = 0, idats_1 = idats; _i < idats_1.length; _i++) {
            var idat = idats_1[_i];
            intermediateArray.set(new Uint8Array(this.buffer, idat.dataOffset, idat.length), curOff);
            curOff += idat.length;
        }
        var imageDataRaw = pako.inflate(intermediateArray);
        return imageDataRaw;
    };
    PNG.prototype.getImageDataTransformed = function () {
        var ihdr = this.getIHDR();
        var imageDataRaw = this.getImageDataRaw();
        if (ihdr.colorType === ColorType.Grayscale) {
            var res = new Uint8Array(imageDataRaw.buffer);
            res = this.filterZero(res, ihdr, 0);
            if (ihdr.bitDepth === 16) {
                var area = ihdr.width * ihdr.height;
                var res16 = new Uint16Array(area);
                var dv = new DataView(res.buffer);
                for (var i = 0; i < area; i++) {
                    res16[i] = dv.getUint16(i * 2, false);
                }
                return res16;
            }
            if (ihdr.bitDepth === 8) {
                return res;
            }
        }
        else if (ihdr.colorType === ColorType.Rgb) {
            var res = new Uint8Array(imageDataRaw.buffer);
            res = this.filterZero(res, ihdr, 0);
            if (ihdr.bitDepth === 16) {
                var area = ihdr.width * ihdr.height * 3;
                var res16 = new Uint16Array(area);
                var dv = new DataView(res.buffer);
                for (var i = 0; i < area; i++) {
                    res16[i] = dv.getUint16(i * 2, false);
                }
                return res16;
            }
            if (ihdr.bitDepth === 8) {
                return res;
            }
        }
        else if (ihdr.colorType === ColorType.Rgba) {
            var res = new Uint8Array(imageDataRaw.buffer);
            res = this.filterZero(res, ihdr, 0);
            if (ihdr.bitDepth === 16) {
                var area = ihdr.width * ihdr.height * 4;
                var res16 = new Uint16Array(area);
                var dv = new DataView(res.buffer);
                for (var i = 0; i < area; i++) {
                    res16[i] = dv.getUint16(i * 2, false);
                }
                return res16;
            }
            if (ihdr.bitDepth === 8) {
                return res;
            }
        }
        else if (ihdr.colorType === ColorType.GrayscaleAlpha) {
            var res = new Uint8Array(imageDataRaw.buffer);
            res = this.filterZero(res, ihdr, 0);
            if (ihdr.bitDepth === 16) {
                var area = ihdr.width * ihdr.height * 2;
                var res16 = new Uint16Array(area);
                var dv = new DataView(res.buffer);
                for (var i = 0; i < area; i++) {
                    res16[i] = dv.getUint16(i * 2, false);
                }
                return res16;
            }
            if (ihdr.bitDepth === 8) {
                return res;
            }
        }
    };
    PNG.prototype.getImageData = function () {
        var transparency = this.gettRNS();
        var palette = this.getPLTE();
        return this.decodeImage(this.getImageDataTransformed(), this.getIHDR(), {
            transparency: transparency,
            palette: palette,
        });
    };
    PNG.prototype.bitsPerPixel = function (colorType, depth) {
        var noc = {
            0: 1,
            2: 3,
            3: 1,
            4: 2,
            6: 4, // ColorType.Rgba
        };
        return noc[colorType] * depth;
    };
    PNG.prototype.filterZero = function (data, _a, off) {
        var width = _a.width, bitDepth = _a.bitDepth, height = _a.height, colorType = _a.colorType;
        if (off === void 0) { off = 0; }
        var w = width, h = height;
        var bpp = this.bitsPerPixel(colorType, bitDepth);
        var bpl = Math.ceil(w * bpp / 8);
        bpp = Math.ceil(bpp / 8);
        var i;
        var di;
        var type = data[off];
        var x = 0;
        if (type > 1) {
            data[off] = [0, 0, 1][type - 2];
        }
        if (type == 3) {
            for (x = bpp; x < bpl; x++) {
                data[x + 1] = (data[x + 1] + (data[x + 1 - bpp] >>> 1)) & 255;
            }
        }
        for (var y = 0; y < h; y++) {
            i = off + y * bpl;
            di = i + y + 1;
            type = data[di - 1];
            x = 0;
            if (type == PngLineFilter.None) {
                for (; x < bpl; x++) {
                    data[i + x] = data[di + x];
                }
            }
            else if (type == PngLineFilter.Sub) {
                for (; x < bpp; x++) {
                    data[i + x] = data[di + x];
                }
                for (; x < bpl; x++) {
                    data[i + x] = (data[di + x] + data[i + x - bpp]);
                }
            }
            else if (type == PngLineFilter.Up) {
                for (; x < bpl; x++) {
                    data[i + x] = (data[di + x] + data[i + x - bpl]);
                }
            }
            else if (type == PngLineFilter.Average) {
                for (; x < bpp; x++) {
                    data[i + x] = (data[di + x] + (data[i + x - bpl] >>> 1));
                }
                for (; x < bpl; x++) {
                    data[i + x] = (data[di + x] + ((data[i + x - bpl] + data[i + x - bpp]) >>> 1));
                }
            }
            else if (type == PngLineFilter.Paeth) {
                for (; x < bpp; x++) {
                    data[i + x] = (data[di + x] + this.unpaeth(0, data[i + x - bpl], 0));
                }
                for (; x < bpl; x++) {
                    data[i + x] = (data[di + x] + this.unpaeth(data[i + x - bpp], data[i + x - bpl], data[i + x - bpp - bpl]));
                }
            }
        }
        return data;
    };
    PNG.prototype.unpaeth = function (a, b, c) {
        var p = a + b - c;
        var pa = (p - a);
        var pb = (p - b);
        var pc = (p - c);
        if (pa * pa <= pb * pb && pa * pa <= pc * pc)
            return a;
        else if (pb * pb <= pc * pc)
            return b;
        return c;
    };
    PNG.prototype.decodeImage = function (data, _a, _b) {
        var width = _a.width, bitDepth = _a.bitDepth, height = _a.height, colorType = _a.colorType;
        var _c = _b.transparency, transparency = _c === void 0 ? null : _c, _d = _b.palette, palette = _d === void 0 ? null : _d;
        var area = width * height;
        if (colorType == ColorType.Rgba) {
            if (bitDepth == 8) {
                return new Uint8Array(data).slice(0, area * 4);
            }
            if (bitDepth == 16) {
                return new Uint16Array(data).slice(0, area * 4);
            }
        }
        else if (colorType == ColorType.Rgb) {
            if (bitDepth == 8) {
                return new Uint8Array(data).slice(0, area * 3);
            }
            if (bitDepth == 16) {
                return new Uint16Array(data).slice(0, area * 3);
            }
        }
        else if (colorType == ColorType.Palette) {
            var bpp = this.bitsPerPixel(colorType, bitDepth);
            var bpl = Math.ceil(width * bpp / 8); // bytes per line
            var bf = new Uint8Array(area * 4);
            var p = palette;
            var ap = transparency;
            var tl = ap ? (typeof ap === 'number' ? 0 : ap.length) : 0;
            // console.log(p, ap);
            if (bitDepth == 1) {
                for (var y = 0; y < height; y++) {
                    var s0 = y * bpl;
                    var t0 = y * width;
                    for (var i = 0; i < width; i++) {
                        var qi = (t0 + i) << 2;
                        var j = ((data[s0 + (i >> 3)] >> (7 - ((i & 7) << 0))) & 1);
                        var cj = 3 * j;
                        bf[qi] = p[cj];
                        bf[qi + 1] = p[cj + 1];
                        bf[qi + 2] = p[cj + 2];
                        if (typeof ap === 'number') {
                            bf[qi + 3] = 255;
                        }
                        else {
                            bf[qi + 3] = (j < tl) ? ap[j] : 255;
                        }
                    }
                }
            }
            if (bitDepth == 2) {
                for (var y = 0; y < height; y++) {
                    var s0 = y * bpl;
                    var t0 = y * width;
                    for (var i = 0; i < width; i++) {
                        var qi = (t0 + i) << 2;
                        var j = ((data[s0 + (i >> 2)] >> (6 - ((i & 3) << 1))) & 3);
                        var cj = 3 * j;
                        bf[qi] = p[cj];
                        bf[qi + 1] = p[cj + 1];
                        bf[qi + 2] = p[cj + 2];
                        if (typeof ap === 'number') {
                            bf[qi + 3] = 255;
                        }
                        else {
                            bf[qi + 3] = (j < tl) ? ap[j] : 255;
                        }
                    }
                }
            }
            if (bitDepth == 4) {
                for (var y = 0; y < height; y++) {
                    var s0 = y * bpl;
                    var t0 = y * width;
                    for (var i = 0; i < width; i++) {
                        var qi = (t0 + i) << 2;
                        var j = ((data[s0 + (i >> 1)] >> (4 - ((i & 1) << 2))) & 15);
                        var cj = 3 * j;
                        bf[qi] = p[cj];
                        bf[qi + 1] = p[cj + 1];
                        bf[qi + 2] = p[cj + 2];
                        if (typeof ap === 'number') {
                            bf[qi + 3] = 255;
                        }
                        else {
                            bf[qi + 3] = (j < tl) ? ap[j] : 255;
                        }
                    }
                }
            }
            if (bitDepth == 8) {
                for (var i = 0; i < area; i++) {
                    var qi = i << 2;
                    var j = data[i];
                    var cj = 3 * j;
                    bf[qi] = p[cj];
                    bf[qi + 1] = p[cj + 1];
                    bf[qi + 2] = p[cj + 2];
                    if (typeof ap === 'number') {
                        bf[qi + 3] = 255;
                    }
                    else {
                        bf[qi + 3] = (j < tl) ? ap[j] : 255;
                    }
                }
            }
            return bf;
        }
        else if (colorType == ColorType.GrayscaleAlpha) {
            if (bitDepth === 8) {
                return new Uint8Array(data).slice(0, area * 2);
            }
            if (bitDepth === 16) {
                return new Uint16Array(data).slice(0, area * 2);
            }
            throw new Error('Invalid bit depth');
        }
        else if (colorType == ColorType.Grayscale) {
            if (bitDepth === 8 || bitDepth === 4 || bitDepth === 2 || bitDepth === 1) {
                return new Uint8Array(data).slice(0, area);
            }
            if (bitDepth === 16) {
                return new Uint16Array(data).slice(0, area);
            }
            throw new Error('Invalid bit depth');
        }
    };
    PNG.Float32ArrayToPng16Bit = function (inp) {
        var u8 = new ArrayBuffer(inp.length * 2);
        var dv = new DataView(u8);
        for (var i = 0; i < inp.length; i++) {
            dv.setUint16(i * 2, inp[i]);
        }
        return new Uint8Array(u8);
    };
    PNG.Uint16ArrayToPng16Bit = function (inp) {
        var dv = new DataView(inp.buffer);
        for (var i = 0; i < inp.length; i++) {
            dv.setUint16(i * 2, inp[i]);
        }
        return new Uint8Array(inp.buffer);
    };
    PNG.arrayToPng16Bit = function (inp) {
        var u8 = new ArrayBuffer(inp.length * 2);
        var dv = new DataView(u8);
        for (var i = 0; i < inp.length; i++) {
            dv.setUint16(i * 2, inp[i]);
        }
        return new Uint8Array(u8);
    };
    PNG.prototype.terrariumToGrayscaleArray = function () {
        this.assertHasData();
        var pixels = this.getImageData();
        var area = this.getArea();
        var newPixels = new Array(area);
        // terrarium images are 24,8 decimal encodings with R representing
        // the first 8 bits, G representing the next 8 and B representing the
        // final 8 bits
        // i.e. the height in metres is (R * 256) + (G) + (B / 256)
        // so...
        for (var i = 0; i < area; i++) {
            newPixels[i] = ((pixels[(i * 3)] * Math.pow(2, 8)) + (pixels[(i * 3) + 1]) + (pixels[(i * 3) + 2] / Math.pow(2, 8))) - Math.pow(2, 15);
        }
        return newPixels;
    };
    PNG.prototype.terrariumToGrayscale = function () {
        this.assertHasData();
        var pixels = this.getImageData();
        var area = this.getArea();
        var newPixels = new Float32Array(area);
        // terrarium images are 24,8 decimal encodings with R representing
        // the first 8 bits, G representing the next 8 and B representing the
        // final 8 bits
        // i.e. the height in metres is (R * 256) + (G) + (B / 256)
        // so...
        for (var i = 0; i < area; i++) {
            newPixels[i] = ((pixels[(i * 3)] * Math.pow(2, 8)) + (pixels[(i * 3) + 1]) + (pixels[(i * 3) + 2] / Math.pow(2, 8))) - Math.pow(2, 15);
        }
        return newPixels;
    };
    PNG.prototype.terrariumToGrayscaleNormalised = function () {
        return PNG.normaliseTypedArray(this.terrariumToGrayscale());
    };
    PNG.normaliseTypedArray = function (inp) {
        var bpe = 2;
        if (!Array.isArray(inp)) {
            if (inp instanceof Float32Array) {
                bpe = 2;
            }
            else {
                bpe = inp.BYTES_PER_ELEMENT;
            }
        }
        // For some reason, typescript does not think the reduce function as
        // used below is compatible with all typedarrays
        //@ts-ignore
        var max = inp.reduce(function (prev, cur) { return Math.max(prev, cur); }, 0);
        //@ts-ignore
        var min = inp.reduce(function (prev, cur) { return Math.min(prev, cur); }, max);
        var newMax = Math.pow(2, bpe * 8);
        var newMin = 0;
        var sub = max - min;
        var nsub = newMax - newMin;
        var factor = newMax / (max - sub);
        inp.forEach(function (a, index) {
            inp[index] = (((a - min) / sub) * nsub + newMin);
        });
        return inp;
    };
    return PNG;
}());
export default PNG;
//# sourceMappingURL=png.js.map