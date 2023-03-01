/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/helpers.ts":
/*!************************!*\
  !*** ./src/helpers.ts ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "NormaliseMode": () => (/* binding */ NormaliseMode),
/* harmony export */   "format": () => (/* binding */ format)
/* harmony export */ });
var format = function (str, obj) {
    for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        str = str.replace("{".concat(key, "}"), value.toString());
    }
    return str;
};
var NormaliseMode;
(function (NormaliseMode) {
    NormaliseMode[NormaliseMode["Off"] = 0] = "Off";
    NormaliseMode[NormaliseMode["Regular"] = 1] = "Regular";
    NormaliseMode[NormaliseMode["Smart"] = 2] = "Smart";
    NormaliseMode[NormaliseMode["SmartWindow"] = 3] = "SmartWindow";
})(NormaliseMode || (NormaliseMode = {}));


/***/ }),

/***/ "./node_modules/comlink/dist/esm/comlink.mjs":
/*!***************************************************!*\
  !*** ./node_modules/comlink/dist/esm/comlink.mjs ***!
  \***************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "createEndpoint": () => (/* binding */ createEndpoint),
/* harmony export */   "expose": () => (/* binding */ expose),
/* harmony export */   "finalizer": () => (/* binding */ finalizer),
/* harmony export */   "proxy": () => (/* binding */ proxy),
/* harmony export */   "proxyMarker": () => (/* binding */ proxyMarker),
/* harmony export */   "releaseProxy": () => (/* binding */ releaseProxy),
/* harmony export */   "transfer": () => (/* binding */ transfer),
/* harmony export */   "transferHandlers": () => (/* binding */ transferHandlers),
/* harmony export */   "windowEndpoint": () => (/* binding */ windowEndpoint),
/* harmony export */   "wrap": () => (/* binding */ wrap)
/* harmony export */ });
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const proxyMarker = Symbol("Comlink.proxy");
const createEndpoint = Symbol("Comlink.endpoint");
const releaseProxy = Symbol("Comlink.releaseProxy");
const finalizer = Symbol("Comlink.finalizer");
const throwMarker = Symbol("Comlink.thrown");
const isObject = (val) => (typeof val === "object" && val !== null) || typeof val === "function";
/**
 * Internal transfer handle to handle objects marked to proxy.
 */
const proxyTransferHandler = {
    canHandle: (val) => isObject(val) && val[proxyMarker],
    serialize(obj) {
        const { port1, port2 } = new MessageChannel();
        expose(obj, port1);
        return [port2, [port2]];
    },
    deserialize(port) {
        port.start();
        return wrap(port);
    },
};
/**
 * Internal transfer handler to handle thrown exceptions.
 */
const throwTransferHandler = {
    canHandle: (value) => isObject(value) && throwMarker in value,
    serialize({ value }) {
        let serialized;
        if (value instanceof Error) {
            serialized = {
                isError: true,
                value: {
                    message: value.message,
                    name: value.name,
                    stack: value.stack,
                },
            };
        }
        else {
            serialized = { isError: false, value };
        }
        return [serialized, []];
    },
    deserialize(serialized) {
        if (serialized.isError) {
            throw Object.assign(new Error(serialized.value.message), serialized.value);
        }
        throw serialized.value;
    },
};
/**
 * Allows customizing the serialization of certain values.
 */
const transferHandlers = new Map([
    ["proxy", proxyTransferHandler],
    ["throw", throwTransferHandler],
]);
function isAllowedOrigin(allowedOrigins, origin) {
    for (const allowedOrigin of allowedOrigins) {
        if (origin === allowedOrigin || allowedOrigin === "*") {
            return true;
        }
        if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) {
            return true;
        }
    }
    return false;
}
function expose(obj, ep = globalThis, allowedOrigins = ["*"]) {
    ep.addEventListener("message", function callback(ev) {
        if (!ev || !ev.data) {
            return;
        }
        if (!isAllowedOrigin(allowedOrigins, ev.origin)) {
            console.warn(`Invalid origin '${ev.origin}' for comlink proxy`);
            return;
        }
        const { id, type, path } = Object.assign({ path: [] }, ev.data);
        const argumentList = (ev.data.argumentList || []).map(fromWireValue);
        let returnValue;
        try {
            const parent = path.slice(0, -1).reduce((obj, prop) => obj[prop], obj);
            const rawValue = path.reduce((obj, prop) => obj[prop], obj);
            switch (type) {
                case "GET" /* MessageType.GET */:
                    {
                        returnValue = rawValue;
                    }
                    break;
                case "SET" /* MessageType.SET */:
                    {
                        parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
                        returnValue = true;
                    }
                    break;
                case "APPLY" /* MessageType.APPLY */:
                    {
                        returnValue = rawValue.apply(parent, argumentList);
                    }
                    break;
                case "CONSTRUCT" /* MessageType.CONSTRUCT */:
                    {
                        const value = new rawValue(...argumentList);
                        returnValue = proxy(value);
                    }
                    break;
                case "ENDPOINT" /* MessageType.ENDPOINT */:
                    {
                        const { port1, port2 } = new MessageChannel();
                        expose(obj, port2);
                        returnValue = transfer(port1, [port1]);
                    }
                    break;
                case "RELEASE" /* MessageType.RELEASE */:
                    {
                        returnValue = undefined;
                    }
                    break;
                default:
                    return;
            }
        }
        catch (value) {
            returnValue = { value, [throwMarker]: 0 };
        }
        Promise.resolve(returnValue)
            .catch((value) => {
            return { value, [throwMarker]: 0 };
        })
            .then((returnValue) => {
            const [wireValue, transferables] = toWireValue(returnValue);
            ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
            if (type === "RELEASE" /* MessageType.RELEASE */) {
                // detach and deactive after sending release response above.
                ep.removeEventListener("message", callback);
                closeEndPoint(ep);
                if (finalizer in obj && typeof obj[finalizer] === "function") {
                    obj[finalizer]();
                }
            }
        })
            .catch((error) => {
            // Send Serialization Error To Caller
            const [wireValue, transferables] = toWireValue({
                value: new TypeError("Unserializable return value"),
                [throwMarker]: 0,
            });
            ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
        });
    });
    if (ep.start) {
        ep.start();
    }
}
function isMessagePort(endpoint) {
    return endpoint.constructor.name === "MessagePort";
}
function closeEndPoint(endpoint) {
    if (isMessagePort(endpoint))
        endpoint.close();
}
function wrap(ep, target) {
    return createProxy(ep, [], target);
}
function throwIfProxyReleased(isReleased) {
    if (isReleased) {
        throw new Error("Proxy has been released and is not useable");
    }
}
function releaseEndpoint(ep) {
    return requestResponseMessage(ep, {
        type: "RELEASE" /* MessageType.RELEASE */,
    }).then(() => {
        closeEndPoint(ep);
    });
}
const proxyCounter = new WeakMap();
const proxyFinalizers = "FinalizationRegistry" in globalThis &&
    new FinalizationRegistry((ep) => {
        const newCount = (proxyCounter.get(ep) || 0) - 1;
        proxyCounter.set(ep, newCount);
        if (newCount === 0) {
            releaseEndpoint(ep);
        }
    });
function registerProxy(proxy, ep) {
    const newCount = (proxyCounter.get(ep) || 0) + 1;
    proxyCounter.set(ep, newCount);
    if (proxyFinalizers) {
        proxyFinalizers.register(proxy, ep, proxy);
    }
}
function unregisterProxy(proxy) {
    if (proxyFinalizers) {
        proxyFinalizers.unregister(proxy);
    }
}
function createProxy(ep, path = [], target = function () { }) {
    let isProxyReleased = false;
    const proxy = new Proxy(target, {
        get(_target, prop) {
            throwIfProxyReleased(isProxyReleased);
            if (prop === releaseProxy) {
                return () => {
                    unregisterProxy(proxy);
                    releaseEndpoint(ep);
                    isProxyReleased = true;
                };
            }
            if (prop === "then") {
                if (path.length === 0) {
                    return { then: () => proxy };
                }
                const r = requestResponseMessage(ep, {
                    type: "GET" /* MessageType.GET */,
                    path: path.map((p) => p.toString()),
                }).then(fromWireValue);
                return r.then.bind(r);
            }
            return createProxy(ep, [...path, prop]);
        },
        set(_target, prop, rawValue) {
            throwIfProxyReleased(isProxyReleased);
            // FIXME: ES6 Proxy Handler `set` methods are supposed to return a
            // boolean. To show good will, we return true asynchronously ¯\_(ツ)_/¯
            const [value, transferables] = toWireValue(rawValue);
            return requestResponseMessage(ep, {
                type: "SET" /* MessageType.SET */,
                path: [...path, prop].map((p) => p.toString()),
                value,
            }, transferables).then(fromWireValue);
        },
        apply(_target, _thisArg, rawArgumentList) {
            throwIfProxyReleased(isProxyReleased);
            const last = path[path.length - 1];
            if (last === createEndpoint) {
                return requestResponseMessage(ep, {
                    type: "ENDPOINT" /* MessageType.ENDPOINT */,
                }).then(fromWireValue);
            }
            // We just pretend that `bind()` didn’t happen.
            if (last === "bind") {
                return createProxy(ep, path.slice(0, -1));
            }
            const [argumentList, transferables] = processArguments(rawArgumentList);
            return requestResponseMessage(ep, {
                type: "APPLY" /* MessageType.APPLY */,
                path: path.map((p) => p.toString()),
                argumentList,
            }, transferables).then(fromWireValue);
        },
        construct(_target, rawArgumentList) {
            throwIfProxyReleased(isProxyReleased);
            const [argumentList, transferables] = processArguments(rawArgumentList);
            return requestResponseMessage(ep, {
                type: "CONSTRUCT" /* MessageType.CONSTRUCT */,
                path: path.map((p) => p.toString()),
                argumentList,
            }, transferables).then(fromWireValue);
        },
    });
    registerProxy(proxy, ep);
    return proxy;
}
function myFlat(arr) {
    return Array.prototype.concat.apply([], arr);
}
function processArguments(argumentList) {
    const processed = argumentList.map(toWireValue);
    return [processed.map((v) => v[0]), myFlat(processed.map((v) => v[1]))];
}
const transferCache = new WeakMap();
function transfer(obj, transfers) {
    transferCache.set(obj, transfers);
    return obj;
}
function proxy(obj) {
    return Object.assign(obj, { [proxyMarker]: true });
}
function windowEndpoint(w, context = globalThis, targetOrigin = "*") {
    return {
        postMessage: (msg, transferables) => w.postMessage(msg, targetOrigin, transferables),
        addEventListener: context.addEventListener.bind(context),
        removeEventListener: context.removeEventListener.bind(context),
    };
}
function toWireValue(value) {
    for (const [name, handler] of transferHandlers) {
        if (handler.canHandle(value)) {
            const [serializedValue, transferables] = handler.serialize(value);
            return [
                {
                    type: "HANDLER" /* WireValueType.HANDLER */,
                    name,
                    value: serializedValue,
                },
                transferables,
            ];
        }
    }
    return [
        {
            type: "RAW" /* WireValueType.RAW */,
            value,
        },
        transferCache.get(value) || [],
    ];
}
function fromWireValue(value) {
    switch (value.type) {
        case "HANDLER" /* WireValueType.HANDLER */:
            return transferHandlers.get(value.name).deserialize(value.value);
        case "RAW" /* WireValueType.RAW */:
            return value.value;
    }
}
function requestResponseMessage(ep, msg, transfers) {
    return new Promise((resolve) => {
        const id = generateUUID();
        ep.addEventListener("message", function l(ev) {
            if (!ev.data || !ev.data.id || ev.data.id !== id) {
                return;
            }
            ep.removeEventListener("message", l);
            resolve(ev.data);
        });
        if (ep.start) {
            ep.start();
        }
        ep.postMessage(Object.assign({ id }, msg), transfers);
    });
}
function generateUUID() {
    return new Array(4)
        .fill(0)
        .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
        .join("-");
}


//# sourceMappingURL=comlink.mjs.map


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!**************************!*\
  !*** ./src/processor.ts ***!
  \**************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "typedArrayToStlDefaults": () => (/* binding */ typedArrayToStlDefaults)
/* harmony export */ });
/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! comlink */ "./node_modules/comlink/dist/esm/comlink.mjs");
/* harmony import */ var _helpers__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./helpers */ "./src/helpers.ts");


var typedArrayToStlDefaults = {
    width: 100,
    depth: 100,
    height: 10,
};
var processor = {
    normaliseTypedArray: function (inp) {
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
        return {
            data: inp,
            minBefore: min,
            maxBefore: max,
            minAfter: newMin,
            maxAfter: newMax,
        };
    },
    normaliseTypedArraySmart: function (inp) {
        var bpe = 2;
        if (!Array.isArray(inp)) {
            if (inp instanceof Float32Array) {
                bpe = 2;
            }
            else {
                bpe = inp.BYTES_PER_ELEMENT;
            }
        }
        var n = inp.length;
        var numStdDeviations = 10;
        // For some reason, typescript does not think the reduce function as
        // used below is compatible with all typedarrays
        //@ts-ignore
        var mean = inp.reduce(function (a, b) { return a + b; }) / n;
        //@ts-ignore
        var stddev = Math.sqrt(inp.map(function (x) { return Math.pow(x - mean, 2); }).reduce(function (a, b) { return a + b; }) / n);
        //@ts-ignore
        var actualMax = inp.reduce(function (prev, cur) { return Math.max(prev, cur); }, 0);
        var max = Math.min(mean + stddev * numStdDeviations, actualMax);
        //@ts-ignore
        var actualMin = inp.reduce(function (prev, cur) { return Math.min(prev, cur); }, max);
        var min = Math.max(mean - stddev * numStdDeviations, actualMin);
        var newMax = Math.pow(2, bpe * 8);
        var newMin = 0;
        var sub = max - min;
        var nsub = newMax - newMin;
        var factor = newMax / (max - sub);
        inp.forEach(function (a, index) {
            if (a >= max)
                inp[index] = newMax;
            else if (a <= min)
                inp[index] = newMin;
            else
                inp[index] = (((a - min) / sub) * nsub + newMin);
        });
        return {
            data: inp,
            minBefore: actualMin,
            maxBefore: actualMax,
            minAfter: newMin,
            maxAfter: newMax,
        };
    },
    normaliseTypedArraySmartWindow: function (inp) {
        var bpe = 2;
        if (!Array.isArray(inp)) {
            if (inp instanceof Float32Array) {
                bpe = 2;
            }
            else {
                bpe = inp.BYTES_PER_ELEMENT;
            }
        }
        var n = inp.length;
        var numStdDeviations = 10;
        // For some reason, typescript does not think the reduce function as
        // used below is compatible with all typedarrays
        //@ts-ignore
        var mean = inp.reduce(function (a, b) { return a + b; }) / n;
        //@ts-ignore
        var stddev = Math.sqrt(inp.map(function (x) { return Math.pow(x - mean, 2); }).reduce(function (a, b) { return a + b; }) / n);
        var exclude = 0.0005;
        var copy = inp.slice(0);
        copy.sort();
        var offset = Math.ceil(copy.length * exclude);
        var length = Math.floor(copy.length * (1 - exclude * 2));
        var windowedCopy = copy.subarray(offset, length);
        //@ts-ignore
        var actualMax = copy[copy.length - 1];
        var windowedMax = windowedCopy[windowedCopy.length - 1];
        //@ts-ignore
        var actualMin = copy[0];
        var windowedMin = windowedCopy[0];
        var max = (windowedMax + stddev) > actualMax ? actualMax : windowedMax;
        var min = (windowedMin - stddev) < actualMin ? actualMin : windowedMin;
        var newMax = Math.pow(2, bpe * 8) - 1;
        var newMin = 0;
        var sub = max - min;
        var nsub = newMax - newMin;
        var factor = newMax / (max - sub);
        inp.forEach(function (a, index) {
            if (a >= max)
                inp[index] = newMax;
            else if (a <= min)
                inp[index] = newMin;
            else
                inp[index] = (((a - min) / sub) * nsub + newMin);
        });
        return {
            data: inp,
            minBefore: min,
            maxBefore: max,
            minAfter: newMin,
            maxAfter: newMax,
        };
    },
    combineImages: function (states, normaliseMode) {
        if (normaliseMode === void 0) { normaliseMode = _helpers__WEBPACK_IMPORTED_MODULE_0__.NormaliseMode.Regular; }
        var area = states[0].width * states[0].height;
        var output = new Float32Array(area);
        var tileWidth = 256;
        var increment = 1 / tileWidth;
        var map = {};
        for (var _i = 0, states_1 = states; _i < states_1.length; _i++) {
            var tile = states_1[_i];
            if (!map[tile.x]) {
                map[tile.x] = {};
            }
            map[tile.x][tile.y] = tile;
        }
        var extent = {
            x1: states[0].exactPos.x - states[0].widthInTiles / 2,
            x2: states[0].exactPos.x + states[0].widthInTiles / 2,
            y1: states[0].exactPos.y - states[0].heightInTiles / 2,
            y2: states[0].exactPos.y + states[0].heightInTiles / 2
        };
        var i = 0;
        for (var y = extent.y1; y < extent.y2; y += increment) {
            for (var x = extent.x1; x < extent.x2; x += increment) {
                var tile = {
                    x: Math.floor(x),
                    y: Math.floor(y)
                };
                var px = {
                    x: Math.floor((x % 1) * tileWidth),
                    y: Math.floor((y % 1) * tileWidth)
                };
                var idx = px.y * tileWidth + px.x;
                output[i++] = map[tile.x][tile.y].heights[idx];
            }
        }
        var result = {
            data: output,
            minBefore: Math.pow(2, 32),
            maxBefore: 0,
            minAfter: Math.pow(2, 32),
            maxAfter: 0,
        };
        if (normaliseMode == _helpers__WEBPACK_IMPORTED_MODULE_0__.NormaliseMode.Regular) {
            result = this.normaliseTypedArray(output);
        }
        else if (normaliseMode == _helpers__WEBPACK_IMPORTED_MODULE_0__.NormaliseMode.Smart) {
            result = this.normaliseTypedArraySmart(output);
        }
        else if (normaliseMode == _helpers__WEBPACK_IMPORTED_MODULE_0__.NormaliseMode.SmartWindow) {
            result = this.normaliseTypedArraySmartWindow(output);
        }
        else {
            for (var i_1 = 0; i_1 < output.length; i_1++) {
                result.maxAfter = Math.max(output[i_1], result.maxAfter);
                result.minAfter = Math.min(output[i_1], result.minAfter);
            }
            result.maxBefore = result.maxAfter;
            result.minBefore = result.minAfter;
        }
        return result;
    },
    typedArrayToStl: function (points, widthpx, heightpx, _a) {
        var _b = _a === void 0 ? typedArrayToStlDefaults : _a, width = _b.width, depth = _b.depth, height = _b.height;
        var dataLength = ((widthpx) * (heightpx)) * 50;
        console.log(points.length, dataLength);
        var size = 80 + 4 + dataLength;
        var result = new ArrayBuffer(dataLength);
        var dv = new DataView(result);
        dv.setUint32(80, (widthpx - 1) * (heightpx - 1), true);
        //@ts-ignore
        var max = points.reduce(function (acc, point) { return Math.max(point, acc); }, 0);
        var o = function (x, y) { return (y * widthpx) + x; };
        var n = function (p1, p2, p3) {
            var A = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
            var B = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
            return [
                A[1] * B[2] - A[2] * B[1],
                A[2] * B[0] - A[0] * B[2],
                A[0] * B[1] - A[1] * B[0]
            ];
        };
        var pt = function (tris, off) {
            tris.flat().forEach(function (flt, i) {
                dv.setFloat32(off + (i * 4), flt, true);
            });
            // dv.setUint16(off+48, 0, true);
        };
        var off = 84;
        for (var x = 0; x < (widthpx - 1); x += 2) {
            for (var y = 0; y < (heightpx - 1); y++) {
                var tri1 = [
                    [0, 0, 0],
                    [x, y, points[o(x, y)] / max],
                    [x + 1, y, points[o(x + 1, y)] / max],
                    [x, y + 1, points[o(x, y + 1)] / max], // v3
                ];
                // tri1[0] = n(tri1[1], tri1[2], tri1[3]);
                pt(tri1, off);
                off += 50;
                var tri2 = [
                    [0, 0, 0],
                    [x + 1, y, points[o(x + 1, y)] / max],
                    [x + 1, y + 1, points[o(x + 1, y + 1)] / max],
                    [x, y + 1, points[o(x, y + 1)] / max], // v3
                ];
                // tri2[0] = n(tri2[1], tri2[2], tri2[3]);
                pt(tri2, off);
                off += 50;
            }
        }
        return result;
    }
};
comlink__WEBPACK_IMPORTED_MODULE_1__.expose(processor);

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QyxDQUFDLENBQUMsR0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLO2lCQUN4QyxDQUFDO2dCQUNGLDBDQUEwQztnQkFDMUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDZCxHQUFHLElBQUksRUFBRSxDQUFDO2FBQ1g7U0FDRjtRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FDRjtBQUVELDJDQUFjLENBQUMsU0FBUyxDQUFDLENBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9wbmctMTYtYnJvd3Nlci8uL3NyYy9oZWxwZXJzLnRzIiwid2VicGFjazovL3BuZy0xNi1icm93c2VyLy4vbm9kZV9tb2R1bGVzL2NvbWxpbmsvZGlzdC9lc20vY29tbGluay5tanMiLCJ3ZWJwYWNrOi8vcG5nLTE2LWJyb3dzZXIvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vcG5nLTE2LWJyb3dzZXIvd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL3BuZy0xNi1icm93c2VyL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vcG5nLTE2LWJyb3dzZXIvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9wbmctMTYtYnJvd3Nlci8uL3NyYy9wcm9jZXNzb3IudHMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IGZvcm1hdCA9IChzdHIgOiBzdHJpbmcsIG9iaiA6IFJlY29yZDxzdHJpbmcsIHN0cmluZ3xudW1iZXI+KSA6IHN0cmluZyA9PiB7XHJcbiAgZm9yIChsZXQgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG9iaikpIHtcclxuICAgIHN0ciA9IHN0ci5yZXBsYWNlKGB7JHtrZXl9fWAsIHZhbHVlLnRvU3RyaW5nKCkpO1xyXG4gIH1cclxuICByZXR1cm4gc3RyO1xyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgVHlwZWRBcnJheSA9XHJcbiAgfCBJbnQ4QXJyYXlcclxuICB8IFVpbnQ4QXJyYXlcclxuICB8IFVpbnQ4Q2xhbXBlZEFycmF5XHJcbiAgfCBJbnQxNkFycmF5XHJcbiAgfCBVaW50MTZBcnJheVxyXG4gIHwgSW50MzJBcnJheVxyXG4gIHwgVWludDMyQXJyYXlcclxuICB8IEZsb2F0MzJBcnJheVxyXG4gIHwgRmxvYXQ2NEFycmF5O1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUaWxlQ29vcmRzIHtcclxuICB4OiBudW1iZXIsXHJcbiAgeTogbnVtYmVyLFxyXG4gIHo6IG51bWJlclxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgTGF0TG5nIHtcclxuICBsYXRpdHVkZTogbnVtYmVyLFxyXG4gIGxvbmdpdHVkZTogbnVtYmVyXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBMYXRMbmdab29tIGV4dGVuZHMgTGF0TG5nIHtcclxuICB6b29tOiBudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgQ29uZmlnU3RhdGUgPSBUaWxlQ29vcmRzICYgTGF0TG5nWm9vbSAmIHtcclxuICB3aWR0aCA6IG51bWJlcixcclxuICBoZWlnaHQgOiBudW1iZXIsXHJcbiAgZXhhY3RQb3MgOiBUaWxlQ29vcmRzLFxyXG4gIHdpZHRoSW5UaWxlcyA6IG51bWJlcixcclxuICBoZWlnaHRJblRpbGVzIDogbnVtYmVyLFxyXG4gIHN0YXJ0eDogbnVtYmVyLFxyXG4gIHN0YXJ0eTogbnVtYmVyLFxyXG4gIGVuZHg6IG51bWJlcixcclxuICBlbmR5OiBudW1iZXIsXHJcbiAgc3RhdHVzOiBzdHJpbmcsXHJcbiAgYm91bmRzOiBbTGF0TG5nLCBMYXRMbmddLFxyXG4gIHBoeXM6IHt3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcn1cclxufTtcclxuXHJcbmV4cG9ydCB0eXBlIFRpbGVMb2FkU3RhdGUgPSBDb25maWdTdGF0ZSAmIHt4OiBudW1iZXIsIHk6IG51bWJlciwgaGVpZ2h0czogRmxvYXQzMkFycmF5fTtcclxuXHJcbmV4cG9ydCBlbnVtIE5vcm1hbGlzZU1vZGUge1xyXG4gIE9mZiA9IDAsXHJcbiAgUmVndWxhciA9IDEsXHJcbiAgU21hcnQgPSAyLFxyXG4gIFNtYXJ0V2luZG93ID0gMyxcclxufSIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBBcGFjaGUtMi4wXG4gKi9cbmNvbnN0IHByb3h5TWFya2VyID0gU3ltYm9sKFwiQ29tbGluay5wcm94eVwiKTtcbmNvbnN0IGNyZWF0ZUVuZHBvaW50ID0gU3ltYm9sKFwiQ29tbGluay5lbmRwb2ludFwiKTtcbmNvbnN0IHJlbGVhc2VQcm94eSA9IFN5bWJvbChcIkNvbWxpbmsucmVsZWFzZVByb3h5XCIpO1xuY29uc3QgZmluYWxpemVyID0gU3ltYm9sKFwiQ29tbGluay5maW5hbGl6ZXJcIik7XG5jb25zdCB0aHJvd01hcmtlciA9IFN5bWJvbChcIkNvbWxpbmsudGhyb3duXCIpO1xuY29uc3QgaXNPYmplY3QgPSAodmFsKSA9PiAodHlwZW9mIHZhbCA9PT0gXCJvYmplY3RcIiAmJiB2YWwgIT09IG51bGwpIHx8IHR5cGVvZiB2YWwgPT09IFwiZnVuY3Rpb25cIjtcbi8qKlxuICogSW50ZXJuYWwgdHJhbnNmZXIgaGFuZGxlIHRvIGhhbmRsZSBvYmplY3RzIG1hcmtlZCB0byBwcm94eS5cbiAqL1xuY29uc3QgcHJveHlUcmFuc2ZlckhhbmRsZXIgPSB7XG4gICAgY2FuSGFuZGxlOiAodmFsKSA9PiBpc09iamVjdCh2YWwpICYmIHZhbFtwcm94eU1hcmtlcl0sXG4gICAgc2VyaWFsaXplKG9iaikge1xuICAgICAgICBjb25zdCB7IHBvcnQxLCBwb3J0MiB9ID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgICAgIGV4cG9zZShvYmosIHBvcnQxKTtcbiAgICAgICAgcmV0dXJuIFtwb3J0MiwgW3BvcnQyXV07XG4gICAgfSxcbiAgICBkZXNlcmlhbGl6ZShwb3J0KSB7XG4gICAgICAgIHBvcnQuc3RhcnQoKTtcbiAgICAgICAgcmV0dXJuIHdyYXAocG9ydCk7XG4gICAgfSxcbn07XG4vKipcbiAqIEludGVybmFsIHRyYW5zZmVyIGhhbmRsZXIgdG8gaGFuZGxlIHRocm93biBleGNlcHRpb25zLlxuICovXG5jb25zdCB0aHJvd1RyYW5zZmVySGFuZGxlciA9IHtcbiAgICBjYW5IYW5kbGU6ICh2YWx1ZSkgPT4gaXNPYmplY3QodmFsdWUpICYmIHRocm93TWFya2VyIGluIHZhbHVlLFxuICAgIHNlcmlhbGl6ZSh7IHZhbHVlIH0pIHtcbiAgICAgICAgbGV0IHNlcmlhbGl6ZWQ7XG4gICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICBzZXJpYWxpemVkID0ge1xuICAgICAgICAgICAgICAgIGlzRXJyb3I6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogdmFsdWUubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdmFsdWUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgc3RhY2s6IHZhbHVlLnN0YWNrLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2VyaWFsaXplZCA9IHsgaXNFcnJvcjogZmFsc2UsIHZhbHVlIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtzZXJpYWxpemVkLCBbXV07XG4gICAgfSxcbiAgICBkZXNlcmlhbGl6ZShzZXJpYWxpemVkKSB7XG4gICAgICAgIGlmIChzZXJpYWxpemVkLmlzRXJyb3IpIHtcbiAgICAgICAgICAgIHRocm93IE9iamVjdC5hc3NpZ24obmV3IEVycm9yKHNlcmlhbGl6ZWQudmFsdWUubWVzc2FnZSksIHNlcmlhbGl6ZWQudmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IHNlcmlhbGl6ZWQudmFsdWU7XG4gICAgfSxcbn07XG4vKipcbiAqIEFsbG93cyBjdXN0b21pemluZyB0aGUgc2VyaWFsaXphdGlvbiBvZiBjZXJ0YWluIHZhbHVlcy5cbiAqL1xuY29uc3QgdHJhbnNmZXJIYW5kbGVycyA9IG5ldyBNYXAoW1xuICAgIFtcInByb3h5XCIsIHByb3h5VHJhbnNmZXJIYW5kbGVyXSxcbiAgICBbXCJ0aHJvd1wiLCB0aHJvd1RyYW5zZmVySGFuZGxlcl0sXG5dKTtcbmZ1bmN0aW9uIGlzQWxsb3dlZE9yaWdpbihhbGxvd2VkT3JpZ2lucywgb3JpZ2luKSB7XG4gICAgZm9yIChjb25zdCBhbGxvd2VkT3JpZ2luIG9mIGFsbG93ZWRPcmlnaW5zKSB7XG4gICAgICAgIGlmIChvcmlnaW4gPT09IGFsbG93ZWRPcmlnaW4gfHwgYWxsb3dlZE9yaWdpbiA9PT0gXCIqXCIpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhbGxvd2VkT3JpZ2luIGluc3RhbmNlb2YgUmVnRXhwICYmIGFsbG93ZWRPcmlnaW4udGVzdChvcmlnaW4pKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5mdW5jdGlvbiBleHBvc2Uob2JqLCBlcCA9IGdsb2JhbFRoaXMsIGFsbG93ZWRPcmlnaW5zID0gW1wiKlwiXSkge1xuICAgIGVwLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGZ1bmN0aW9uIGNhbGxiYWNrKGV2KSB7XG4gICAgICAgIGlmICghZXYgfHwgIWV2LmRhdGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWlzQWxsb3dlZE9yaWdpbihhbGxvd2VkT3JpZ2lucywgZXYub3JpZ2luKSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBJbnZhbGlkIG9yaWdpbiAnJHtldi5vcmlnaW59JyBmb3IgY29tbGluayBwcm94eWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHsgaWQsIHR5cGUsIHBhdGggfSA9IE9iamVjdC5hc3NpZ24oeyBwYXRoOiBbXSB9LCBldi5kYXRhKTtcbiAgICAgICAgY29uc3QgYXJndW1lbnRMaXN0ID0gKGV2LmRhdGEuYXJndW1lbnRMaXN0IHx8IFtdKS5tYXAoZnJvbVdpcmVWYWx1ZSk7XG4gICAgICAgIGxldCByZXR1cm5WYWx1ZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IHBhdGguc2xpY2UoMCwgLTEpLnJlZHVjZSgob2JqLCBwcm9wKSA9PiBvYmpbcHJvcF0sIG9iaik7XG4gICAgICAgICAgICBjb25zdCByYXdWYWx1ZSA9IHBhdGgucmVkdWNlKChvYmosIHByb3ApID0+IG9ialtwcm9wXSwgb2JqKTtcbiAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgXCJHRVRcIiAvKiBNZXNzYWdlVHlwZS5HRVQgKi86XG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gcmF3VmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIlNFVFwiIC8qIE1lc3NhZ2VUeXBlLlNFVCAqLzpcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50W3BhdGguc2xpY2UoLTEpWzBdXSA9IGZyb21XaXJlVmFsdWUoZXYuZGF0YS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIkFQUExZXCIgLyogTWVzc2FnZVR5cGUuQVBQTFkgKi86XG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gcmF3VmFsdWUuYXBwbHkocGFyZW50LCBhcmd1bWVudExpc3QpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJDT05TVFJVQ1RcIiAvKiBNZXNzYWdlVHlwZS5DT05TVFJVQ1QgKi86XG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gbmV3IHJhd1ZhbHVlKC4uLmFyZ3VtZW50TGlzdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHByb3h5KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiRU5EUE9JTlRcIiAvKiBNZXNzYWdlVHlwZS5FTkRQT0lOVCAqLzpcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBwb3J0MSwgcG9ydDIgfSA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3NlKG9iaiwgcG9ydDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSB0cmFuc2Zlcihwb3J0MSwgW3BvcnQxXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIlJFTEVBU0VcIiAvKiBNZXNzYWdlVHlwZS5SRUxFQVNFICovOlxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHsgdmFsdWUsIFt0aHJvd01hcmtlcl06IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBQcm9taXNlLnJlc29sdmUocmV0dXJuVmFsdWUpXG4gICAgICAgICAgICAuY2F0Y2goKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZSwgW3Rocm93TWFya2VyXTogMCB9O1xuICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4oKHJldHVyblZhbHVlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBbd2lyZVZhbHVlLCB0cmFuc2ZlcmFibGVzXSA9IHRvV2lyZVZhbHVlKHJldHVyblZhbHVlKTtcbiAgICAgICAgICAgIGVwLnBvc3RNZXNzYWdlKE9iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSwgd2lyZVZhbHVlKSwgeyBpZCB9KSwgdHJhbnNmZXJhYmxlcyk7XG4gICAgICAgICAgICBpZiAodHlwZSA9PT0gXCJSRUxFQVNFXCIgLyogTWVzc2FnZVR5cGUuUkVMRUFTRSAqLykge1xuICAgICAgICAgICAgICAgIC8vIGRldGFjaCBhbmQgZGVhY3RpdmUgYWZ0ZXIgc2VuZGluZyByZWxlYXNlIHJlc3BvbnNlIGFib3ZlLlxuICAgICAgICAgICAgICAgIGVwLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICBjbG9zZUVuZFBvaW50KGVwKTtcbiAgICAgICAgICAgICAgICBpZiAoZmluYWxpemVyIGluIG9iaiAmJiB0eXBlb2Ygb2JqW2ZpbmFsaXplcl0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICBvYmpbZmluYWxpemVyXSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIC8vIFNlbmQgU2VyaWFsaXphdGlvbiBFcnJvciBUbyBDYWxsZXJcbiAgICAgICAgICAgIGNvbnN0IFt3aXJlVmFsdWUsIHRyYW5zZmVyYWJsZXNdID0gdG9XaXJlVmFsdWUoe1xuICAgICAgICAgICAgICAgIHZhbHVlOiBuZXcgVHlwZUVycm9yKFwiVW5zZXJpYWxpemFibGUgcmV0dXJuIHZhbHVlXCIpLFxuICAgICAgICAgICAgICAgIFt0aHJvd01hcmtlcl06IDAsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGVwLnBvc3RNZXNzYWdlKE9iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSwgd2lyZVZhbHVlKSwgeyBpZCB9KSwgdHJhbnNmZXJhYmxlcyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGlmIChlcC5zdGFydCkge1xuICAgICAgICBlcC5zdGFydCgpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGlzTWVzc2FnZVBvcnQoZW5kcG9pbnQpIHtcbiAgICByZXR1cm4gZW5kcG9pbnQuY29uc3RydWN0b3IubmFtZSA9PT0gXCJNZXNzYWdlUG9ydFwiO1xufVxuZnVuY3Rpb24gY2xvc2VFbmRQb2ludChlbmRwb2ludCkge1xuICAgIGlmIChpc01lc3NhZ2VQb3J0KGVuZHBvaW50KSlcbiAgICAgICAgZW5kcG9pbnQuY2xvc2UoKTtcbn1cbmZ1bmN0aW9uIHdyYXAoZXAsIHRhcmdldCkge1xuICAgIHJldHVybiBjcmVhdGVQcm94eShlcCwgW10sIHRhcmdldCk7XG59XG5mdW5jdGlvbiB0aHJvd0lmUHJveHlSZWxlYXNlZChpc1JlbGVhc2VkKSB7XG4gICAgaWYgKGlzUmVsZWFzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJveHkgaGFzIGJlZW4gcmVsZWFzZWQgYW5kIGlzIG5vdCB1c2VhYmxlXCIpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHJlbGVhc2VFbmRwb2ludChlcCkge1xuICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCB7XG4gICAgICAgIHR5cGU6IFwiUkVMRUFTRVwiIC8qIE1lc3NhZ2VUeXBlLlJFTEVBU0UgKi8sXG4gICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgIGNsb3NlRW5kUG9pbnQoZXApO1xuICAgIH0pO1xufVxuY29uc3QgcHJveHlDb3VudGVyID0gbmV3IFdlYWtNYXAoKTtcbmNvbnN0IHByb3h5RmluYWxpemVycyA9IFwiRmluYWxpemF0aW9uUmVnaXN0cnlcIiBpbiBnbG9iYWxUaGlzICYmXG4gICAgbmV3IEZpbmFsaXphdGlvblJlZ2lzdHJ5KChlcCkgPT4ge1xuICAgICAgICBjb25zdCBuZXdDb3VudCA9IChwcm94eUNvdW50ZXIuZ2V0KGVwKSB8fCAwKSAtIDE7XG4gICAgICAgIHByb3h5Q291bnRlci5zZXQoZXAsIG5ld0NvdW50KTtcbiAgICAgICAgaWYgKG5ld0NvdW50ID09PSAwKSB7XG4gICAgICAgICAgICByZWxlYXNlRW5kcG9pbnQoZXApO1xuICAgICAgICB9XG4gICAgfSk7XG5mdW5jdGlvbiByZWdpc3RlclByb3h5KHByb3h5LCBlcCkge1xuICAgIGNvbnN0IG5ld0NvdW50ID0gKHByb3h5Q291bnRlci5nZXQoZXApIHx8IDApICsgMTtcbiAgICBwcm94eUNvdW50ZXIuc2V0KGVwLCBuZXdDb3VudCk7XG4gICAgaWYgKHByb3h5RmluYWxpemVycykge1xuICAgICAgICBwcm94eUZpbmFsaXplcnMucmVnaXN0ZXIocHJveHksIGVwLCBwcm94eSk7XG4gICAgfVxufVxuZnVuY3Rpb24gdW5yZWdpc3RlclByb3h5KHByb3h5KSB7XG4gICAgaWYgKHByb3h5RmluYWxpemVycykge1xuICAgICAgICBwcm94eUZpbmFsaXplcnMudW5yZWdpc3Rlcihwcm94eSk7XG4gICAgfVxufVxuZnVuY3Rpb24gY3JlYXRlUHJveHkoZXAsIHBhdGggPSBbXSwgdGFyZ2V0ID0gZnVuY3Rpb24gKCkgeyB9KSB7XG4gICAgbGV0IGlzUHJveHlSZWxlYXNlZCA9IGZhbHNlO1xuICAgIGNvbnN0IHByb3h5ID0gbmV3IFByb3h5KHRhcmdldCwge1xuICAgICAgICBnZXQoX3RhcmdldCwgcHJvcCkge1xuICAgICAgICAgICAgdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNQcm94eVJlbGVhc2VkKTtcbiAgICAgICAgICAgIGlmIChwcm9wID09PSByZWxlYXNlUHJveHkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB1bnJlZ2lzdGVyUHJveHkocHJveHkpO1xuICAgICAgICAgICAgICAgICAgICByZWxlYXNlRW5kcG9pbnQoZXApO1xuICAgICAgICAgICAgICAgICAgICBpc1Byb3h5UmVsZWFzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocHJvcCA9PT0gXCJ0aGVuXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAocGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdGhlbjogKCkgPT4gcHJveHkgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgciA9IHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIiAvKiBNZXNzYWdlVHlwZS5HRVQgKi8sXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHBhdGgubWFwKChwKSA9PiBwLnRvU3RyaW5nKCkpLFxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHIudGhlbi5iaW5kKHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZVByb3h5KGVwLCBbLi4ucGF0aCwgcHJvcF0pO1xuICAgICAgICB9LFxuICAgICAgICBzZXQoX3RhcmdldCwgcHJvcCwgcmF3VmFsdWUpIHtcbiAgICAgICAgICAgIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUHJveHlSZWxlYXNlZCk7XG4gICAgICAgICAgICAvLyBGSVhNRTogRVM2IFByb3h5IEhhbmRsZXIgYHNldGAgbWV0aG9kcyBhcmUgc3VwcG9zZWQgdG8gcmV0dXJuIGFcbiAgICAgICAgICAgIC8vIGJvb2xlYW4uIFRvIHNob3cgZ29vZCB3aWxsLCB3ZSByZXR1cm4gdHJ1ZSBhc3luY2hyb25vdXNseSDCr1xcXyjjg4QpXy/Cr1xuICAgICAgICAgICAgY29uc3QgW3ZhbHVlLCB0cmFuc2ZlcmFibGVzXSA9IHRvV2lyZVZhbHVlKHJhd1ZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiByZXF1ZXN0UmVzcG9uc2VNZXNzYWdlKGVwLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJTRVRcIiAvKiBNZXNzYWdlVHlwZS5TRVQgKi8sXG4gICAgICAgICAgICAgICAgcGF0aDogWy4uLnBhdGgsIHByb3BdLm1hcCgocCkgPT4gcC50b1N0cmluZygpKSxcbiAgICAgICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgIH0sIHRyYW5zZmVyYWJsZXMpLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGFwcGx5KF90YXJnZXQsIF90aGlzQXJnLCByYXdBcmd1bWVudExpc3QpIHtcbiAgICAgICAgICAgIHRocm93SWZQcm94eVJlbGVhc2VkKGlzUHJveHlSZWxlYXNlZCk7XG4gICAgICAgICAgICBjb25zdCBsYXN0ID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgaWYgKGxhc3QgPT09IGNyZWF0ZUVuZHBvaW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJFTkRQT0lOVFwiIC8qIE1lc3NhZ2VUeXBlLkVORFBPSU5UICovLFxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnJvbVdpcmVWYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBXZSBqdXN0IHByZXRlbmQgdGhhdCBgYmluZCgpYCBkaWRu4oCZdCBoYXBwZW4uXG4gICAgICAgICAgICBpZiAobGFzdCA9PT0gXCJiaW5kXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY3JlYXRlUHJveHkoZXAsIHBhdGguc2xpY2UoMCwgLTEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IFthcmd1bWVudExpc3QsIHRyYW5zZmVyYWJsZXNdID0gcHJvY2Vzc0FyZ3VtZW50cyhyYXdBcmd1bWVudExpc3QpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkFQUExZXCIgLyogTWVzc2FnZVR5cGUuQVBQTFkgKi8sXG4gICAgICAgICAgICAgICAgcGF0aDogcGF0aC5tYXAoKHApID0+IHAudG9TdHJpbmcoKSksXG4gICAgICAgICAgICAgICAgYXJndW1lbnRMaXN0LFxuICAgICAgICAgICAgfSwgdHJhbnNmZXJhYmxlcykudGhlbihmcm9tV2lyZVZhbHVlKTtcbiAgICAgICAgfSxcbiAgICAgICAgY29uc3RydWN0KF90YXJnZXQsIHJhd0FyZ3VtZW50TGlzdCkge1xuICAgICAgICAgICAgdGhyb3dJZlByb3h5UmVsZWFzZWQoaXNQcm94eVJlbGVhc2VkKTtcbiAgICAgICAgICAgIGNvbnN0IFthcmd1bWVudExpc3QsIHRyYW5zZmVyYWJsZXNdID0gcHJvY2Vzc0FyZ3VtZW50cyhyYXdBcmd1bWVudExpc3QpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkNPTlNUUlVDVFwiIC8qIE1lc3NhZ2VUeXBlLkNPTlNUUlVDVCAqLyxcbiAgICAgICAgICAgICAgICBwYXRoOiBwYXRoLm1hcCgocCkgPT4gcC50b1N0cmluZygpKSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudExpc3QsXG4gICAgICAgICAgICB9LCB0cmFuc2ZlcmFibGVzKS50aGVuKGZyb21XaXJlVmFsdWUpO1xuICAgICAgICB9LFxuICAgIH0pO1xuICAgIHJlZ2lzdGVyUHJveHkocHJveHksIGVwKTtcbiAgICByZXR1cm4gcHJveHk7XG59XG5mdW5jdGlvbiBteUZsYXQoYXJyKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoW10sIGFycik7XG59XG5mdW5jdGlvbiBwcm9jZXNzQXJndW1lbnRzKGFyZ3VtZW50TGlzdCkge1xuICAgIGNvbnN0IHByb2Nlc3NlZCA9IGFyZ3VtZW50TGlzdC5tYXAodG9XaXJlVmFsdWUpO1xuICAgIHJldHVybiBbcHJvY2Vzc2VkLm1hcCgodikgPT4gdlswXSksIG15RmxhdChwcm9jZXNzZWQubWFwKCh2KSA9PiB2WzFdKSldO1xufVxuY29uc3QgdHJhbnNmZXJDYWNoZSA9IG5ldyBXZWFrTWFwKCk7XG5mdW5jdGlvbiB0cmFuc2ZlcihvYmosIHRyYW5zZmVycykge1xuICAgIHRyYW5zZmVyQ2FjaGUuc2V0KG9iaiwgdHJhbnNmZXJzKTtcbiAgICByZXR1cm4gb2JqO1xufVxuZnVuY3Rpb24gcHJveHkob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ob2JqLCB7IFtwcm94eU1hcmtlcl06IHRydWUgfSk7XG59XG5mdW5jdGlvbiB3aW5kb3dFbmRwb2ludCh3LCBjb250ZXh0ID0gZ2xvYmFsVGhpcywgdGFyZ2V0T3JpZ2luID0gXCIqXCIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBwb3N0TWVzc2FnZTogKG1zZywgdHJhbnNmZXJhYmxlcykgPT4gdy5wb3N0TWVzc2FnZShtc2csIHRhcmdldE9yaWdpbiwgdHJhbnNmZXJhYmxlcyksXG4gICAgICAgIGFkZEV2ZW50TGlzdGVuZXI6IGNvbnRleHQuYWRkRXZlbnRMaXN0ZW5lci5iaW5kKGNvbnRleHQpLFxuICAgICAgICByZW1vdmVFdmVudExpc3RlbmVyOiBjb250ZXh0LnJlbW92ZUV2ZW50TGlzdGVuZXIuYmluZChjb250ZXh0KSxcbiAgICB9O1xufVxuZnVuY3Rpb24gdG9XaXJlVmFsdWUodmFsdWUpIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBoYW5kbGVyXSBvZiB0cmFuc2ZlckhhbmRsZXJzKSB7XG4gICAgICAgIGlmIChoYW5kbGVyLmNhbkhhbmRsZSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IFtzZXJpYWxpemVkVmFsdWUsIHRyYW5zZmVyYWJsZXNdID0gaGFuZGxlci5zZXJpYWxpemUodmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiSEFORExFUlwiIC8qIFdpcmVWYWx1ZVR5cGUuSEFORExFUiAqLyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHNlcmlhbGl6ZWRWYWx1ZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHRyYW5zZmVyYWJsZXMsXG4gICAgICAgICAgICBdO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6IFwiUkFXXCIgLyogV2lyZVZhbHVlVHlwZS5SQVcgKi8sXG4gICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgfSxcbiAgICAgICAgdHJhbnNmZXJDYWNoZS5nZXQodmFsdWUpIHx8IFtdLFxuICAgIF07XG59XG5mdW5jdGlvbiBmcm9tV2lyZVZhbHVlKHZhbHVlKSB7XG4gICAgc3dpdGNoICh2YWx1ZS50eXBlKSB7XG4gICAgICAgIGNhc2UgXCJIQU5ETEVSXCIgLyogV2lyZVZhbHVlVHlwZS5IQU5ETEVSICovOlxuICAgICAgICAgICAgcmV0dXJuIHRyYW5zZmVySGFuZGxlcnMuZ2V0KHZhbHVlLm5hbWUpLmRlc2VyaWFsaXplKHZhbHVlLnZhbHVlKTtcbiAgICAgICAgY2FzZSBcIlJBV1wiIC8qIFdpcmVWYWx1ZVR5cGUuUkFXICovOlxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnZhbHVlO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHJlcXVlc3RSZXNwb25zZU1lc3NhZ2UoZXAsIG1zZywgdHJhbnNmZXJzKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgIGNvbnN0IGlkID0gZ2VuZXJhdGVVVUlEKCk7XG4gICAgICAgIGVwLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGZ1bmN0aW9uIGwoZXYpIHtcbiAgICAgICAgICAgIGlmICghZXYuZGF0YSB8fCAhZXYuZGF0YS5pZCB8fCBldi5kYXRhLmlkICE9PSBpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVwLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGwpO1xuICAgICAgICAgICAgcmVzb2x2ZShldi5kYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChlcC5zdGFydCkge1xuICAgICAgICAgICAgZXAuc3RhcnQoKTtcbiAgICAgICAgfVxuICAgICAgICBlcC5wb3N0TWVzc2FnZShPYmplY3QuYXNzaWduKHsgaWQgfSwgbXNnKSwgdHJhbnNmZXJzKTtcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGdlbmVyYXRlVVVJRCgpIHtcbiAgICByZXR1cm4gbmV3IEFycmF5KDQpXG4gICAgICAgIC5maWxsKDApXG4gICAgICAgIC5tYXAoKCkgPT4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpLnRvU3RyaW5nKDE2KSlcbiAgICAgICAgLmpvaW4oXCItXCIpO1xufVxuXG5leHBvcnQgeyBjcmVhdGVFbmRwb2ludCwgZXhwb3NlLCBmaW5hbGl6ZXIsIHByb3h5LCBwcm94eU1hcmtlciwgcmVsZWFzZVByb3h5LCB0cmFuc2ZlciwgdHJhbnNmZXJIYW5kbGVycywgd2luZG93RW5kcG9pbnQsIHdyYXAgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvbWxpbmsubWpzLm1hcFxuIiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCJpbXBvcnQgKiBhcyBDb21saW5rIGZyb20gXCJjb21saW5rXCI7XHJcblxyXG5pbXBvcnQge1R5cGVkQXJyYXksIFRpbGVDb29yZHMsIExhdExuZywgTGF0TG5nWm9vbSwgQ29uZmlnU3RhdGUsIFRpbGVMb2FkU3RhdGUsIE5vcm1hbGlzZU1vZGV9IGZyb20gXCIuL2hlbHBlcnNcIjtcclxuXHJcbmV4cG9ydCB0eXBlIE5vcm1hbGlzZVJlc3VsdDxUPiA9IHtcclxuICBkYXRhOiBULFxyXG4gIG1pbkJlZm9yZTogbnVtYmVyLFxyXG4gIG1heEJlZm9yZTogbnVtYmVyLFxyXG4gIG1pbkFmdGVyOiBudW1iZXIsXHJcbiAgbWF4QWZ0ZXI6IG51bWJlclxyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgVHlwZWRBcnJheVRvU3RsQXJncyA9IHtcclxuICB3aWR0aCA6IG51bWJlcixcclxuICBkZXB0aCA6IG51bWJlcixcclxuICBoZWlnaHQ6IG51bWJlclxyXG59O1xyXG5leHBvcnQgY29uc3QgdHlwZWRBcnJheVRvU3RsRGVmYXVsdHMgOiBUeXBlZEFycmF5VG9TdGxBcmdzID0ge1xyXG4gIHdpZHRoIDogMTAwLFxyXG4gIGRlcHRoIDogMTAwLFxyXG4gIGhlaWdodCA6IDEwLFxyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgdmVjMyA9IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcclxuZXhwb3J0IHR5cGUgdHJpdmVjMyA9IFt2ZWMzLCB2ZWMzLCB2ZWMzLCB2ZWMzXTtcclxuXHJcbmNvbnN0IHByb2Nlc3NvciA9IHtcclxuICBub3JtYWxpc2VUeXBlZEFycmF5PFQgZXh0ZW5kcyBUeXBlZEFycmF5fG51bWJlcltdPihpbnAgOiBUKSA6IE5vcm1hbGlzZVJlc3VsdDxUPiB7XHJcbiAgICBsZXQgYnBlID0gMjtcclxuICAgIGlmICghQXJyYXkuaXNBcnJheShpbnApKSB7XHJcbiAgICAgIGlmIChpbnAgaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXkpIHtcclxuICAgICAgICBicGUgPSAyO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGJwZSA9IGlucC5CWVRFU19QRVJfRUxFTUVOVDtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8gRm9yIHNvbWUgcmVhc29uLCB0eXBlc2NyaXB0IGRvZXMgbm90IHRoaW5rIHRoZSByZWR1Y2UgZnVuY3Rpb24gYXNcclxuICAgIC8vIHVzZWQgYmVsb3cgaXMgY29tcGF0aWJsZSB3aXRoIGFsbCB0eXBlZGFycmF5c1xyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBtYXggPSBpbnAucmVkdWNlKChwcmV2IDogbnVtYmVyLCBjdXIgOiBudW1iZXIpIDogbnVtYmVyID0+IE1hdGgubWF4KHByZXYsIGN1ciksIDApO1xyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBtaW4gPSBpbnAucmVkdWNlKChwcmV2IDogbnVtYmVyLCBjdXIgOiBudW1iZXIpIDogbnVtYmVyID0+IE1hdGgubWluKHByZXYsIGN1ciksIG1heCk7XHJcbiAgICBjb25zdCBuZXdNYXggPSBNYXRoLnBvdygyLCBicGUgKiA4KTtcclxuICAgIGNvbnN0IG5ld01pbiA9IDA7XHJcbiAgICBjb25zdCBzdWIgPSBtYXggLSBtaW47XHJcbiAgICBjb25zdCBuc3ViID0gbmV3TWF4IC0gbmV3TWluO1xyXG4gICAgY29uc3QgZmFjdG9yID0gbmV3TWF4LyhtYXggLSBzdWIpO1xyXG4gICAgaW5wLmZvckVhY2goKGEgOiBudW1iZXIsIGluZGV4IDogbnVtYmVyKSA9PiB7XHJcbiAgICAgIGlucFtpbmRleF0gPSAoKChhLW1pbikvc3ViKSAqIG5zdWIgKyBuZXdNaW4pO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBkYXRhOiBpbnAsXHJcbiAgICAgIG1pbkJlZm9yZTogbWluLFxyXG4gICAgICBtYXhCZWZvcmU6IG1heCxcclxuICAgICAgbWluQWZ0ZXI6IG5ld01pbixcclxuICAgICAgbWF4QWZ0ZXI6IG5ld01heCxcclxuICAgIH07XHJcbiAgfSxcclxuICBub3JtYWxpc2VUeXBlZEFycmF5U21hcnQ8VCBleHRlbmRzIFR5cGVkQXJyYXl8bnVtYmVyW10+KGlucCA6IFQpIDogTm9ybWFsaXNlUmVzdWx0PFQ+IHtcclxuICAgIGxldCBicGUgPSAyO1xyXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGlucCkpIHtcclxuICAgICAgaWYgKGlucCBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSkge1xyXG4gICAgICAgIGJwZSA9IDI7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYnBlID0gaW5wLkJZVEVTX1BFUl9FTEVNRU5UO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBjb25zdCBuID0gaW5wLmxlbmd0aFxyXG5cclxuICAgIGNvbnN0IG51bVN0ZERldmlhdGlvbnMgPSAxMDtcclxuXHJcbiAgICAvLyBGb3Igc29tZSByZWFzb24sIHR5cGVzY3JpcHQgZG9lcyBub3QgdGhpbmsgdGhlIHJlZHVjZSBmdW5jdGlvbiBhc1xyXG4gICAgLy8gdXNlZCBiZWxvdyBpcyBjb21wYXRpYmxlIHdpdGggYWxsIHR5cGVkYXJyYXlzXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IG1lYW4gPSBpbnAucmVkdWNlKChhIDogbnVtYmVyLCBiIDogbnVtYmVyKSA9PiBhICsgYikgLyBuXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IHN0ZGRldiA9IE1hdGguc3FydChpbnAubWFwKHggPT4gTWF0aC5wb3coeCAtIG1lYW4sIDIpKS5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiKSAvIG4pXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IGFjdHVhbE1heCA9IGlucC5yZWR1Y2UoKHByZXYgOiBudW1iZXIsIGN1ciA6IG51bWJlcikgOiBudW1iZXIgPT4gTWF0aC5tYXgocHJldiwgY3VyKSwgMCk7XHJcbiAgICBjb25zdCBtYXggPSBNYXRoLm1pbihtZWFuK3N0ZGRldiAqIG51bVN0ZERldmlhdGlvbnMsIGFjdHVhbE1heCk7XHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IGFjdHVhbE1pbiA9IGlucC5yZWR1Y2UoKHByZXYgOiBudW1iZXIsIGN1ciA6IG51bWJlcikgOiBudW1iZXIgPT4gTWF0aC5taW4ocHJldiwgY3VyKSwgbWF4KTtcclxuICAgIGNvbnN0IG1pbiA9IE1hdGgubWF4KG1lYW4tc3RkZGV2ICogbnVtU3RkRGV2aWF0aW9ucywgYWN0dWFsTWluKTtcclxuXHJcbiAgICBjb25zdCBuZXdNYXggPSBNYXRoLnBvdygyLCBicGUgKiA4KTtcclxuICAgIGNvbnN0IG5ld01pbiA9IDA7XHJcbiAgICBjb25zdCBzdWIgPSBtYXggLSBtaW47XHJcbiAgICBjb25zdCBuc3ViID0gbmV3TWF4IC0gbmV3TWluO1xyXG4gICAgY29uc3QgZmFjdG9yID0gbmV3TWF4LyhtYXggLSBzdWIpO1xyXG4gICAgaW5wLmZvckVhY2goKGEgOiBudW1iZXIsIGluZGV4IDogbnVtYmVyKSA9PiB7XHJcbiAgICAgIGlmIChhID49IG1heCkgaW5wW2luZGV4XSA9IG5ld01heDtcclxuICAgICAgZWxzZSBpZiAoYSA8PSBtaW4pIGlucFtpbmRleF0gPSBuZXdNaW47XHJcbiAgICAgIGVsc2UgaW5wW2luZGV4XSA9ICgoKGEtbWluKS9zdWIpICogbnN1YiArIG5ld01pbik7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGRhdGE6IGlucCxcclxuICAgICAgbWluQmVmb3JlOiBhY3R1YWxNaW4sXHJcbiAgICAgIG1heEJlZm9yZTogYWN0dWFsTWF4LFxyXG4gICAgICBtaW5BZnRlcjogbmV3TWluLFxyXG4gICAgICBtYXhBZnRlcjogbmV3TWF4LFxyXG4gICAgfTtcclxuICB9LFxyXG4gIG5vcm1hbGlzZVR5cGVkQXJyYXlTbWFydFdpbmRvdzxUIGV4dGVuZHMgVHlwZWRBcnJheT4oaW5wIDogVCkgOiBOb3JtYWxpc2VSZXN1bHQ8VD4ge1xyXG4gICAgbGV0IGJwZSA9IDI7XHJcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoaW5wKSkge1xyXG4gICAgICBpZiAoaW5wIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSB7XHJcbiAgICAgICAgYnBlID0gMjtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBicGUgPSBpbnAuQllURVNfUEVSX0VMRU1FTlQ7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbnN0IG4gPSBpbnAubGVuZ3RoXHJcblxyXG4gICAgY29uc3QgbnVtU3RkRGV2aWF0aW9ucyA9IDEwO1xyXG5cclxuICAgIC8vIEZvciBzb21lIHJlYXNvbiwgdHlwZXNjcmlwdCBkb2VzIG5vdCB0aGluayB0aGUgcmVkdWNlIGZ1bmN0aW9uIGFzXHJcbiAgICAvLyB1c2VkIGJlbG93IGlzIGNvbXBhdGlibGUgd2l0aCBhbGwgdHlwZWRhcnJheXNcclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgY29uc3QgbWVhbiA9IGlucC5yZWR1Y2UoKGEgOiBudW1iZXIsIGIgOiBudW1iZXIpID0+IGEgKyBiKSAvIG5cclxuICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgY29uc3Qgc3RkZGV2ID0gTWF0aC5zcXJ0KGlucC5tYXAoeCA9PiBNYXRoLnBvdyh4IC0gbWVhbiwgMikpLnJlZHVjZSgoYSwgYikgPT4gYSArIGIpIC8gbilcclxuXHJcbiAgICBjb25zdCBleGNsdWRlID0gMC4wMDA1O1xyXG4gICAgY29uc3QgY29weSA9IGlucC5zbGljZSgwKTtcclxuICAgIGNvcHkuc29ydCgpO1xyXG4gICAgY29uc3Qgb2Zmc2V0ID0gTWF0aC5jZWlsKGNvcHkubGVuZ3RoICogZXhjbHVkZSk7XHJcbiAgICBjb25zdCBsZW5ndGggPSBNYXRoLmZsb29yKGNvcHkubGVuZ3RoICogKDEtZXhjbHVkZSoyKSk7XHJcbiAgICBjb25zdCB3aW5kb3dlZENvcHkgPSBjb3B5LnN1YmFycmF5KG9mZnNldCwgbGVuZ3RoKTtcclxuXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IGFjdHVhbE1heCA9IGNvcHlbY29weS5sZW5ndGgtMV07XHJcbiAgICBjb25zdCB3aW5kb3dlZE1heCA9IHdpbmRvd2VkQ29weVt3aW5kb3dlZENvcHkubGVuZ3RoLTFdO1xyXG4gICAgLy9AdHMtaWdub3JlXHJcbiAgICBjb25zdCBhY3R1YWxNaW4gPSBjb3B5WzBdO1xyXG4gICAgY29uc3Qgd2luZG93ZWRNaW4gPSB3aW5kb3dlZENvcHlbMF07XHJcblxyXG4gICAgY29uc3QgbWF4ID0gKHdpbmRvd2VkTWF4ICsgc3RkZGV2KSA+IGFjdHVhbE1heCA/IGFjdHVhbE1heCA6IHdpbmRvd2VkTWF4O1xyXG4gICAgY29uc3QgbWluID0gKHdpbmRvd2VkTWluIC0gc3RkZGV2KSA8IGFjdHVhbE1pbiA/IGFjdHVhbE1pbiA6IHdpbmRvd2VkTWluO1xyXG5cclxuICAgIGNvbnN0IG5ld01heCA9IE1hdGgucG93KDIsIGJwZSAqIDgpLTE7XHJcbiAgICBjb25zdCBuZXdNaW4gPSAwO1xyXG4gICAgY29uc3Qgc3ViID0gbWF4IC0gbWluO1xyXG4gICAgY29uc3QgbnN1YiA9IG5ld01heCAtIG5ld01pbjtcclxuICAgIGNvbnN0IGZhY3RvciA9IG5ld01heC8obWF4IC0gc3ViKTtcclxuICAgIGlucC5mb3JFYWNoKChhIDogbnVtYmVyLCBpbmRleCA6IG51bWJlcikgPT4ge1xyXG4gICAgICBpZiAoYSA+PSBtYXgpIGlucFtpbmRleF0gPSBuZXdNYXg7XHJcbiAgICAgIGVsc2UgaWYgKGEgPD0gbWluKSBpbnBbaW5kZXhdID0gbmV3TWluO1xyXG4gICAgICBlbHNlIGlucFtpbmRleF0gPSAoKChhLW1pbikvc3ViKSAqIG5zdWIgKyBuZXdNaW4pO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBkYXRhOiBpbnAsXHJcbiAgICAgIG1pbkJlZm9yZTogbWluLFxyXG4gICAgICBtYXhCZWZvcmU6IG1heCxcclxuICAgICAgbWluQWZ0ZXI6IG5ld01pbixcclxuICAgICAgbWF4QWZ0ZXI6IG5ld01heCxcclxuICAgIH07XHJcbiAgfSxcclxuICBjb21iaW5lSW1hZ2VzKHN0YXRlcyA6IFRpbGVMb2FkU3RhdGVbXSwgbm9ybWFsaXNlTW9kZSA6IG51bWJlciA9IE5vcm1hbGlzZU1vZGUuUmVndWxhcikgOiBOb3JtYWxpc2VSZXN1bHQ8RmxvYXQzMkFycmF5PiB7XHJcbiAgICBjb25zdCBhcmVhID0gc3RhdGVzWzBdLndpZHRoICogc3RhdGVzWzBdLmhlaWdodDtcclxuICAgIGxldCBvdXRwdXQgPSBuZXcgRmxvYXQzMkFycmF5KGFyZWEpO1xyXG4gICAgY29uc3QgdGlsZVdpZHRoID0gMjU2O1xyXG4gICAgY29uc3QgaW5jcmVtZW50ID0gMS90aWxlV2lkdGg7XHJcbiAgICBjb25zdCBtYXAgOiBSZWNvcmQ8bnVtYmVyLCBSZWNvcmQ8bnVtYmVyLCBUaWxlTG9hZFN0YXRlPj4gPSB7fTtcclxuICAgIGZvciAobGV0IHRpbGUgb2Ygc3RhdGVzKSB7XHJcbiAgICAgIGlmICghbWFwW3RpbGUueF0pIHtcclxuICAgICAgICBtYXBbdGlsZS54XSA9IHt9O1xyXG4gICAgICB9XHJcbiAgICAgIG1hcFt0aWxlLnhdW3RpbGUueV0gPSB0aWxlO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGV4dGVudCA9IHtcclxuICAgICAgeDE6IHN0YXRlc1swXS5leGFjdFBvcy54IC0gc3RhdGVzWzBdLndpZHRoSW5UaWxlcy8yLFxyXG4gICAgICB4Mjogc3RhdGVzWzBdLmV4YWN0UG9zLnggKyBzdGF0ZXNbMF0ud2lkdGhJblRpbGVzLzIsXHJcbiAgICAgIHkxOiBzdGF0ZXNbMF0uZXhhY3RQb3MueSAtIHN0YXRlc1swXS5oZWlnaHRJblRpbGVzLzIsXHJcbiAgICAgIHkyOiBzdGF0ZXNbMF0uZXhhY3RQb3MueSArIHN0YXRlc1swXS5oZWlnaHRJblRpbGVzLzJcclxuICAgIH1cclxuXHJcbiAgICBsZXQgaSA9IDA7XHJcbiAgICBmb3IgKGxldCB5ID0gZXh0ZW50LnkxOyB5IDwgZXh0ZW50LnkyOyB5ICs9IGluY3JlbWVudCkge1xyXG4gICAgICBmb3IgKGxldCB4ID0gZXh0ZW50LngxOyB4IDwgZXh0ZW50LngyOyB4ICs9IGluY3JlbWVudCkge1xyXG4gICAgICAgIGNvbnN0IHRpbGUgPSB7XHJcbiAgICAgICAgICB4OiBNYXRoLmZsb29yKHgpLFxyXG4gICAgICAgICAgeTogTWF0aC5mbG9vcih5KVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgY29uc3QgcHggPSB7XHJcbiAgICAgICAgICB4OiBNYXRoLmZsb29yKCh4JTEpKnRpbGVXaWR0aCksXHJcbiAgICAgICAgICB5OiBNYXRoLmZsb29yKCh5JTEpKnRpbGVXaWR0aClcclxuICAgICAgICB9O1xyXG4gICAgICAgIGNvbnN0IGlkeCA9IHB4LnkqdGlsZVdpZHRoICsgcHgueDtcclxuICAgICAgICBvdXRwdXRbaSsrXSA9IG1hcFt0aWxlLnhdW3RpbGUueV0uaGVpZ2h0c1tpZHhdO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBsZXQgcmVzdWx0ID0ge1xyXG4gICAgICBkYXRhOiBvdXRwdXQsXHJcbiAgICAgIG1pbkJlZm9yZTogTWF0aC5wb3coMiwgMzIpLFxyXG4gICAgICBtYXhCZWZvcmU6IDAsXHJcbiAgICAgIG1pbkFmdGVyOiBNYXRoLnBvdygyLCAzMiksXHJcbiAgICAgIG1heEFmdGVyOiAwLFxyXG4gICAgfTtcclxuICAgIGlmIChub3JtYWxpc2VNb2RlID09IE5vcm1hbGlzZU1vZGUuUmVndWxhcikge1xyXG4gICAgICByZXN1bHQgPSB0aGlzLm5vcm1hbGlzZVR5cGVkQXJyYXkob3V0cHV0KTtcclxuICAgIH0gZWxzZSBpZiAobm9ybWFsaXNlTW9kZSA9PSBOb3JtYWxpc2VNb2RlLlNtYXJ0KSB7XHJcbiAgICAgIHJlc3VsdCA9IHRoaXMubm9ybWFsaXNlVHlwZWRBcnJheVNtYXJ0KG91dHB1dCk7XHJcbiAgICB9IGVsc2UgaWYgKG5vcm1hbGlzZU1vZGUgPT0gTm9ybWFsaXNlTW9kZS5TbWFydFdpbmRvdykge1xyXG4gICAgICByZXN1bHQgPSB0aGlzLm5vcm1hbGlzZVR5cGVkQXJyYXlTbWFydFdpbmRvdyhvdXRwdXQpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXRwdXQubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICByZXN1bHQubWF4QWZ0ZXIgPSBNYXRoLm1heChvdXRwdXRbaV0sIHJlc3VsdC5tYXhBZnRlcik7XHJcbiAgICAgICAgcmVzdWx0Lm1pbkFmdGVyID0gTWF0aC5taW4ob3V0cHV0W2ldLCByZXN1bHQubWluQWZ0ZXIpO1xyXG4gICAgICB9XHJcbiAgICAgIHJlc3VsdC5tYXhCZWZvcmUgPSByZXN1bHQubWF4QWZ0ZXI7XHJcbiAgICAgIHJlc3VsdC5taW5CZWZvcmUgPSByZXN1bHQubWluQWZ0ZXI7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH0sXHJcbiAgdHlwZWRBcnJheVRvU3RsKFxyXG4gICAgcG9pbnRzOiBUeXBlZEFycmF5LFxyXG4gICAgd2lkdGhweCA6IG51bWJlcixcclxuICAgIGhlaWdodHB4IDogbnVtYmVyLFxyXG4gICAge3dpZHRoLCBkZXB0aCwgaGVpZ2h0fSA6IFR5cGVkQXJyYXlUb1N0bEFyZ3MgPSB0eXBlZEFycmF5VG9TdGxEZWZhdWx0c1xyXG4gICkgOiBBcnJheUJ1ZmZlciB7XHJcbiAgICBjb25zdCBkYXRhTGVuZ3RoID0gKCh3aWR0aHB4KSAqIChoZWlnaHRweCkpICogNTA7XHJcbiAgICBjb25zb2xlLmxvZyhwb2ludHMubGVuZ3RoLCBkYXRhTGVuZ3RoKTtcclxuICAgIGNvbnN0IHNpemUgPSA4MCArIDQgKyBkYXRhTGVuZ3RoO1xyXG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IEFycmF5QnVmZmVyKGRhdGFMZW5ndGgpO1xyXG4gICAgY29uc3QgZHYgPSBuZXcgRGF0YVZpZXcocmVzdWx0KTtcclxuICAgIGR2LnNldFVpbnQzMig4MCwgKHdpZHRocHgtMSkqKGhlaWdodHB4LTEpLCB0cnVlKTtcclxuXHJcbiAgICAvL0B0cy1pZ25vcmVcclxuICAgIGNvbnN0IG1heCA9IHBvaW50cy5yZWR1Y2UoKGFjYywgcG9pbnQpID0+IE1hdGgubWF4KHBvaW50LCBhY2MpLCAwKTtcclxuXHJcbiAgICBjb25zdCBvID0gKHggOiBudW1iZXIsIHkgOiBudW1iZXIpIDogbnVtYmVyID0+ICh5ICogd2lkdGhweCkgKyB4O1xyXG4gICAgY29uc3QgbiA9IChwMSA6IHZlYzMsIHAyIDogdmVjMywgcDM6IHZlYzMpIDogdmVjMyA9PiB7XHJcbiAgICAgIGNvbnN0IEEgPSBbcDJbMF0gLSBwMVswXSwgcDJbMV0gLSBwMVsxXSwgcDJbMl0gLSBwMVsyXV07XHJcbiAgICAgIGNvbnN0IEIgPSBbcDNbMF0gLSBwMVswXSwgcDNbMV0gLSBwMVsxXSwgcDNbMl0gLSBwMVsyXV07XHJcbiAgICAgIHJldHVybiBbXHJcbiAgICAgICAgQVsxXSAqIEJbMl0gLSBBWzJdICogQlsxXSxcclxuICAgICAgICBBWzJdICogQlswXSAtIEFbMF0gKiBCWzJdLFxyXG4gICAgICAgIEFbMF0gKiBCWzFdIC0gQVsxXSAqIEJbMF1cclxuICAgICAgXVxyXG4gICAgfVxyXG4gICAgY29uc3QgcHQgPSAodHJpcyA6IHRyaXZlYzMsIG9mZiA6IG51bWJlcikgPT4ge1xyXG4gICAgICB0cmlzLmZsYXQoKS5mb3JFYWNoKChmbHQgOiBudW1iZXIsIGkgOiBudW1iZXIpID0+IHtcclxuICAgICAgICBkdi5zZXRGbG9hdDMyKG9mZiArIChpICogNCksIGZsdCwgdHJ1ZSk7XHJcbiAgICAgIH0pO1xyXG4gICAgICAvLyBkdi5zZXRVaW50MTYob2ZmKzQ4LCAwLCB0cnVlKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgb2ZmID0gODQ7XHJcbiAgICBmb3IgKGxldCB4ID0gMDsgeCA8ICh3aWR0aHB4IC0gMSk7IHggKz0gMikge1xyXG4gICAgICBmb3IgKGxldCB5ID0gMDsgeSA8IChoZWlnaHRweCAtIDEpOyB5KyspIHtcclxuICAgICAgICBjb25zdCB0cmkxIDogdHJpdmVjMyA9IFtcclxuICAgICAgICAgIFswLDAsMF0sIC8vIG5vcm1hbFxyXG4gICAgICAgICAgWyAgeCwgICB5LCBwb2ludHNbbyh4LHkpXS9tYXhdLCAvLyB2MVxyXG4gICAgICAgICAgW3grMSwgICB5LCBwb2ludHNbbyh4KzEseSldL21heF0sIC8vIHYyXHJcbiAgICAgICAgICBbICB4LCB5KzEsIHBvaW50c1tvKHgseSsxKV0vbWF4XSwgLy8gdjNcclxuICAgICAgICBdO1xyXG4gICAgICAgIC8vIHRyaTFbMF0gPSBuKHRyaTFbMV0sIHRyaTFbMl0sIHRyaTFbM10pO1xyXG4gICAgICAgIHB0KHRyaTEsIG9mZik7XHJcbiAgICAgICAgb2ZmICs9IDUwO1xyXG5cclxuICAgICAgICBjb25zdCB0cmkyIDogdHJpdmVjMyA9IFtcclxuICAgICAgICAgIFswLDAsMF0sIC8vIG5vcm1hbFxyXG4gICAgICAgICAgW3grMSwgICB5LCBwb2ludHNbbyh4KzEseSldL21heF0sIC8vIHYxXHJcbiAgICAgICAgICBbeCsxLCB5KzEsIHBvaW50c1tvKHgrMSx5KzEpXS9tYXhdLCAvLyB2MlxyXG4gICAgICAgICAgWyAgeCwgeSsxLCBwb2ludHNbbyh4LHkrMSldL21heF0sIC8vIHYzXHJcbiAgICAgICAgXTtcclxuICAgICAgICAvLyB0cmkyWzBdID0gbih0cmkyWzFdLCB0cmkyWzJdLCB0cmkyWzNdKTtcclxuICAgICAgICBwdCh0cmkyLCBvZmYpO1xyXG4gICAgICAgIG9mZiArPSA1MDtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG59XHJcblxyXG5Db21saW5rLmV4cG9zZShwcm9jZXNzb3IpOyJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==